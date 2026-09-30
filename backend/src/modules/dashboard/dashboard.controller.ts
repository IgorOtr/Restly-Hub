import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { OFFLINE_AFTER_MINUTES } from '../clients/clients.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async overview() {
    const active = { archivedAt: null };
    const offlineBefore = new Date(Date.now() - OFFLINE_AFTER_MINUTES * 60_000);
    const [byStatus, archived, offline, never, recent] = await Promise.all([
      this.prisma.client.groupBy({
        by: ['status'],
        where: active,
        orderBy: { status: 'asc' },
        _count: { _all: true },
        _sum: { monthlyFee: true },
      }),
      this.prisma.client.count({ where: { archivedAt: { not: null } } }),
      this.prisma.client.findMany({
        where: { ...active, lastCheckAt: { lt: offlineBefore } },
        select: {
          id: true,
          name: true,
          slug: true,
          lastCheckAt: true,
          status: true,
        },
        orderBy: { lastCheckAt: 'asc' },
        take: 20,
      }),
      this.prisma.client.findMany({
        where: { ...active, lastCheckAt: null },
        select: { id: true, name: true, slug: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.licenseEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);

    const stat = (s: string) => {
      const row = byStatus.find((r) => r.status === s);
      return {
        count: row?._count?._all ?? 0,
        monthlyFee: row?._sum?.monthlyFee ?? 0,
      };
    };
    const [a, w, b] = [stat('ACTIVE'), stat('WARNING'), stat('BLOCKED')];
    return {
      clients: {
        total: a.count + w.count + b.count,
        active: a.count,
        warning: w.count,
        blocked: b.count,
        archived,
      },
      revenue: {
        // Receita mensal contratada e a parcela em risco (aviso/bloqueio).
        monthly:
          Number(a.monthlyFee) + Number(w.monthlyFee) + Number(b.monthlyFee),
        atRisk: Number(w.monthlyFee) + Number(b.monthlyFee),
      },
      offline,
      neverConnected: never,
      recentEvents: recent,
      offlineAfterMinutes: OFFLINE_AFTER_MINUTES,
    };
  }
}
