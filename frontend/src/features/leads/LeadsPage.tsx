import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, Mail, MapPin, MessageCircle, Phone, Search, Users } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { formatDateTime, maskPhone } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { EmptyState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { LEAD_STATUS, leadsApi, leadsKeys, leadWhatsappUrl, TABLE_RANGES, type Lead, type LeadStatus } from './api'

function LeadModal({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [status, setStatus] = useState<LeadStatus>('NEW')
  const [notes, setNotes] = useState('')
  useEffect(() => {
    if (!lead) return
    setStatus(lead.status)
    setNotes(lead.notes ?? '')
  }, [lead])

  const save = useMutation({
    mutationFn: () => leadsApi.update(lead!.id, { status, notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: leadsKeys.all })
      toast.success('Lead atualizado')
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (!lead) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={lead.restaurantName}
      description={`Lead #${lead.leadNumber} · recebido em ${formatDateTime(lead.createdAt)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <dl className="grid gap-3 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Contato</dt>
            <dd className="font-medium">{lead.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">WhatsApp</dt>
            <dd className="flex items-center gap-1 font-medium">
              <Phone size={13} /> {maskPhone(lead.phone)}
            </dd>
          </div>
          {lead.email && (
            <div>
              <dt className="text-xs text-muted">E-mail</dt>
              <dd className="flex items-center gap-1">
                <Mail size={13} />{' '}
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </dd>
            </div>
          )}
          {(lead.city || lead.tablesRange) && (
            <div>
              <dt className="text-xs text-muted">Restaurante</dt>
              <dd>{[lead.city, lead.tablesRange && TABLE_RANGES[lead.tablesRange]].filter(Boolean).join(' · ')}</dd>
            </div>
          )}
        </dl>
        {lead.message && <p className="rounded-xl border border-border p-3 whitespace-pre-line">{lead.message}</p>}
        <a href={leadWhatsappUrl(lead)} target="_blank" rel="noreferrer" className="inline-flex">
          <Button variant="success" icon={MessageCircle}>
            Chamar no WhatsApp
          </Button>
        </a>
        <Field label="Situação">
          <Select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Anotações" hint="Visíveis só no Hub">
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: ligar quinta à tarde, quer 2 salões" />
        </Field>
      </div>
    </Modal>
  )
}

const columns: Column<Lead>[] = [
  {
    key: 'restaurant',
    header: 'Restaurante',
    cell: (l) => (
      <div>
        <p className="font-medium">{l.restaurantName}</p>
        <p className="flex items-center gap-1 text-xs text-muted">
          {l.city && (
            <>
              <MapPin size={11} /> {l.city}
            </>
          )}
          {l.tablesRange && (
            <>
              <Users size={11} className="ml-1" /> {TABLE_RANGES[l.tablesRange]}
            </>
          )}
        </p>
      </div>
    ),
  },
  {
    key: 'contact',
    header: 'Contato',
    cell: (l) => (
      <div>
        <p>{l.name}</p>
        <p className="text-xs text-muted">{maskPhone(l.phone)}</p>
      </div>
    ),
  },
  { key: 'date', header: 'Recebido', cell: (l) => <span className="text-muted">{formatDateTime(l.createdAt)}</span> },
  { key: 'status', header: 'Situação', cell: (l) => <StatusBadge status={l.status} map={LEAD_STATUS} /> },
]

/** Pedidos de orçamento recebidos pelo site de vendas. */
export function LeadsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<LeadStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Lead | null>(null)
  const filter = { page, status: status === 'ALL' ? undefined : status, search: search.trim() || undefined }
  const query = useQuery({ queryKey: leadsKeys.list(filter), queryFn: () => leadsApi.list(filter), placeholderData: keepPreviousData })
  const summary = query.data?.summary

  return (
    <>
      <PageHeader title="Leads" description="Pedidos de orçamento recebidos pelo site" />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Buscar por restaurante, contato, cidade ou telefone"
              value={search}
              onChange={(e) => (setSearch(e.target.value), setPage(1))}
              className="pl-9"
            />
          </div>
          <SegmentedControl
            size="sm"
            value={status}
            onChange={(v) => (setStatus(v), setPage(1))}
            options={[
              { value: 'ALL', label: 'Todos' },
              ...(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => ({
                value: s,
                label: `${LEAD_STATUS[s].label}${summary?.[s] ? ` (${summary[s]})` : ''}`,
              })),
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.data}
          rowKey={(l) => l.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          onRowClick={setOpen}
          empty={<EmptyState icon={Inbox} title="Nenhum lead" description="Os pedidos de orçamento do site aparecem aqui." />}
        />
        {query.data && <Pagination page={page} totalPages={query.data.meta.totalPages} total={query.data.meta.total} onChange={setPage} />}
      </Card>
      <LeadModal lead={open} onClose={() => setOpen(null)} />
    </>
  )
}
