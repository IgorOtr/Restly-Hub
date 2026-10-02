import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertTriangle, CheckCircle2, KeyRound, XCircle } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { digits, maskPhone } from '@/lib/format'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { MoneyInput, formatMoneyInput, parseMoney } from '@/components/ui/MoneyInput'
import { CopyBlock } from '@/components/ui/CopyBlock'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import {
  clientsApi,
  clientsKeys,
  installEnv,
  managedUrl,
  LICENSE_STATUS,
  REASONS,
  settingsApi,
  settingsKey,
  type Client,
  type ClientWithKey,
  type LicenseStatus,
} from './api'

const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome').max(160),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/, 'Use letras minúsculas, números e hífen'),
  // Validado no envio: só é exigido quando a instalação é manual.
  url: z.string(),
  ownerName: z.string().max(120).optional(),
  ownerPhone: z.string().refine((v) => !v || /^\d{10,13}$/.test(digits(v)), 'Telefone inválido'),
  ownerEmail: z.string().refine((v) => !v || z.email().safeParse(v).success, 'E-mail inválido'),
  monthlyFee: z.string().refine((v) => !v || !Number.isNaN(parseMoney(v)), 'Valor inválido'),
  dueDay: z.string().refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31), 'Entre 1 e 31'),
  notes: z.string().max(5000).optional(),
  supportName: z.string().max(120),
  supportPhone: z.string().refine((v) => !v || /^\d{10,13}$/.test(digits(v)), 'Telefone inválido'),
  supportEmail: z.string().refine((v) => !v || z.email().safeParse(v).success, 'E-mail inválido'),
  supportUrl: z.string().refine((v) => !v || z.url().safeParse(v).success, 'Link inválido (inclua https://)'),
})
type FormValues = z.infer<typeof schema>

