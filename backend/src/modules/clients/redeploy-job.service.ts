import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisioningService } from '../provisioning/provisioning.service';

interface RedeployResult {
  clientId: string;
  name: string;
  ok: boolean;
  error?: string;
}

export interface RedeployJob {
  id: string;
  image: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  total: number;
  current: string | null;
  results: RedeployResult[];
}

/**
 * Atualização de versão em lote: recria, uma por vez, todas as instalações
 * gerenciadas em execução com a imagem atual do servidor. Roda em segundo
 * plano; o progresso é consultado pelo painel.
 */
@Injectable()
export class RedeployJobService {
  private readonly logger = new Logger('RedeployAll');
  private job: RedeployJob | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly provisioning: ProvisioningService,
  ) {}

  status() {
    return this.job;
  }

  async start() {
    if (this.job && !this.job.finishedAt)
      throw new ConflictException('Já existe uma atualização em andamento');
    const health = await this.provisioning.health();
    if (!health)
      throw new ConflictException(
        'O servidor de instalações não está disponível',
      );

    const clients = await this.prisma.client.findMany({
      where: { managed: true, provisionStatus: 'RUNNING', archivedAt: null },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    if (!clients.length)
      throw new ConflictException(
        'Nenhuma instalação em execução para atualizar',
      );

    const job: RedeployJob = {
      id: randomUUID(),
      image: health.backendImage,
      startedAt: new Date(),
      finishedAt: null,
      total: clients.length,
      current: null,
      results: [],
    };
    this.job = job;
    void this.run(job, clients);
    return job;
  }

  private async run(
    job: RedeployJob,
    clients: { id: string; name: string; slug: string }[],
  ) {
    this.logger.log(
      `Atualizando ${clients.length} instalação(ões) para ${job.image}`,
    );
    for (const c of clients) {
      job.current = c.name;
      try {
        await this.provisioning.action(c.slug, 'redeploy');
        job.results.push({ clientId: c.id, name: c.name, ok: true });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Falha ao atualizar ${c.slug}: ${error}`);
        job.results.push({ clientId: c.id, name: c.name, ok: false, error });
      }
    }
    job.current = null;
    job.finishedAt = new Date();
    const failed = job.results.filter((r) => !r.ok).length;
    this.logger.log(
      `Atualização concluída: ${job.total - failed} ok, ${failed} com falha`,
    );
  }
}
