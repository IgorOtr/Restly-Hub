import { api, type Paginated } from '@/lib/api'
import type { StatusMeta } from '@/components/ui/Badge'

export type LicenseStatus = 'ACTIVE' | 'WARNING' | 'BLOCKED'
export type Connection = 'ONLINE' | 'OFFLINE' | 'NEVER'
export type ProvisionStatus = 'NONE' | 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED' | 'REMOVED'

export const PROVISION_STATUS: Record<ProvisionStatus, StatusMeta> = {
  NONE: { label: 'Instalação manual', tone: 'neutral' },
  PROVISIONING: { label: 'Criando...', tone: 'info' },
  RUNNING: { label: 'Em execução', tone: 'success' },
  STOPPED: { label: 'Parada', tone: 'warning' },
  FAILED: { label: 'Falha na criação', tone: 'danger' },
  REMOVED: { label: 'Removida', tone: 'neutral' },
}

export const LICENSE_STATUS: Record<LicenseStatus, StatusMeta> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  WARNING: { label: 'Aviso', tone: 'warning' },
  BLOCKED: { label: 'Bloqueado', tone: 'danger' },
}

export const CONNECTION: Record<Connection, StatusMeta> = {
  ONLINE: { label: 'Online', tone: 'success' },
  OFFLINE: { label: 'Sem comunicação', tone: 'danger' },
  NEVER: { label: 'Nunca conectou', tone: 'neutral' },
}

export const REASONS: Record<string, string> = {
  PAYMENT_OVERDUE: 'Pagamento pendente',
  CONTRACT_ENDED: 'Contrato encerrado',
  MAINTENANCE: 'Manutenção programada',
  TRIAL_ENDED: 'Período de teste encerrado',
  OTHER: 'Outro motivo',
}

export interface Client {
  id: string
  clientNumber: number
  name: string
  slug: string
  url: string
  document: string | null
  ownerName: string | null
  ownerPhone: string | null
  ownerEmail: string | null
  notes: string | null
  supportName: string | null
  supportPhone: string | null
  supportEmail: string | null
  supportUrl: string | null
  monthlyFee: string
  dueDay: number | null
  status: LicenseStatus
  reason: string | null
  message: string | null
  dueDate: string | null
  statusChangedAt: string
  instanceKeyPrefix: string
  lastCheckAt: string | null
  lastCheckIp: string | null
  lastVersion: string | null
  createdAt: string
  archivedAt: string | null
  connection: Connection
  /** Instalação criada e gerenciada pelo Hub (via agente). */
  managed: boolean
  provisionStatus: ProvisionStatus
  provisionError: string | null
  needsSetup: boolean | null
  /** Link de convite para o restaurante criar o administrador (enquanto pendente). */
  setupUrl: string | null
}

export interface LicenseEvent {
  id: string
  fromStatus: LicenseStatus | null
  toStatus: LicenseStatus
  reason: string | null
  message: string | null
  createdAt: string
  user: { name: string } | null
}

export interface ClientDetail extends Client {
  events: LicenseEvent[]
}

/** Resposta de criação/regeneração: a chave da instalação só aparece aqui. */
export type ClientWithKey = Client & { instanceKey: string }

export type InstanceAction = 'start' | 'stop' | 'redeploy'

export interface ClientInput {
  name: string
  slug: string
  url?: string
  provision?: boolean
  document?: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  notes?: string
  supportName?: string | null
  supportPhone?: string | null
  supportEmail?: string | null
  supportUrl?: string | null
  monthlyFee?: number
  dueDay?: number | null
}

export interface LicenseInput {
  status: LicenseStatus
  reason?: string
  message?: string
  dueDate?: string
}

export interface SyncResult {
  ok: boolean
  detail?: string
}

export interface ClientsFilter {
  page: number
  search?: string
  status?: LicenseStatus
  archived?: boolean
}

export const clientsKeys = {
  all: ['clients'] as const,
  list: (f: ClientsFilter) => ['clients', 'list', f] as const,
  detail: (id: string) => ['clients', 'detail', id] as const,
}

