import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeadStatus, Prisma } from '#prisma-client';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate, skipTake } from '../../common/dto/pagination.dto';
import type {
  CreateLeadDto,
  ListLeadsQueryDto,
  UpdateLeadDto,
} from './dto/lead.dto';

/** Mesmo telefone não gera um lead novo dentro desta janela (reenvios do formulário). */
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger('Leads');

  constructor(private readonly prisma: PrismaService) {}

  /** Recebe o pedido de orçamento do site. */
  async create(dto: CreateLeadDto, meta: { ip?: string; userAgent?: string }) {
    // Robô preencheu o campo oculto: responde "ok" sem gravar.
    if (dto.website) return { ok: true };
    if (!dto.consent)
      throw new BadRequestException(
        'É preciso autorizar o contato para enviar o pedido',
      );
    const recent = await this.prisma.lead.findFirst({
      where: {
        phone: dto.phone,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
      },
    });
    if (recent) {
      // Reenvio: complementa o pedido existente em vez de duplicar.
      await this.prisma.lead.update({
        where: { id: recent.id },
        data: {
          message:
            [recent.message, dto.message]
              .filter(Boolean)
              .join('\n---\n')
              .slice(0, 1000) || null,
        },
      });
      return { ok: true };
    }
    const { consent: _c, website: _w, ...data } = dto;
    const lead = await this.prisma.lead.create({
      data: { ...data, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 255) },
    });
    this.logger.log(`Novo lead #${lead.leadNumber}: ${lead.restaurantName}`);
    return { ok: true };
  }

  async list(q: ListLeadsQueryDto) {
    const where: Prisma.LeadWhereInput = {
      ...(q.status && { status: q.status }),
      ...(q.search && {
        OR: [
          { name: { contains: q.search } },
          { restaurantName: { contains: q.search } },
          { city: { contains: q.search } },
          { phone: { contains: q.search.replace(/\D/g, '') || q.search } },
        ],
      }),
    };
    const [rows, total, counts] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...skipTake(q),
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
    ]);
    const summary = Object.fromEntries(
      Object.values(LeadStatus).map((s) => [
        s,
        (
          counts.find((c) => c.status === s)?._count as
            { _all: number } | undefined
        )?._all ?? 0,
      ]),
    );
    return { ...paginate(rows, total, q), summary };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const exists = await this.prisma.lead.count({ where: { id } });
    if (!exists) throw new NotFoundException('Lead não encontrado');
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  newCount() {
    return this.prisma.lead.count({ where: { status: 'NEW' } });
  }
}
