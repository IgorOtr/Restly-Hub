import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ban, Building2, CheckCircle2, CircleDollarSign, TriangleAlert, WifiOff } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime, formatElapsed, formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States'
import { LICENSE_STATUS, REASONS, type LicenseStatus } from '@/features/clients/api'

interface Overview {
  clients: { total: number; active: number; warning: number; blocked: number; archived: number }
  revenue: { monthly: number; atRisk: number }
  offline: { id: string; name: string; slug: string; lastCheckAt: string; status: LicenseStatus }[]
  neverConnected: { id: string; name: string; slug: string; createdAt: string }[]
  recentEvents: {
    id: string
    fromStatus: LicenseStatus | null
    toStatus: LicenseStatus
    reason: string | null
    createdAt: string
    client: { id: string; name: string }
    user: { name: string } | null
  }[]
  offlineAfterMinutes: number
}

export function DashboardPage() {
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<Overview>('/dashboard').then((r) => r.data),
    refetchInterval: 30_000,
  })
  const d = query.data
  const loading = query.isLoading

  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const attention = (d?.offline.length ?? 0) + (d?.neverConnected.length ?? 0)

  return (
    <>
      <PageHeader title="Dashboard" description="Situação dos clientes e das instalações" />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Clientes" value={d?.clients.total ?? 0} icon={Building2} tone="primary" loading={loading} hint={`${d?.clients.archived ?? 0} encerrado(s)`} />
          <MetricCard label="Ativos" value={d?.clients.active ?? 0} icon={CheckCircle2} tone="success" loading={loading} />
          <MetricCard label="Em aviso" value={d?.clients.warning ?? 0} icon={TriangleAlert} tone="warning" loading={loading} />
          <MetricCard label="Bloqueados" value={d?.clients.blocked ?? 0} icon={Ban} tone="danger" loading={loading} />
          <MetricCard
            label="Receita mensal contratada"
            value={formatMoney(d?.revenue.monthly)}
            icon={CircleDollarSign}
            tone="violet"
            loading={loading}
            hint={`${formatMoney(d?.revenue.atRisk)} em aviso/bloqueio`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title={`Instalações que precisam de atenção (${attention})`} description={`Sem consultar o Hub há mais de ${d?.offlineAfterMinutes ?? 15} minutos ou que nunca conectaram`} />
            {loading ? (
              <Skeleton className="m-5 h-32" />
            ) : attention === 0 ? (
              <EmptyState icon={CheckCircle2} title="Todas as instalações estão comunicando" className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {d?.offline.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clients/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface-2">
                      <span className="flex items-center gap-2.5">
                        <WifiOff size={15} className="text-red-500" />
                        <span className="font-medium">{c.name}</span>
                      </span>
                      <span className="text-xs text-muted">sem comunicação há {formatElapsed(c.lastCheckAt)}</span>
                    </Link>
                  </li>
                ))}
                {d?.neverConnected.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clients/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface-2">
                      <span className="flex items-center gap-2.5">
                        <WifiOff size={15} className="text-subtle" />
                        <span className="font-medium">{c.name}</span>
                      </span>
                      <span className="text-xs text-muted">nunca conectou</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Últimas alterações de licença" />
            {loading ? (
              <Skeleton className="m-5 h-32" />
            ) : !d?.recentEvents.length ? (
              <EmptyState title="Nenhuma alteração ainda" className="py-10" />
            ) : (
              <ul className="divide-y divide-border">
                {d.recentEvents.map((e) => (
                  <li key={e.id}>
                    <Link to={`/clients/${e.client.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm transition-colors hover:bg-surface-2">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.client.name}</span>
                        <StatusBadge status={e.toStatus} map={LICENSE_STATUS} />
                        {e.reason && <span className="text-xs text-muted">{REASONS[e.reason] ?? e.reason}</span>}
                        {!e.fromStatus && <span className="text-xs text-muted">cadastrado</span>}
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {formatDateTime(e.createdAt)} · {e.user?.name ?? 'Sistema'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
