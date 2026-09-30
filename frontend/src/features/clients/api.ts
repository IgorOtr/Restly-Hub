import { api, type Paginated } from '@/lib/api'
import type { StatusMeta } from '@/components/ui/Badge'

export type LicenseStatus = 'ACTIVE' | 'WARNING' | 'BLOCKED'
export type Connection = 'ONLINE' | 'OFFLINE' | 'NEVER'

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

export interface ClientInput {
  name: string
  slug: string
  url: string
  document?: string
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
  notes?: string
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
  create: (d: ClientInput) => api.post<ClientWithKey>('/clients', d).then((r) => r.data),
  update: (id: string, d: Partial<ClientInput>) => api.patch<Client>(`/clients/${id}`, d).then((r) => r.data),
  setLicense: (id: string, d: LicenseInput) => api.put<{ client: Client; sync: SyncResult }>(`/clients/${id}/license`, d).then((r) => r.data),
  sync: (id: string) => api.post<SyncResult>(`/clients/${id}/sync`).then((r) => r.data),
  regenerateKey: (id: string) => api.post<ClientWithKey>(`/clients/${id}/regenerate-key`).then((r) => r.data),
  archive: (id: string) => api.post<{ client: Client; sync: SyncResult }>(`/clients/${id}/archive`).then((r) => r.data),
  restore: (id: string) => api.post<Client>(`/clients/${id}/restore`).then((r) => r.data),
}

export interface HubSettings {
  supportContact: { name: string | null; phone: string | null; email: string | null; url: string | null }
  hubPublicKey: string
  hubPublicUrl: string | null
}

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
