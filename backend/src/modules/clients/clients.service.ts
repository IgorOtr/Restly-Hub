import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type Client } from '#prisma-client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import type {
  CreateClientDto,
  ListClientsQueryDto,
  SetLicenseDto,
  UpdateClientDto,
} from './dto/client.dto';

/** Sem consulta há mais que isso, a instalação é considerada sem comunicação. */
export const OFFLINE_AFTER_MINUTES = 15;
const SYNC_TIMEOUT_MS = 6000;

export type Connection = 'ONLINE' | 'OFFLINE' | 'NEVER';

export const hashInstanceKey = (key: string) =>
  createHash('sha256').update(key).digest('hex');

function newInstanceKey() {
  const key = `rk_${randomBytes(32).toString('base64url')}`;
  return { key, hash: hashInstanceKey(key), prefix: key.slice(0, 9) };
}

export function connectionOf(
  lastCheckAt: Date | null,
  now = Date.now(),
): Connection {
  if (!lastCheckAt) return 'NEVER';
  return now - lastCheckAt.getTime() <= OFFLINE_AFTER_MINUTES * 60_000
    ? 'ONLINE'
    : 'OFFLINE';
}

/** Nunca expõe o hash da chave da instalação. */
function present({ instanceKeyHash: _hash, ...c }: Client) {
  return { ...c, connection: connectionOf(c.lastCheckAt) };
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger('Clients');

  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListClientsQueryDto) {
    const where: Prisma.ClientWhereInput = {
      archivedAt: q.archived ? { not: null } : null,
      ...(q.status && { status: q.status }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { slug: { contains: q.search } },
          { ownerName: { contains: q.search } },
        ],
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        ...skipTake(q),
      }),
      this.prisma.client.count({ where }),
    ]);
    return paginate(rows.map(present), total, q);
  }

  async get(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    const { events, ...rest } = client;
    return { ...present(rest), events };
  }

  async create(dto: CreateClientDto, userId: string) {
    await this.assertSlugFree(dto.slug);
    const key = newInstanceKey();
    const client = await this.prisma.client.create({
      data: {
        ...dto,
        url: dto.url.replace(/\/+$/, ''),
        instanceKeyHash: key.hash,
        instanceKeyPrefix: key.prefix,
        events: { create: { fromStatus: null, toStatus: 'ACTIVE', userId } },
      },
    });
    // A chave só é devolvida neste momento; depois, apenas regenerando.
    return { ...present(client), instanceKey: key.key };
  }

  async update(id: string, dto: UpdateClientDto) {
    const before = await this.findOrThrow(id);
    if (dto.slug && dto.slug !== before.slug)
      await this.assertSlugFree(dto.slug);
    const client = await this.prisma.client.update({
      where: { id },
      data: { ...dto, ...(dto.url && { url: dto.url.replace(/\/+$/, '') }) },
    });
    return present(client);
  }

  /** Altera a licença, registra no histórico e pede sincronização imediata à instalação. */
  async setLicense(id: string, dto: SetLicenseDto, userId: string) {
    const before = await this.findOrThrow(id);
    const active = dto.status === 'ACTIVE';
    const client = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.client.update({
        where: { id },
        data: {
          status: dto.status,
          reason: active ? null : (dto.reason ?? null),
          message: active ? null : dto.message || null,
          dueDate:
            active || !dto.dueDate ? null : new Date(`${dto.dueDate}T12:00:00`),
          statusChangedAt: new Date(),
        },
      });
      await tx.licenseEvent.create({
        data: {
          clientId: id,
          fromStatus: before.status,
          toStatus: dto.status,
          reason: updated.reason,
          message: updated.message,
          userId,
        },
      });
      return updated;
    });
    const sync = await this.requestSync(client);
    return { client: present(client), sync };
  }

  async regenerateKey(id: string) {
    await this.findOrThrow(id);
    const key = newInstanceKey();
    const client = await this.prisma.client.update({
      where: { id },
      data: { instanceKeyHash: key.hash, instanceKeyPrefix: key.prefix },
    });
    return { ...present(client), instanceKey: key.key };
  }

  async archive(id: string, userId: string) {
    const before = await this.findOrThrow(id);
    if (before.archivedAt) throw new ConflictException('Cliente já encerrado');
    const client = await this.prisma.$transaction(async (tx) => {
      await tx.licenseEvent.create({
        data: {
          clientId: id,
          fromStatus: before.status,
          toStatus: 'BLOCKED',
          reason: 'CONTRACT_ENDED',
          message: 'Cliente encerrado',
          userId,
        },
      });
      return tx.client.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          status: 'BLOCKED',
          reason: 'CONTRACT_ENDED',
          message: null,
          dueDate: null,
          statusChangedAt: new Date(),
        },
      });
    });
    const sync = await this.requestSync(client);
    return { client: present(client), sync };
  }

  async restore(id: string) {
    const before = await this.findOrThrow(id);
    if (!before.archivedAt)
      throw new ConflictException('Cliente não está encerrado');
    // Volta bloqueado: a liberação é uma ação explícita do operador.
    return present(
      await this.prisma.client.update({
        where: { id },
        data: { archivedAt: null },
      }),
    );
  }

  async sync(id: string) {
    return this.requestSync(await this.findOrThrow(id));
  }

  /**
   * "Sincronizar agora": pede à instalação que consulte a licença imediatamente.
   * É apenas um atalho — se a instalação estiver inacessível, ela aplicará a
   * mudança na próxima consulta periódica.
   */
  private async requestSync(client: Pick<Client, 'url' | 'slug'>) {
    try {
      const res = await fetch(`${client.url}/api/license/refresh`, {
        method: 'POST',
        signal: AbortSignal.timeout(SYNC_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ok: true as const };
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Sincronização com ${client.slug} falhou: ${detail}`);
      return { ok: false as const, detail };
    }
  }

  private async findOrThrow(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private async assertSlugFree(slug: string) {
    if (
      await this.prisma.client.findUnique({
        where: { slug },
        select: { id: true },
      })
    )
      throw new ConflictException(
        'Já existe um cliente com este identificador',
      );
  }
}