export function ClientFormModal({
  open,
  client,
  onClose,
  onCreated,
}: {
  open: boolean
  client: Client | null
  onClose: () => void
  onCreated?: (c: Client | ClientWithKey) => void
}) {
  const toast = useToast()
  const qc = useQueryClient()
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { errors, dirtyFields } = form.formState
  const settings = useQuery({ queryKey: settingsKey, queryFn: settingsApi.get, enabled: open && !client })
  const provisioning = settings.data?.provisioning ?? null
  // Cliente novo: cria a instalação automaticamente quando o servidor está disponível.
  const [auto, setAuto] = useState(true)
  const automatic = !client && Boolean(provisioning) && auto

  useEffect(() => {
    if (!open) return
    form.reset({
      name: client?.name ?? '',
      slug: client?.slug ?? '',
      url: client?.url ?? '',
      ownerName: client?.ownerName ?? '',
      ownerPhone: maskPhone(client?.ownerPhone ?? ''),
      ownerEmail: client?.ownerEmail ?? '',
      monthlyFee: client ? formatMoneyInput(client.monthlyFee) : '',
      dueDay: client?.dueDay ? String(client.dueDay) : '',
      notes: client?.notes ?? '',
      supportName: client?.supportName ?? '',
      supportPhone: maskPhone(client?.supportPhone ?? ''),
      supportEmail: client?.supportEmail ?? '',
      supportUrl: client?.supportUrl ?? '',
    })
  }, [open, client, form])

  // Cliente novo: sugere identificador e endereço a partir do nome.
  const name = form.watch('name')
  useEffect(() => {
    if (client || !open) return
    const slug = slugify(name ?? '')
    if (!dirtyFields.slug) form.setValue('slug', slug)
    if (!dirtyFields.url) form.setValue('url', slug ? `https://${slug}.restly.com.br` : '')
  }, [name, client, open, dirtyFields.slug, dirtyFields.url, form])

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const data = {
        name: v.name,
        slug: v.slug,
        ...(automatic ? { provision: true } : { url: v.url }),
        ownerName: v.ownerName || undefined,
        ownerPhone: digits(v.ownerPhone) || undefined,
        ownerEmail: v.ownerEmail || undefined,
        monthlyFee: v.monthlyFee ? parseMoney(v.monthlyFee) : 0,
        dueDay: v.dueDay ? Number(v.dueDay) : null,
        notes: v.notes || undefined,
        // Vazio = usa o contato geral do Hub.
        supportName: v.supportName.trim() || null,
        supportPhone: digits(v.supportPhone) || null,
        supportEmail: v.supportEmail.trim() || null,
        supportUrl: v.supportUrl.trim() || null,
      }
      return client ? clientsApi.update(client.id, data) : clientsApi.create(data)
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: clientsKeys.all })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (client) toast.success('Cliente atualizado')
      onClose()
      if (!client) onCreated?.(saved)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={client ? 'Editar cliente' : 'Novo cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="client-form" loading={save.isPending}>
            {client ? 'Salvar' : automatic ? (save.isPending ? 'Criando instalação...' : 'Cadastrar e criar instalação') : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form
        id="client-form"
        noValidate
        onSubmit={form.handleSubmit((v) => {
          if (!automatic && !z.url().safeParse(v.url).success) {
            form.setError('url', { message: 'Endereço inválido (inclua https://)' })
            return
          }
          save.mutate(v)
        })}
        className="grid grid-cols-1 gap-4 sm:grid-cols-6"
      >
        {!client && provisioning && (
          <div className="rounded-xl border border-border p-4 sm:col-span-6">
            <Switch
              checked={auto}
              onChange={setAuto}
              label="Criar a instalação automaticamente"
              description="O servidor cria o banco, os segredos e sobe o sistema do cliente. Ao final você recebe o link de convite para enviar ao restaurante."
            />
          </div>
        )}
        <Field label="Nome do restaurante" required error={errors.name?.message} className="sm:col-span-6">
          <Input autoFocus invalid={!!errors.name} {...form.register('name')} />
        </Field>
        <Field
          label="Identificador (subdomínio)"
          required
          error={errors.slug?.message}
          hint="Identifica a instalação no Hub"
          className="sm:col-span-2"
        >
          <Input invalid={!!errors.slug} {...form.register('slug')} />
        </Field>
        {automatic && provisioning ? (
          <Field label="Endereço da instalação" hint="Definido pelo servidor a partir do identificador" className="sm:col-span-4">
            <Input value={managedUrl(provisioning, form.watch('slug') ?? '')} disabled readOnly />
          </Field>
        ) : (
          <Field label="Endereço da instalação" required error={errors.url?.message} className="sm:col-span-4">
            <Input invalid={!!errors.url} placeholder="https://cliente.restly.com.br" {...form.register('url')} />
          </Field>
        )}
        <Field label="Responsável" className="sm:col-span-2">
          <Input {...form.register('ownerName')} />
        </Field>
        <Field label="Telefone" error={errors.ownerPhone?.message} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="ownerPhone"
            render={({ field }) => (
              <Input {...field} inputMode="tel" invalid={!!errors.ownerPhone} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
            )}
          />
        </Field>
        <Field label="E-mail" error={errors.ownerEmail?.message} className="sm:col-span-2">
          <Input type="email" invalid={!!errors.ownerEmail} {...form.register('ownerEmail')} />
        </Field>
        <Field label="Mensalidade" error={errors.monthlyFee?.message} className="sm:col-span-3">
          <Controller
            control={form.control}
            name="monthlyFee"
            render={({ field }) => (
              <MoneyInput value={field.value ?? ''} onChange={field.onChange} invalid={!!errors.monthlyFee} placeholder="0,00" />
            )}
          />
        </Field>
        <Field label="Dia do vencimento" error={errors.dueDay?.message} className="sm:col-span-3">
          <Input type="number" min={1} max={31} invalid={!!errors.dueDay} {...form.register('dueDay')} />
        </Field>
        <Field label="Observações" className="sm:col-span-6">
          <Textarea rows={2} {...form.register('notes')} />
        </Field>
        <details
          className="group rounded-xl border border-border sm:col-span-6"
          open={Boolean(client?.supportName || client?.supportPhone || client?.supportEmail || client?.supportUrl)}
        >
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Contato de suporte deste cliente <span className="font-normal text-muted">(opcional — vazio usa o contato geral)</span>
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-border p-4 sm:grid-cols-2">
            <Field label="Nome">
              <Input {...form.register('supportName')} />
            </Field>
            <Field label="WhatsApp" error={errors.supportPhone?.message}>
              <Controller
                control={form.control}
                name="supportPhone"
                render={({ field }) => (
                  <Input {...field} inputMode="tel" invalid={!!errors.supportPhone} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
                )}
              />
            </Field>
            <Field label="E-mail" error={errors.supportEmail?.message}>
              <Input type="email" invalid={!!errors.supportEmail} {...form.register('supportEmail')} />
            </Field>
            <Field label="Link para regularização" error={errors.supportUrl?.message}>
              <Input placeholder="https://" invalid={!!errors.supportUrl} {...form.register('supportUrl')} />
            </Field>
          </div>
        </details>
      </form>
    </Modal>
  )
}

