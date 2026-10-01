import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowUpCircle, Building2, Plus, Search } from 'lucide-react'
import { formatDateTime, formatMoney } from '@/lib/format'
import { useDebounced } from '@/hooks/useDebounced'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusBadge } from '@/components/ui/Badge'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/States'
import { clientsApi, clientsKeys, CONNECTION, LICENSE_STATUS, type Client, type ClientWithKey, type LicenseStatus } from './api'
import { ClientFormModal, InstanceKeyModal, SetupLinkModal } from './ClientModals'
import { RedeployAllModal } from './RedeployAllModal'

type Filter = LicenseStatus | 'ALL' | 'ARCHIVED'

export function ClientsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [formOpen, setFormOpen] = useState(false)
  const [redeployOpen, setRedeployOpen] = useState(false)
  const [created, setCreated] = useState<Client | ClientWithKey | null>(null)
  const debounced = useDebounced(search)

  const params = {
    page,
    search: debounced || undefined,
    status: filter === 'ALL' || filter === 'ARCHIVED' ? undefined : filter,
    archived: filter === 'ARCHIVED' || undefined,
  }
  const clients = useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => clientsApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })

  const closeCreated = () => {
    const id = created?.id
    setCreated(null)
    if (id) navigate(`/clients/${id}`)
  }

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: 'Cliente',
      cell: (c) => (
        <div>
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-muted">
            #{c.clientNumber} · {c.slug}
          </p>
        </div>
      ),
    },
    { key: 'owner', header: 'Responsável', cell: (c) => c.ownerName ?? <span className="text-muted">—</span> },
    {
      key: 'fee',
      header: 'Mensalidade',
      cell: (c) => (
        <div>
          <p className="tabular-nums">{formatMoney(c.monthlyFee)}</p>
          {c.dueDay && <p className="text-xs text-muted">vence dia {c.dueDay}</p>}
        </div>
      ),
    },
    { key: 'status', header: 'Licença', cell: (c) => <StatusBadge status={c.status} map={LICENSE_STATUS} /> },
    {
      key: 'conn',
      header: 'Instalação',
      cell: (c) => (
        <div>
          <StatusBadge status={c.connection} map={CONNECTION} />
          {c.lastCheckAt && <p className="mt-0.5 text-xs text-muted">{formatDateTime(c.lastCheckAt)}</p>}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Restaurantes que usam o Restly e a situação de cada licença"
        actions={
          <>
            <Button variant="secondary" icon={ArrowUpCircle} onClick={() => setRedeployOpen(true)}>
              Atualizar instalações
            </Button>
            <Button variant="success" icon={Plus} onClick={() => setFormOpen(true)}>
              Novo cliente
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input placeholder="Buscar por nome, identificador ou responsável" value={search} onChange={(e) => (setSearch(e.target.value), setPage(1))} className="pl-9" />
          </div>
          <SegmentedControl
            size="sm"
            value={filter}
            onChange={(v) => (setFilter(v), setPage(1))}
            options={[
              { value: 'ALL', label: 'Todos' },
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'WARNING', label: 'Aviso' },
              { value: 'BLOCKED', label: 'Bloqueados' },
              { value: 'ARCHIVED', label: 'Encerrados' },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          rows={clients.data?.data}
          rowKey={(c) => c.id}
          isLoading={clients.isLoading}
          error={clients.error}
          onRetry={() => void clients.refetch()}
          onRowClick={(c) => navigate(`/clients/${c.id}`)}
          empty={
            <EmptyState
              icon={Building2}
              title="Nenhum cliente encontrado"
              description="Cadastre um cliente para gerar a chave da instalação e controlar a licença."
              action={
                <Button icon={Plus} onClick={() => setFormOpen(true)}>
                  Cadastrar cliente
                </Button>
              }
            />
          }
        />
        {clients.data && <Pagination page={page} totalPages={clients.data.meta.totalPages} total={clients.data.meta.total} onChange={setPage} />}
      </Card>

      <RedeployAllModal open={redeployOpen} onClose={() => setRedeployOpen(false)} />
      <ClientFormModal open={formOpen} client={null} onClose={() => setFormOpen(false)} onCreated={setCreated} />
      {/* Instalação automática → link de convite; instalação manual → chave e variáveis. */}
      <SetupLinkModal client={created?.managed ? created : null} onClose={closeCreated} />
      <InstanceKeyModal client={created && !created.managed ? (created as ClientWithKey) : null} onClose={closeCreated} />
    </>
  )
}