export const clientsApi = {
  list: (f: ClientsFilter) => api.get<Paginated<Client>>('/clients', { params: { ...f, pageSize: 25 } }).then((r) => r.data),
  get: (id: string) => api.get<ClientDetail>(`/clients/${id}`).then((r) => r.data),
  // Com provision = true o servidor cria a instalação (pode levar até alguns minutos).
  create: (d: ClientInput) => api.post<ClientWithKey | Client>('/clients', d, { timeout: 300_000 }).then((r) => r.data),
  provision: (id: string) => api.post<Client>(`/clients/${id}/provision`, null, { timeout: 300_000 }).then((r) => r.data),
  instanceAction: (id: string, action: InstanceAction) =>
    api
      .post<Client & { webUpdated?: boolean; outdatedInstances?: number }>(`/clients/${id}/instance/${action}`, null, { timeout: 300_000 })
      .then((r) => r.data),
  update: (id: string, d: Partial<ClientInput>) => api.patch<Client>(`/clients/${id}`, d).then((r) => r.data),
  setLicense: (id: string, d: LicenseInput) => api.put<{ client: Client; sync: SyncResult }>(`/clients/${id}/license`, d).then((r) => r.data),
  sync: (id: string) => api.post<SyncResult>(`/clients/${id}/sync`).then((r) => r.data),
  regenerateKey: (id: string) => api.post<ClientWithKey>(`/clients/${id}/regenerate-key`).then((r) => r.data),
  archive: (id: string) =>
    api
      .post<{ client: Client; sync: SyncResult; stopped: boolean; stopError?: string }>(`/clients/${id}/archive`, null, { timeout: 300_000 })
      .then((r) => r.data),
  removeInstance: (id: string) => api.post<Client>(`/clients/${id}/instance/remove`, null, { timeout: 300_000 }).then((r) => r.data),
  redeployAll: () => api.post<RedeployJob>('/clients/instances/redeploy-all').then((r) => r.data),
  redeployAllStatus: () => api.get<RedeployJob | null>('/clients/instances/redeploy-all').then((r) => r.data || null),
  restore: (id: string) => api.post<Client>(`/clients/${id}/restore`).then((r) => r.data),
}

export interface ImageVersion {
  image: string
  id: string
  created: string
  version: string | null
}

export interface PlatformVersions {
  backend: ImageVersion | null
  web: ImageVersion | null
}

export interface RedeployJob {
  id: string
  phase: 'pull' | 'instances' | 'web' | 'done'
  versions: PlatformVersions | null
  startedAt: string
  finishedAt: string | null
  total: number
  current: string | null
  results: { clientId: string; name: string; ok: boolean; skipped?: boolean; error?: string }[]
  platformError: string | null
  webUpdated: boolean
}

export interface HubSettings {
  supportContact: { name: string | null; phone: string | null; email: string | null; url: string | null }
  hubPublicKey: string
  hubPublicUrl: string | null
  /** Servidor de instalações disponível para criação automática (null = indisponível). */
  provisioning: {
    domain: string
    scheme: string
    publicPort: string
    backendImage: string
    webImage?: string
    tls: boolean
    versions?: PlatformVersions
  } | null
}

export const managedUrl = (p: NonNullable<HubSettings['provisioning']>, slug: string) =>
  `${p.scheme}://${slug || 'cliente'}.${p.domain}${p.publicPort ? `:${p.publicPort}` : ''}`

export const settingsKey = ['settings'] as const

export const settingsApi = {
  get: () => api.get<HubSettings>('/settings').then((r) => r.data),
  setSupportContact: (d: HubSettings['supportContact']) => api.put('/settings/support-contact', d).then((r) => r.data),
}

/** Variáveis LICENSE_* que vinculam a instalação a este Hub. */
export function installEnv(client: Pick<Client, 'slug'>, settings: HubSettings, instanceKey: string) {
  return [
    `LICENSE_HUB_URL=${settings.hubPublicUrl ?? window.location.origin}`,
    `LICENSE_INSTANCE_ID=${client.slug}`,
    `LICENSE_INSTANCE_KEY=${instanceKey}`,
    `LICENSE_HUB_PUBLIC_KEY=${settings.hubPublicKey}`,
  ].join('\n')
}
