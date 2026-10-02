import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ProvisioningService,
  type PlatformVersions,
} from '../provisioning/provisioning.service';

interface RedeployResult {
  clientId: string;
  name: string;
  ok: boolean;
  /** Já estava na versão atual: nada a fazer. */
  skipped?: boolean;
  error?: string;
}

export type RedeployPhase = 'pull' | 'instances' | 'web' | 'done';

export interface RedeployJob {
  id: string;
  phase: RedeployPhase;
  versions: PlatformVersions | null;
  startedAt: Date;
  finishedAt: Date | null;
  total: number;
  current: string | null;
  results: RedeployResult[];
  /** Erro de uma etapa da plataforma (baixar imagens ou frontend). */
  platformError: string | null;
  webUpdated: boolean;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Atualização da plataforma em um clique, em segundo plano:
 *  1. baixa as imagens novas (quando publicadas em um registro);
 *  2. recria, uma por vez, as APIs das instalações em execução que não estão
 *     na versão atual (cada uma aplica as migrações ao iniciar);
 *  3. por último recria o frontend compartilhado — assim a tela nova só entra
 *     no ar quando as APIs já suportam suas rotas.
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
    const job: RedeployJob = {
      id: randomUUID(),
      phase: 'pull',
      versions: health.versions ?? null,
      startedAt: new Date(),
      finishedAt: null,
      total: clients.length,
      current: null,
      results: [],
      platformError: null,
      webUpdated: false,
    };
    this.job = job;
    void this.run(job, clients);
    return job;
  }

  private async run(
    job: RedeployJob,
    clients: { id: string; name: string; slug: string }[],
  ) {
    try {
      job.versions = (await this.provisioning.pullImages()).versions;
    } catch (e) {
      // Sem registro/sem internet: segue com as imagens que já estão no servidor.
      this.logger.warn(`Falha ao baixar imagens: ${message(e)}`);
    }

    job.phase = 'instances';
    this.logger.log(`Atualizando ${clients.length} instalação(ões)`);
    for (const c of clients) {
      job.current = c.name;
      try {
        const current = await this.provisioning.status(c.slug);
        if (current.upToDate && current.state === 'running') {
          job.results.push({
            clientId: c.id,
            name: c.name,
            ok: true,
            skipped: true,
          });
          continue;
        }
        await this.provisioning.action(c.slug, 'redeploy');
        job.results.push({ clientId: c.id, name: c.name, ok: true });
      } catch (e) {
        this.logger.warn(`Falha ao atualizar ${c.slug}: ${message(e)}`);
        job.results.push({
          clientId: c.id,
          name: c.name,
          ok: false,
          error: message(e),
        });
      }
    }

    job.phase = 'web';
    job.current = null;
    try {
      job.versions = (await this.provisioning.deployWeb()).versions;
      job.webUpdated = true;
    } catch (e) {
      job.platformError = `Frontend: ${message(e)}`;
      this.logger.warn(`Falha ao atualizar o frontend: ${message(e)}`);
    }

    job.phase = 'done';
    job.finishedAt = new Date();
    const failed = job.results.filter((r) => !r.ok).length;
    const skipped = job.results.filter((r) => r.skipped).length;
    this.logger.log(
      `Atualização concluída: ${job.total - failed - skipped} atualizada(s), ${skipped} já na versão atual, ${failed} com falha, frontend ${job.webUpdated ? 'ok' : 'com falha'}`,
    );
  }
}
