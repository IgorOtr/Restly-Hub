import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Download, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'

interface Status {
  enabled: boolean
  enabledAt: string | null
  recoveryCodesLeft: number
}

const key = ['auth', '2fa'] as const
const twoFactorApi = {
  status: () => api.get<Status>('/auth/2fa').then((r) => r.data),
  setup: () => api.post<{ secret: string; otpauthUrl: string }>('/auth/2fa/setup').then((r) => r.data),
  enable: (code: string) => api.post<{ recoveryCodes: string[] }>('/auth/2fa/enable', { code }).then((r) => r.data),
  disable: (password: string, code: string) => api.post('/auth/2fa/disable', { password, code }),
  recoveryCodes: (code: string) => api.post<{ recoveryCodes: string[] }>('/auth/2fa/recovery-codes', { code }).then((r) => r.data),
}

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 6)

/** Exibe os códigos de recuperação uma única vez, com copiar e baixar. */
function RecoveryCodes({ codes }: { codes: string[] }) {
  const toast = useToast()
  const text = codes.join('\n')
  const download = () => {
    const url = URL.createObjectURL(new Blob([`Restly Hub — códigos de recuperação\n\n${text}\n`], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'restly-hub-codigos-de-recuperacao.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
        Guarde estes códigos em local seguro. Eles permitem entrar se você perder o celular — cada um vale uma única vez e não serão exibidos de novo.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-4 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="text-center tracking-wider">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Copy}
          onClick={() => void navigator.clipboard.writeText(text).then(() => toast.success('Códigos copiados'))}
        >
          Copiar
        </Button>
        <Button variant="secondary" size="sm" icon={Download} onClick={download}>
          Baixar .txt
        </Button>
      </div>
    </div>
  )
}

/** Ativação: QR Code → primeiro código → códigos de recuperação. */
function EnableModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const setup = useQuery({
    queryKey: [...key, 'setup', open],
    queryFn: twoFactorApi.setup,
    enabled: open,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  })
  const enable = useMutation({
    mutationFn: () => twoFactorApi.enable(code),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
    onError: (e) => {
      setCode('')
      toast.error(getErrorMessage(e))
    },
  })
  const close = () => {
    setCode('')
    enable.reset()
    onClose()
  }
  const codes = enable.data?.recoveryCodes

  return (
    <Modal
      open={open}
      onClose={close}
      title={codes ? 'Verificação em duas etapas ativada' : 'Ativar verificação em duas etapas'}
      footer={
        codes ? (
          <Button onClick={close}>Já guardei os códigos</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button icon={ShieldCheck} disabled={code.length !== 6} loading={enable.isPending} onClick={() => enable.mutate()}>
              Ativar
            </Button>
          </>
        )
      }
    >
      {codes ? (
        <RecoveryCodes codes={codes} />
      ) : setup.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : setup.error ? (
        <p className="text-sm text-red-600">{getErrorMessage(setup.error)}</p>
      ) : (
        setup.data && (
          <div className="space-y-4 text-sm">
            <p>1. Abra um app autenticador (Google Authenticator, Microsoft Authenticator, Authy ou 1Password) e escaneie o QR Code:</p>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCodeSVG value={setup.data.otpauthUrl} size={176} />
            </div>
            <p className="text-xs text-muted">
              Não consegue escanear? Digite a chave manualmente: <span className="font-mono break-all text-fg">{setup.data.secret}</span>
            </p>
            <Field label="2. Digite o código de 6 dígitos que aparece no app" htmlFor="totp-code">
              <Input
                id="totp-code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(onlyDigits(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && enable.mutate()}
                className="text-center text-lg tracking-[0.3em] tabular-nums"
              />
            </Field>
          </div>
        )
      )}
    </Modal>
  )
}

