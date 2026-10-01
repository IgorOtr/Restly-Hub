import {
  ConflictException,
  ServiceUnavailableException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Prisma, type Client } from '#prisma-client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProvisioningService,
  type InstanceAction,
} from '../provisioning/provisioning.service';
import { SigningService } from '../signing/signing.service';
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

/** Nunca expõe o hash da chave nem o convite cru; o link de convite só existe enquanto pendente. */
function present({ instanceKeyHash: _hash, setupToken, ...c }: Client) {
  return {
    ...c,
    connection: connectionOf(c.lastCheckAt),
    setupUrl:
      c.managed && setupToken && c.needsSetup !== false
        ? `${c.url}/setup?token=${encodeURIComponent(setupToken)}`
        : null,
  };
}

const newSetupToken = () => randomBytes(32).toString('base64url');

@Injectable()
export class ClientsService {
  private readonly logger = new Logger('Clients');

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: ProvisioningService,
    private readonly signing: SigningService,
    private readonly config: ConfigService,
  ) {}

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

  async create({ provision, ...dto }: CreateClientDto, userId: string) {
    await this.assertSlugFree(dto.slug);
    const key = newInstanceKey();
    const url = provision
      ? this.provisioning.instanceUrl(await this.agentOrThrow(), dto.slug)
      : dto.url!.replace(/\/+$/, '');
    const client = await this.prisma.client.create({
      data: {
        ...dto,
        url,
        instanceKeyHash: key.hash,
        instanceKeyPrefix: key.prefix,
        ...(provision && {
          managed: true,
          provisionStatus: 'PROVISIONING',
          setupToken: newSetupToken(),
          needsSetup: true,
        }),
        events: { create: { fromStatus: null, toStatus: 'ACTIVE', userId } },
      },
    });
    if (provision) return this.runProvision(client, key.key);
    // A chave só é devolvida neste momento; depois, apenas regenerando.
    return { ...present(client), instanceKey: key.key };
  }

  /**
   * (Re)cria a instalação no servidor: após falha, após remoção (o banco e os
   * arquivos preservados são reaproveitados) ou para passar a gerenciar um
   * cliente cadastrado manualmente.
   */
  async provision(id: string) {
    const before = await this.findOrThrow(id);
    if (
      before.managed &&
      before.provisionStatus !== 'FAILED' &&
      before.provisionStatus !== 'REMOVED'
    )
      throw new ConflictException('A instalação deste cliente já foi criada');
    const health = await this.agentOrThrow();
    // Nova chave e novo convite: os anteriores nunca chegaram a uma instalação.
    const key = newInstanceKey();
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        url: this.provisioning.instanceUrl(health, before.slug),
        managed: true,
        provisionStatus: 'PROVISIONING',
        provisionError: null,
        setupToken: newSetupToken(),
        needsSetup: true,
        instanceKeyHash: key.hash,
        instanceKeyPrefix: key.prefix,
      },
    });
    return this.runProvision(client, key.key);
  }

  private async runProvision(client: Client, instanceKey: string) {
    try {
      await this.provisioning.provision({
        slug: client.slug,
        setupToken: client.setupToken!,
        license: {
          hubUrl: this.config.getOrThrow<string>('HUB_PUBLIC_URL'),
          instanceId: client.slug,
          instanceKey,
          hubPublicKey: this.signing.publicKey(),
        },
      });
      return present(
        await this.prisma.client.update({
          where: { id: client.id },
          data: { provisionStatus: 'RUNNING', provisionError: null },
        }),
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      this.logger.error(`Provisionamento de ${client.slug} falhou: ${detail}`);
      // O cliente fica cadastrado; a criação pode ser repetida.
      return present(
        await this.prisma.client.update({
          where: { id: client.id },
          data: {
            provisionStatus: 'FAILED',
            provisionError: detail.slice(0, 2000),
          },
        }),
      );
    }
  }

  /** Iniciar, parar ou atualizar (recriar com a imagem atual) a instalação gerenciada. */
  async instanceAction(
    id: string,
    action: Exclude<InstanceAction, 'sync' | 'remove'>,
  ) {
    const client = await this.findOrThrow(id);
    this.assertControllable(client);
    await this.provisioning.action(client.slug, action);
    return present(
      await this.prisma.client.update({
        where: { id },
        data: { provisionStatus: action === 'stop' ? 'STOPPED' : 'RUNNING' },
      }),
    );
  }

  /**
   * Remove o container da instalação, preservando banco e arquivos. Exige a
   * instalação parada ou o cliente encerrado, para não derrubar quem está em uso.
   */
  async removeInstance(id: string, userId: string) {
    const client = await this.findOrThrow(id);
    this.assertControllable(client);
    if (client.provisionStatus !== 'STOPPED' && !client.archivedAt)
      throw new ConflictException(
        'Pare a instalação ou encerre o cliente antes de removê-la',
      );
    await this.provisioning.action(client.slug, 'remove');
    this.logger.warn(`Instalação de ${client.slug} removida por ${userId}`);
    return present(
      await this.prisma.client.update({
        where: { id },
        data: { provisionStatus: 'REMOVED', setupToken: null },
      }),
    );
  }

  private assertControllable(client: Client) {
    if (!client.managed)
      throw new ConflictException('Esta instalação não é gerenciada pelo Hub');
    if (!['RUNNING', 'STOPPED'].includes(client.provisionStatus))
      throw new ConflictException(
        'A instalação não está disponível para esta ação',
      );
  }

  private async agentOrThrow() {
    const health = await this.provisioning.health();
    if (!health)
      throw new ServiceUnavailableException(
        'O servidor de instalações não está disponível para criação automática',
      );
    return health;
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
    // Instalação gerenciada: encerrar também para o container (libera memória).
    if (client.managed && client.provisionStatus === 'RUNNING') {
      try {
        await this.provisioning.action(client.slug, 'stop');
        const stopped = await this.prisma.client.update({
          where: { id },
          data: { provisionStatus: 'STOPPED' },
        });
        return { client: present(stopped), sync, stopped: true };
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        return {
          client: present(client),
          sync,
          stopped: false,
          stopError: detail,
        };
      }
    }
    return { client: present(client), sync, stopped: false };
  }

  async restore(id: string) {
    const before = await this.findOrThrow(id);
    if (!before.archivedAt)
      throw new ConflictException('Cliente não está encerrado');
    // Volta bloqueado: a liberação é uma ação explícita do operador.
    let client = await this.prisma.client.update({
      where: { id },
      data: { archivedAt: null },
    });
    // A instalação volta a rodar (exibindo o bloqueio até a liberação).
    if (client.managed && client.provisionStatus === 'STOPPED') {
      try {
        await this.provisioning.action(client.slug, 'start');
        client = await this.prisma.client.update({
          where: { id },
          data: { provisionStatus: 'RUNNING' },
        });
      } catch (e) {
        this.logger.warn(
          `Não foi possível iniciar ${client.slug} ao reativar: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    return present(client);
  }

  async sync(id: string) {
    return this.requestSync(await this.findOrThrow(id));
  }

  /**
   * "Sincronizar agora": pede à instalação que consulte a licença imediatamente.
   * É apenas um atalho — se a instalação estiver inacessível, ela aplicará a
   * mudança na próxima consulta periódica.
   */
  private async requestSync(
    client: Pick<Client, 'url' | 'slug' | 'managed' | 'provisionStatus'>,
  ) {
    try {
      // Instalações gerenciadas são avisadas pela rede interna, via agente.
      if (client.managed && client.provisionStatus === 'RUNNING') {
        await this.provisioning.action(client.slug, 'sync');
        return { ok: true as const };
      }
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
