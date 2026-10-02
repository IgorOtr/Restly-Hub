import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpCircle, CheckCircle2, Circle, Loader2, MinusCircle, XCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { clientsApi, clientsKeys, settingsApi, settingsKey, type ImageVersion, type RedeployJob } from './api'

const jobKey = ['clients', 'redeploy-all'] as const
const PHASES: RedeployJob['phase'][] = ['pull', 'instances', 'web', 'done']

/** "v1.4.0 · build 02/10/2026 18:40" (ou só a data quando a imagem não tem versão). */
function versionLabel(v: ImageVersion | null | undefined) {
  if (!v) return 'imagem não encontrada no servidor'
  return [v.version && `v${v.version.replace(/^v/, '')}`, `build ${formatDateTime(v.created)}`].filter(Boolean).join(' · ')
}

function Step({ state, title, detail }: { state: 'todo' | 'running' | 'ok' | 'error'; title: string; detail?: string }) {
  const Icon = state === 'running' ? Loader2 : state === 'ok' ? CheckCircle2 : state === 'error' ? XCircle : Circle
  return (
    <li className="flex gap-3">
      <Icon
        size={17}
        className={cn(
          'mt-px shrink-0',
          state === 'running' && 'animate-spin text-primary',
          state === 'ok' && 'text-emerald-500',
          state === 'error' && 'text-red-500',
          state === 'todo' && 'text-subtle',
        )}
      />
      <div>
        <p className={cn('font-medium', state === 'todo' && 'text-muted')}>{title}</p>
        {detail && <p className="text-xs text-muted">{detail}</p>}
      </div>
    </li>
  )
}

/** Atualização da plataforma em um clique: imagens, APIs de todos os clientes e frontend. */
export function RedeployAllModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: settingsKey, queryFn: settingsApi.get, enabled: open })
  const job = useQuery({
    queryKey: jobKey,
    queryFn: clientsApi.redeployAllStatus,
    enabled: open,
    // Acompanha o progresso enquanto houver atualização em andamento.
    refetchInterval: (q) => (q.state.data && !q.state.data.finishedAt ? 2000 : false),
  })
  const start = useMutation({
    mutationFn: clientsApi.redeployAll,
    onSuccess: (j) => {
      qc.setQueryData(jobKey, j)
      void qc.invalidateQueries({ queryKey: jobKey })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const j = job.data
  const running = Boolean(j && !j.finishedAt)
  const phaseIdx = j ? PHASES.indexOf(j.phase) : -1
  const stepState = (phase: RedeployJob['phase'], failed = false) => {
    if (!j) return 'todo' as const
    const idx = PHASES.indexOf(phase)
    if (phaseIdx < idx) return 'todo' as const
    if (phaseIdx === idx && running) return 'running' as const
    return failed ? ('error' as const) : ('ok' as const)
  }
  const failed = j?.results.filter((r) => !r.ok) ?? []
  const skipped = j?.results.filter((r) => r.skipped).length ?? 0
  const updated = (j?.results.length ?? 0) - failed.length - skipped
  const versions = j?.versions ?? settings.data?.provisioning?.versions

  const close = () => {
    if (j?.finishedAt) {
      void qc.invalidateQueries({ queryKey: clientsKeys.all })
      void qc.invalidateQueries({ queryKey: settingsKey })
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Atualizar plataforma"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {running ? 'Fechar (continua em segundo plano)' : 'Fechar'}
          </Button>
          {!running && (
            <Button icon={ArrowUpCircle} loading={start.isPending} disabled={!settings.data?.provisioning} onClick={() => start.mutate()}>
              {j ? 'Atualizar novamente' : 'Atualizar tudo'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <dl className="grid gap-2 rounded-xl bg-surface-2 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">API ({versions?.backend?.image ?? settings.data?.provisioning?.backendImage ?? '—'})</dt>
            <dd className="font-medium">{versionLabel(versions?.backend)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Tela ({versions?.web?.image ?? settings.data?.provisioning?.webImage ?? '—'})</dt>
            <dd className="font-medium">{versionLabel(versions?.web)}</dd>
          </div>
        </dl>
        <p className="text-muted">
          Um clique faz tudo, em ordem: baixa a versão publicada, atualiza a API de cada cliente em execução (uma por vez, com uma breve
          indisponibilidade) e, por último, a tela. Clientes que já estão na versão atual são pulados; instalações paradas ou de clientes encerrados
          não são alteradas.
        </p>

        {j && (
          <div className="space-y-4 rounded-xl border border-border p-4">
            <ol className="space-y-3">
              <Step state={stepState('pull')} title="Baixar a versão mais recente" detail="Imagens locais (sem registro) são usadas como estão" />
              <Step
                state={stepState('instances', failed.length > 0)}
                title={`APIs dos clientes${j.total ? ` (${j.results.length}/${j.total})` : ''}`}
                detail={
                  j.phase === 'instances' && j.current
                    ? `Atualizando ${j.current}...`
                    : phaseIdx > 1
                      ? `${updated} atualizada(s) · ${skipped} já na versão atual · ${failed.length} com falha`
                      : undefined
                }
              />
              <Step state={stepState('web', Boolean(j.platformError))} title="Tela (frontend)" detail={j.platformError ?? undefined} />
            </ol>
            {j.total > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.round((j.results.length / j.total) * 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted">
              Iniciada em {formatDateTime(j.startedAt)}
              {j.finishedAt && ` · concluída em ${formatDateTime(j.finishedAt)}`}
            </p>
            {j.results.some((r) => !r.ok || r.skipped) && (
              <ul className="space-y-1.5">
                {j.results
                  .filter((r) => !r.ok || r.skipped)
                  .map((r) => (
                    <li key={r.clientId} className={cn('flex gap-2 text-xs', r.ok ? 'text-muted' : 'text-red-700 dark:text-red-300')}>
                      {r.ok ? <MinusCircle size={14} className="mt-px shrink-0" /> : <XCircle size={14} className="mt-px shrink-0" />}
                      <span>
                        <strong>{r.name}</strong>: {r.ok ? 'já estava na versão atual' : r.error}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