/** Desativar (senha + código) ou gerar novos códigos de recuperação (código do app). */
function ManageModal({ mode, onClose }: { mode: 'disable' | 'recovery' | null; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const run = useMutation({
    mutationFn: async () => {
      if (mode === 'disable') {
        await twoFactorApi.disable(password, code)
        return null
      }
      return (await twoFactorApi.recoveryCodes(code)).recoveryCodes
    },
    onSuccess: (codes) => {
      void qc.invalidateQueries({ queryKey: key })
      if (!codes) {
        toast.success('Verificação em duas etapas desativada')
        close()
      }
    },
    onError: (e) => {
      setCode('')
      toast.error(getErrorMessage(e))
    },
  })
  const close = () => {
    setPassword('')
    setCode('')
    run.reset()
    onClose()
  }
  const newCodes = run.data
  const valid = mode === 'disable' ? password.length > 0 && code.trim().length >= 6 : code.length === 6

  return (
    <Modal
      open={Boolean(mode)}
      onClose={close}
      size="sm"
      title={mode === 'disable' ? 'Desativar verificação em duas etapas' : 'Novos códigos de recuperação'}
      footer={
        newCodes ? (
          <Button onClick={close}>Já guardei os códigos</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button variant={mode === 'disable' ? 'danger' : 'primary'} disabled={!valid} loading={run.isPending} onClick={() => run.mutate()}>
              {mode === 'disable' ? 'Desativar' : 'Gerar novos códigos'}
            </Button>
          </>
        )
      }
    >
      {newCodes ? (
        <RecoveryCodes codes={newCodes} />
      ) : (
        <div className="space-y-4">
          {mode === 'disable' ? (
            <>
              <p className="text-sm text-muted">Sua conta ficará protegida apenas pela senha.</p>
              <Field label="Senha" htmlFor="disable-password">
                <Input
                  id="disable-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              <Field label="Código do app ou de recuperação" htmlFor="disable-code">
                <Input id="disable-code" autoComplete="one-time-code" value={code} maxLength={11} onChange={(e) => setCode(e.target.value.trim())} />
              </Field>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">Os códigos atuais deixarão de valer.</p>
              <Field label="Código do app" htmlFor="recovery-code">
                <Input
                  id="recovery-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(onlyDigits(e.target.value))}
                  className="text-center tracking-[0.3em] tabular-nums"
                />
              </Field>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

export function TwoFactorCard() {
  const status = useQuery({ queryKey: key, queryFn: twoFactorApi.status })
  const [enabling, setEnabling] = useState(false)
  const [managing, setManaging] = useState<'disable' | 'recovery' | null>(null)
  const s = status.data

  return (
    <Card>
      <CardHeader
        title="Segurança"
        description="Verificação em duas etapas no login (código do app autenticador)"
        actions={s && <Badge tone={s.enabled ? 'success' : 'warning'}>{s.enabled ? 'Ativa' : 'Desativada'}</Badge>}
      />
      <div className="space-y-4 p-5 text-sm">
        {status.isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : s?.enabled ? (
          <>
            <p className="text-muted">
              Ativa desde {formatDateTime(s.enabledAt)}. Ao entrar, além da senha, será pedido o código do seu app.
              <br />
              Códigos de recuperação restantes: <strong className="text-fg">{s.recoveryCodesLeft}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={KeyRound} onClick={() => setManaging('recovery')}>
                Novos códigos de recuperação
              </Button>
              <Button variant="danger-ghost" icon={ShieldOff} onClick={() => setManaging('disable')}>
                Desativar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted">
              O Hub controla as licenças de todos os clientes. Com a verificação em duas etapas, uma senha vazada não basta para entrar.
            </p>
            <Button icon={ShieldCheck} onClick={() => setEnabling(true)}>
              Ativar verificação em duas etapas
            </Button>
          </>
        )}
      </div>
      <EnableModal open={enabling} onClose={() => setEnabling(false)} />
      <ManageModal mode={managing} onClose={() => setManaging(null)} />
    </Card>
  )
}
