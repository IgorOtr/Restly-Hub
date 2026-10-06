import { api, type Paginated } from '@/lib/api'
import type { StatusMeta } from '@/components/ui/Badge'

export type LeadStatus = 'NEW' | 'CONTACTED' | 'NEGOTIATING' | 'WON' | 'LOST'

export const LEAD_STATUS: Record<LeadStatus, StatusMeta> = {
  NEW: { label: 'Novo', tone: 'info' },
  CONTACTED: { label: 'Contatado', tone: 'violet' },
  NEGOTIATING: { label: 'Em negociação', tone: 'warning' },
  WON: { label: 'Virou cliente', tone: 'success' },
  LOST: { label: 'Não fechou', tone: 'neutral' },
}

export const TABLE_RANGES: Record<string, string> = {
  '1-10': 'Até 10 mesas',
  '11-20': '11 a 20 mesas',
  '21-40': '21 a 40 mesas',
  '41+': 'Mais de 40 mesas',
}

export interface Lead {
  id: string
  leadNumber: number
  name: string
  phone: string
  email: string | null
  restaurantName: string
  city: string | null
  tablesRange: string | null
  message: string | null
  status: LeadStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const leadsKeys = {
  all: ['leads'] as const,
  list: (f: object) => ['leads', 'list', f] as const,
  newCount: ['leads', 'new-count'] as const,
}

export const leadsApi = {
  list: (f: { page: number; status?: LeadStatus; search?: string }) =>
    api.get<Paginated<Lead> & { summary: Record<LeadStatus, number> }>('/leads', { params: { ...f, pageSize: 20 } }).then((r) => r.data),
  update: (id: string, d: { status?: LeadStatus; notes?: string }) => api.patch<Lead>(`/leads/${id}`, d).then((r) => r.data),
  newCount: () => api.get<{ count: number }>('/leads/new-count').then((r) => r.data.count),
}

/** Link do WhatsApp do lead, com mensagem inicial. */
export const leadWhatsappUrl = (l: Lead) => {
  const phone = l.phone.length <= 11 ? `55${l.phone}` : l.phone
  const text = `Olá, ${l.name.split(' ')[0]}! Aqui é do Restly. Recebemos seu pedido de orçamento para o ${l.restaurantName}.`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
