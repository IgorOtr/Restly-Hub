import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';

export interface ImageVersion {
  image: string;
  id: string;
  created: string;
  /** Versão gravada na imagem no build (label), quando houver. */
  version: string | null;
}

export interface PlatformVersions {
  backend: ImageVersion | null;
  web: ImageVersion | null;
}

export interface AgentHealth {
  ok: boolean;
  domain: string;
  scheme: string;
  publicPort: string;
  backendImage: string;
  webImage?: string;
  tls: boolean;
  versions?: PlatformVersions;
}

export interface AgentInstance {
  provisioned: boolean;
  state?: string;
  image?: string | null;
  startedAt?: string | null;
  url?: string;
  setupUrl?: string;
  /** A instalação já roda a imagem atual do servidor. */
  upToDate?: boolean;
}

export type InstanceAction = 'start' | 'stop' | 'redeploy' | 'sync' | 'remove';

const HEALTH_TTL_MS = 30_000;

/**
 * Cliente do agente de provisionamento. O Hub nunca acessa o Docker: envia
 * comandos autenticados (HMAC-SHA256 com AGENT_TOKEN + timestamp) ao agente
 * que roda no servidor das instalações.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger('Provisioning');
  private readonly url?: string;
  private readonly token?: string;
  private cached?: { at: number; health: AgentHealth | null };

  constructor(config: ConfigService) {
    this.url = config.get<string>('AGENT_URL')?.replace(/\/+$/, '');
    this.token = config.get<string>('AGENT_TOKEN');
  }

  get configured() {
    return Boolean(this.url && this.token);
  }

  /** Situação do agente (null quando não configurado ou inacessível). */
  async health(): Promise<AgentHealth | null> {
    if (!this.configured) return null;
    if (this.cached && Date.now() - this.cached.at < HEALTH_TTL_MS)
      return this.cached.health;
    const health = await this.call<AgentHealth>(
      'GET',
      '/health',
      undefined,
      5000,
    ).catch(() => null);
    this.cached = { at: Date.now(), health };
    return health;
  }

  /** Endereço público de uma instalação gerenciada. */
  instanceUrl(h: AgentHealth, slug: string) {
    return `${h.scheme}://${slug}.${h.domain}${h.publicPort ? `:${h.publicPort}` : ''}`;
  }

  provision(input: {
    slug: string;
    setupToken: string;
    license: {
      hubUrl: string;
      instanceId: string;
      instanceKey: string;
      hubPublicKey: string;
    };
  }) {
    return this.call<AgentInstance>('POST', '/instances', input, 240_000);
  }

  action(slug: string, action: InstanceAction) {
    return this.call<AgentInstance>(
      'POST',
      `/instances/${slug}/${action}`,
      undefined,
      action === 'sync' ? 15_000 : 240_000,
    );
  }

  /** Baixa as imagens novas do registro (imagens locais são mantidas). */
  pullImages() {
    this.cached = undefined;
    return this.call<{ versions: PlatformVersions }>(
      'POST',
      '/platform/pull',
      undefined,
      660_000,
    );
  }

  /** Recria o frontend compartilhado com a imagem atual. */
  deployWeb() {
    this.cached = undefined;
    return this.call<{ versions: PlatformVersions }>(
      'POST',
      '/platform/web',
      undefined,
      240_000,
    );
  }

  status(slug: string) {
    return this.call<AgentInstance>(
      'GET',
      `/instances/${slug}`,
      undefined,
      10_000,
    );
  }

  private async call<T>(
    method: string,
    path: string,
    body?: unknown,
    timeoutMs = 30_000,
  ): Promise<T> {
    if (!this.configured)
      throw new ServiceUnavailableException(
        'Provisionamento automático não configurado (AGENT_URL/AGENT_TOKEN)',
      );
    const raw = body === undefined ? '' : JSON.stringify(body);
    const ts = Date.now();
    const signature = createHmac('sha256', this.token!)
      .update(`${ts}.${method}.${path}.${raw}`)
      .digest('hex');
    let res: Response;
    try {
      res = await fetch(`${this.url}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Timestamp': String(ts),
          'X-Agent-Signature': signature,
        },
        body: raw || undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      this.logger.warn(
        `Agente inacessível: ${e instanceof Error ? e.message : e}`,
      );
      throw new ServiceUnavailableException(
        'O agente de provisionamento não respondeu',
      );
    }
    const data = (await res.json().catch(() => ({}))) as T & {
      message?: string;
    };
    if (!res.ok)
      throw new BadGatewayException(
        data.message ?? `O agente respondeu HTTP ${res.status}`,
      );
    return data;
  }
}
