import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowUpCircle,
  Ban,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Pencil,
  Play,
  RefreshCw,
  RotateCw,
  Server,
  Square,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { formatDate, formatDateTime, formatElapsed, formatMoney, maskPhone } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { CopyBlock } from '@/components/ui/CopyBlock'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  clientsApi,
  clientsKeys,
  CONNECTION,
  LICENSE_STATUS,
  PROVISION_STATUS,
  REASONS,
  settingsApi,
  settingsKey,
  type ClientWithKey,
  type InstanceAction,
  type LicenseStatus,
} from './api'
import { ClientFormModal, InstanceKeyModal, LicenseModal } from './ClientModals'

const ago = (date: string) => {
  const e = formatElapsed(date)
  return e === 'agora' ? 'agora' : `há ${e}`
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{children || '—'}</dd>
    </div>
  )
}

export function ClientDetailPage() {
  const { id = '' } = useParams()
  const toast = useToast()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: clientsKeys.detail(id), queryFn: () => clientsApi.get(id), refetchInterval: 20_000 })
  const [editing, setEditing] = useState(false)
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [newKey, setNewKey] = useState<ClientWithKey | null>(null)
  const [confirm, setConfirm] = useState<'key' | 'archive' | 'stop' | 'remove' | null>(null)
  const settings = useQuery({ queryKey: settingsKey, queryFn: settingsApi.get })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: clientsKeys.all })
    void qc.invalidateQueries({ queryKey: ['dashboard'] })
  }
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  const sync = useMutation({
    mutationFn: () => clientsApi.sync(id),
    onSuccess: (r) => {
      invalidate()
      if (r.ok) toast.success('Instalação sincronizada')
      else toast.error(`A instalação não respondeu (${r.detail ?? 'sem detalhes'})`)
    },
    onError,
  })
  const regenerate = useMutation({
    mutationFn: () => clientsApi.regenerateKey(id),
    onSuccess: (c) => {
      invalidate()
      setConfirm(null)
      setNewKey(c)
    },
    onError,
  })
  const archive = useMutation({
    mutationFn: () => clientsApi.archive(id),
    onSuccess: (r) => {
      invalidate()
      setConfirm(null)
      if (r.stopError) toast.error(`Cliente encerrado e bloqueado, mas a instalação não foi parada: ${r.stopError}`)
      else toast.success(r.stopped ? 'Cliente encerrado: instalação bloqueada e parada.' : 'Cliente encerrado. A instalação foi bloqueada.')
    },
    onError,
  })
  const provision = useMutation({
    mutationFn: () => clientsApi.provision(id),
    onSuccess: (r) => {
      invalidate()
      if (r.provisionStatus === 'FAILED') toast.error('Não foi possível criar a instalação. Veja o detalhe do erro.')
      else toast.success('Instalação criada')
    },
    onError,
  })
  const instance = useMutation({
    mutationFn: (action: InstanceAction) => clientsApi.instanceAction(id, action),
    onSuccess: (r, action) => {
      invalidate()
      setConfirm(null)
      if (action !== 'redeploy') return toast.success(action === 'stop' ? 'Instalação parada' : 'Instalação iniciada')
      if (r.webUpdated) toast.success('Instalação atualizada (API e tela)')
      else if (r.outdatedInstances)
        toast.success(
          `API atualizada. A tela é compartilhada e só muda quando os outros ${r.outdatedInstances} cliente(s) também forem atualizados — use "Atualizar plataforma".`,
        )
      else toast.success('Instalação atualizada')
    },
    onError,
  })
  const removeInstance = useMutation({
    mutationFn: () => clientsApi.removeInstance(id),
    onSuccess: () => {
      invalidate()
      setConfirm(null)
      toast.success('Instalação removida. Banco e arquivos preservados.')
    },
    onError,
  })
  const restore = useMutation({
    mutationFn: () => clientsApi.restore(id),
    onSuccess: () => {
      invalidate()
      toast.success('Cliente reativado. A instalação foi iniciada e permanece bloqueada até você liberar.')
    },
    onError,
  })

  const c = query.data
  return (
    <>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={15} /> Clientes
      </Link>
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
        {c && (
          <>
            <PageHeader
              title={
                <span className="flex flex-wrap items-center gap-3">
                  {c.name}
                  <StatusBadge status={c.status} map={LICENSE_STATUS} />
                  {c.archivedAt && <Badge>Encerrado</Badge>}
                </span>
              }
              description={
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  {c.url} <ExternalLink size={12} />
                </a>
              }
              actions={
                <>
                  <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                    Editar
                  </Button>
                  {c.archivedAt ? (
                    <Button variant="secondary" icon={ArchiveRestore} loading={restore.isPending} onClick={() => restore.mutate()}>
                      Reativar cliente
                    </Button>
                  ) : (
                    <Button variant="danger-ghost" icon={Archive} onClick={() => setConfirm('archive')}>
                      Encerrar
                    </Button>
                  )}
                </>
              }
            />

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <Card>
                  <CardHeader
                    title="Licença"
                    description={`Alterada em ${formatDateTime(c.statusChangedAt)}`}
                    actions={
                      <Button variant="ghost" size="sm" icon={RefreshCw} loading={sync.isPending} onClick={() => sync.mutate()}>
                        Sincronizar agora
                      </Button>
                    }
                  />
                  <div className="space-y-4 p-5">
                    {c.status !== 'ACTIVE' && (
                      <div className="rounded-xl bg-surface-2 p-4 text-sm">
                        <p className="font-medium">{c.reason ? (REASONS[c.reason] ?? c.reason) : 'Sem motivo informado'}</p>
                        <p className="mt-1 whitespace-pre-line text-muted">{c.message ?? 'Mensagem padrão do motivo.'}</p>
                        {c.dueDate && <p className="mt-1 text-muted">Prazo: {formatDate(c.dueDate)}</p>}
                      </div>
                    )}
                    {!c.archivedAt && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="success" icon={CheckCircle2} disabled={c.status === 'ACTIVE'} onClick={() => setLicenseStatus('ACTIVE')}>
                          Liberar
                        </Button>
                        <Button variant="secondary" icon={TriangleAlert} onClick={() => setLicenseStatus('WARNING')}>
                          {c.status === 'WARNING' ? 'Editar aviso' : 'Colocar em aviso'}
                        </Button>
                        <Button variant="danger" icon={Ban} onClick={() => setLicenseStatus('BLOCKED')}>
                          {c.status === 'BLOCKED' ? 'Editar bloqueio' : 'Bloquear'}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Histórico da licença" />
                  {c.events.length === 0 ? (
                    <p className="p-5 text-sm text-muted">Nenhuma alteração registrada.</p>
                  ) : (
                    <ol className="divide-y divide-border">
                      {c.events.map((e) => (
                        <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {e.fromStatus && (
                                <>
                                  <StatusBadge status={e.fromStatus} map={LICENSE_STATUS} />
                                  <span className="text-muted">→</span>
                                </>
                              )}
                              <StatusBadge status={e.toStatus} map={LICENSE_STATUS} />
                              {e.reason && <span className="text-muted">{REASONS[e.reason] ?? e.reason}</span>}
                              {!e.fromStatus && <span className="text-muted">Cliente cadastrado</span>}
                            </div>
                            {e.message && <p className="mt-1 text-xs text-muted">{e.message}</p>}
                          </div>
                          <div className="text-right text-xs text-muted">
                            <p className="tabular-nums">{formatDateTime(e.createdAt)}</p>
                            <p>{e.user?.name ?? 'Sistema'}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader title="Instalação" actions={<StatusBadge status={c.connection} map={CONNECTION} />} />
                  <dl className="grid grid-cols-2 gap-4 p-5">
                    <Info label="Identificador">{c.slug}</Info>
                    <Info label="Versão">{c.lastVersion}</Info>
                    <Info label="Última comunicação">{c.lastCheckAt ? `${formatDateTime(c.lastCheckAt)} (${ago(c.lastCheckAt)})` : 'Nunca'}</Info>
                    <Info label="IP">{c.lastCheckIp}</Info>
                    <Info label="Chave">
                      <code className="text-xs">{c.instanceKeyPrefix}…</code>
                    </Info>
                  </dl>
                  {c.managed ? (
                    <div className="space-y-3 border-t border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted">Gerenciada pelo Hub</span>
                        <StatusBadge status={c.provisionStatus} map={PROVISION_STATUS} />
                      </div>
                      {c.provisionStatus === 'FAILED' && (
                        <>
                          <pre className="max-h-40 overflow-auto rounded-lg bg-red-500/10 p-3 text-xs whitespace-pre-wrap text-red-700 dark:text-red-300">
                            {c.provisionError ?? 'Falha desconhecida'}
                          </pre>
                          <Button size="sm" icon={RotateCw} loading={provision.isPending} onClick={() => provision.mutate()}>
                            Tentar criar novamente
                          </Button>
                        </>
                      )}
                      {c.provisionStatus === 'REMOVED' && (
                        <>
                          <p className="text-xs text-muted">
                            O container foi removido. O banco de dados e os arquivos foram preservados e serão reaproveitados ao recriar.
                          </p>
                          <Button size="sm" icon={RotateCw} loading={provision.isPending} onClick={() => provision.mutate()}>
                            Recriar instalação
                          </Button>
                        </>
                      )}
                      {(c.provisionStatus === 'RUNNING' || c.provisionStatus === 'STOPPED') && (
                        <div className="flex flex-wrap gap-2">
                          {c.provisionStatus === 'RUNNING' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={Square}
                              loading={instance.isPending && instance.variables === 'stop'}
                              onClick={() => setConfirm('stop')}
                            >
                              Parar
                            </Button>
                          ) : (
                            <Button
                              variant="success"
                              size="sm"
                              icon={Play}
                              loading={instance.isPending && instance.variables === 'start'}
                              onClick={() => instance.mutate('start')}
                            >
                              Iniciar
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ArrowUpCircle}
                            loading={instance.isPending && instance.variables === 'redeploy'}
                            onClick={() => instance.mutate('redeploy')}
                          >
                            Atualizar versão
                          </Button>
                          <Tooltip
                            content={
                              c.provisionStatus === 'STOPPED' || c.archivedAt
                                ? 'Remove o container; dados preservados'
                                : 'Pare a instalação ou encerre o cliente antes'
                            }
                          >
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              icon={Trash2}
                              disabled={c.provisionStatus !== 'STOPPED' && !c.archivedAt}
                              onClick={() => setConfirm('remove')}
                            >
                              Remover
                            </Button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 border-t border-border p-4">
                      <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => setConfirm('key')}>
                        Gerar nova chave
                      </Button>
                      {c.connection === 'NEVER' && settings.data?.provisioning && (
                        <Button size="sm" icon={Server} loading={provision.isPending} onClick={() => provision.mutate()}>
                          Criar instalação neste servidor
                        </Button>
                      )}
                    </div>
                  )}
                </Card>

                {c.setupUrl && (
                  <Card>
                    <CardHeader title="Convite pendente" description="O restaurante ainda não criou o administrador" />
                    <div className="space-y-2 p-4">
                      <CopyBlock value={c.setupUrl} label="Copiar link de convite" />
                      <p className="text-xs text-muted">Envie ao responsável. O link deixa de valer assim que o administrador for criado.</p>
                    </div>
                  </Card>
                )}

                <Card>
                  <CardHeader title="Cliente" description={`#${c.clientNumber} · desde ${formatDate(c.createdAt)}`} />
                  <dl className="grid grid-cols-2 gap-4 p-5">
                    <Info label="Responsável">{c.ownerName}</Info>
                    <Info label="Telefone">{c.ownerPhone ? maskPhone(c.ownerPhone) : null}</Info>
                    <div className="col-span-2">
                      <Info label="E-mail">{c.ownerEmail}</Info>
                    </div>
                    <div className="col-span-2">
                      <Info label="Contato de suporte">
                        {c.supportName || c.supportPhone || c.supportEmail || c.supportUrl ? (
                          [c.supportName, c.supportPhone && maskPhone(c.supportPhone), c.supportEmail, c.supportUrl].filter(Boolean).join(' · ')
                        ) : (
                          <span className="font-normal text-muted">Contato geral do Hub</span>
                        )}
                      </Info>
                    </div>
                    <Info label="Mensalidade">{formatMoney(c.monthlyFee)}</Info>
                    <Info label="Vencimento">{c.dueDay ? `Dia ${c.dueDay}` : null}</Info>
                    {c.notes && (
                      <div className="col-span-2">
                        <Info label="Observações">
                          <span className="font-normal whitespace-pre-line">{c.notes}</span>
                        </Info>
                      </div>
                    )}
                  </dl>
                </Card>
              </div>
            </div>

            <ClientFormModal open={editing} client={c} onClose={() => setEditing(false)} />
            <LicenseModal client={licenseStatus ? c : null} initialStatus={licenseStatus ?? c.status} onClose={() => setLicenseStatus(null)} />
            <InstanceKeyModal client={newKey} onClose={() => setNewKey(null)} />
            <ConfirmDialog
              open={confirm === 'key'}
              onClose={() => setConfirm(null)}
              onConfirm={() => regenerate.mutate()}
              loading={regenerate.isPending}
              title="Gerar nova chave"
              description="A chave atual deixa de funcionar. A instalação ficará sem comunicação (mantendo o status atual) até receber a nova chave no .env."
              confirmLabel="Gerar nova chave"
              variant="primary"
            />
            <ConfirmDialog
              open={confirm === 'remove'}
              onClose={() => setConfirm(null)}
              onConfirm={() => removeInstance.mutate()}
              loading={removeInstance.isPending}
              title="Remover instalação"
              description={`O container de ${c.name} será removido. O banco de dados e os arquivos enviados são preservados e a instalação pode ser recriada depois com os mesmos dados.`}
              confirmLabel="Remover instalação"
              confirmText={c.slug}
            />
            <ConfirmDialog
              open={confirm === 'stop'}
              onClose={() => setConfirm(null)}
              onConfirm={() => instance.mutate('stop')}
              loading={instance.isPending}
              title="Parar instalação"
              description={`O sistema de ${c.name} ficará fora do ar (inclusive o cardápio do QR Code) até ser iniciado novamente. Os dados são preservados.`}
              confirmLabel="Parar"
            />
            <ConfirmDialog
              open={confirm === 'archive'}
              onClose={() => setConfirm(null)}
              onConfirm={() => archive.mutate()}
              loading={archive.isPending}
              title="Encerrar cliente"
              description={`A instalação de ${c.name} será bloqueada com o motivo "Contrato encerrado"${c.managed && c.provisionStatus === 'RUNNING' ? ' e parada' : ''}. O histórico é mantido e o cliente pode ser reativado.`}
              confirmLabel="Encerrar cliente"
            />
          </>
        )}
      </QueryState>
    </>
  )
}