/** Exibe a chave da instalação (uma única vez) com as variáveis prontas para o .env. */
export function InstanceKeyModal({ client, onClose }: { client: ClientWithKey | null; onClose: () => void }) {
  const settings = useQuery({ queryKey: settingsKey, queryFn: settingsApi.get, enabled: Boolean(client) })
  if (!client) return null
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <KeyRound size={18} /> Chave da instalação — {client.name}
        </span>
      }
      footer={<Button onClick={onClose}>Já copiei</Button>}
    >
      <div className="space-y-4">
        <p className="flex gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          Esta chave é exibida apenas agora. Copie as variáveis abaixo para o arquivo .env da instalação do cliente. Se perder, gere uma nova chave.
        </p>
        {settings.data ? (
          <CopyBlock value={installEnv(client, settings.data, client.instanceKey)} label="Copiar variáveis" />
        ) : (
          <p className="text-sm text-muted">Carregando...</p>
        )}
        <p className="text-xs text-muted">
          Depois de salvar o .env, reinicie a instalação. Ela aparecerá como <strong className="text-fg">Online</strong> aqui no Hub após a primeira
          consulta.
        </p>
      </div>
    </Modal>
  )
}

/** Resultado da criação automática: link de convite para enviar ao restaurante (ou o erro). */
export function SetupLinkModal({ client, onClose }: { client: Client | null; onClose: () => void }) {
  if (!client) return null
  const failed = client.provisionStatus === 'FAILED'
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          {failed ? <XCircle size={18} className="text-red-500" /> : <CheckCircle2 size={18} className="text-emerald-500" />}
          {failed ? 'Não foi possível criar a instalação' : `Instalação criada — ${client.name}`}
        </span>
      }
      footer={<Button onClick={onClose}>{failed ? 'Ver cliente' : 'Concluir'}</Button>}
    >
      {failed ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            O cliente foi cadastrado, mas o servidor não conseguiu subir a instalação. Você pode tentar novamente na página do cliente.
          </p>
          <pre className="max-h-48 overflow-auto rounded-lg bg-surface-2 p-3 text-xs whitespace-pre-wrap">{client.provisionError}</pre>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            O sistema já está no ar em{' '}
            <a href={client.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">
              {client.url}
            </a>
            . Envie o link abaixo ao responsável: é por ele que o restaurante cria o administrador e faz a configuração inicial.
          </p>
          {client.setupUrl && <CopyBlock value={client.setupUrl} label="Copiar link de convite" />}
          <p className="text-xs text-muted">O link funciona uma única vez e continua disponível na página do cliente até ser usado.</p>
        </div>
      )}
    </Modal>
  )
}

const STATUS_HELP: Record<LicenseStatus, string> = {
  ACTIVE: 'Uso normal do sistema, sem avisos.',
  WARNING: 'O sistema continua funcionando e o administrador vê uma faixa de aviso.',
  BLOCKED: 'O sistema e o cardápio do QR Code ficam indisponíveis; o administrador vê apenas o motivo.',
}

export function LicenseModal({ client, initialStatus, onClose }: { client: Client | null; initialStatus: LicenseStatus; onClose: () => void }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [status, setStatus] = useState<LicenseStatus>(initialStatus)
  const [reason, setReason] = useState('PAYMENT_OVERDUE')
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => {
    if (!client) return
    setStatus(initialStatus)
    setReason(client.reason ?? 'PAYMENT_OVERDUE')
    setMessage(initialStatus === client.status ? (client.message ?? '') : '')
    setDueDate(client.dueDate?.slice(0, 10) ?? '')
  }, [client, initialStatus])

  const save = useMutation({
    mutationFn: () =>
      clientsApi.setLicense(client!.id, {
        status,
        ...(status !== 'ACTIVE' && { reason, message: message.trim() || undefined, dueDate: status === 'WARNING' && dueDate ? dueDate : undefined }),
      }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: clientsKeys.all })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (r.sync.ok) toast.success(`Licença alterada para ${LICENSE_STATUS[status].label} e aplicada na instalação`)
      else toast.info(`Licença alterada para ${LICENSE_STATUS[status].label}. A instalação não respondeu agora e aplicará na próxima consulta.`)
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (!client) return null
  return (
    <Modal
      open
      onClose={onClose}
      title={`Licença — ${client.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={status === 'BLOCKED' ? 'danger' : status === 'ACTIVE' ? 'success' : 'primary'}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {status === 'BLOCKED' ? 'Bloquear' : status === 'ACTIVE' ? 'Liberar acesso' : 'Aplicar aviso'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(LICENSE_STATUS) as LicenseStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-colors',
                status === s ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-border-strong',
              )}
            >
              {LICENSE_STATUS[s].label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{STATUS_HELP[status]}</p>

        {status !== 'ACTIVE' && (
          <>
            <Field label="Motivo">
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(REASONS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {status === 'WARNING' && (
              <Field label="Prazo para regularização" hint="Exibido na faixa de aviso">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-48" />
              </Field>
            )}
            <Field label="Mensagem para o cliente" hint="Em branco, usa a mensagem padrão do motivo">
              <Textarea rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>
          </>
        )}
      </div>
    </Modal>
  )
}
