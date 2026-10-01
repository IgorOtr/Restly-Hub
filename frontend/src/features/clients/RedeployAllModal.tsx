import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { clientsApi, clientsKeys, settingsApi, settingsKey } from './api'

const jobKey = ['clients', 'redeploy-all'] as const

/** Atualiza todas as instalações em execução para a imagem atual do servidor. */
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
  const done = j?.results.length ?? 0
  const failed = j?.results.filter((r) => !r.ok) ?? []
  const pct = j ? Math.round((done / j.total) * 100) : 0

  const close = () => {
    if (j?.finishedAt) void qc.invalidateQueries({ queryKey: clientsKeys.all })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="Atualizar instalações"
      description={settings.data?.provisioning ? `Versão do servidor: ${settings.data.provisioning.backendImage}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {running ? 'Fechar (continua em segundo plano)' : 'Fechar'}
          </Button>
          {!running && (
            <Button icon={ArrowUpCircle} loading={start.isPending} disabled={!settings.data?.provisioning} onClick={() => start.mutate()}>
              {j ? 'Atualizar novamente' : 'Iniciar atualização'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-muted">
          Cada instalação em execução é recriada com a versão atual, uma de cada vez (alguns segundos por cliente, com uma breve indisponibilidade
          durante a troca). Instalações paradas, removidas ou de clientes encerrados não são alteradas.
        </p>
        {j && (
          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium">
                {running ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} className="text-emerald-500" />}
                {running ? `Atualizando ${j.current ?? ''}...` : 'Atualização concluída'}
              </span>
              <span className="text-muted tabular-nums">
                {done}/{j.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted">
              Iniciada em {formatDateTime(j.startedAt)}
              {j.finishedAt && ` · concluída em ${formatDateTime(j.finishedAt)}`}
              {j.finishedAt && ` · ${j.total - failed.length} atualizada(s), ${failed.length} com falha`}
            </p>
            {failed.length > 0 && (
              <ul className="space-y-1.5">
                {failed.map((r) => (
                  <li key={r.clientId} className="flex gap-2 text-xs text-red-700 dark:text-red-300">
                    <XCircle size={14} className="mt-px shrink-0" />
                    <span>
                      <strong>{r.name}</strong>: {r.error}
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
