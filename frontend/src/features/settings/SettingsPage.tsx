import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Save } from 'lucide-react'
import { getErrorMessage } from '@/lib/api'
import { digits, maskPhone } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { CopyBlock } from '@/components/ui/CopyBlock'
import { QueryState } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { TwoFactorCard } from './TwoFactorCard'
import { settingsApi, settingsKey } from '@/features/clients/api'

const schema = z.object({
  name: z.string().max(120),
  phone: z.string().refine((v) => !v || /^\d{10,13}$/.test(digits(v)), 'Telefone inválido'),
  email: z.string().refine((v) => !v || z.email().safeParse(v).success, 'E-mail inválido'),
  url: z.string().refine((v) => !v || z.url().safeParse(v).success, 'Link inválido (inclua https://)'),
})
type FormValues = z.infer<typeof schema>

export function SettingsPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: settingsKey, queryFn: settingsApi.get })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', phone: '', email: '', url: '' } })
  const { errors } = form.formState
  const s = query.data

  useEffect(() => {
    if (s)
      form.reset({
        name: s.supportContact.name ?? '',
        phone: maskPhone(s.supportContact.phone ?? ''),
        email: s.supportContact.email ?? '',
        url: s.supportContact.url ?? '',
      })
  }, [s, form])

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      settingsApi.setSupportContact({ name: v.name || null, phone: digits(v.phone) || null, email: v.email || null, url: v.url || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKey })
      toast.success('Contato salvo. As instalações recebem na próxima consulta.')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <>
      <PageHeader title="Configurações" description="Contato exibido aos clientes, segurança do acesso e dados de integração das instalações" />
      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Contato de suporte" description="Aparece nos cards de aviso e bloqueio de todos os clientes" />
            <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Nome" className="sm:col-span-2">
                <Input placeholder="Ex.: Suporte Restly" {...form.register('name')} />
              </Field>
              <Field label="WhatsApp" error={errors.phone?.message}>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <Input {...field} inputMode="tel" invalid={!!errors.phone} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
                  )}
                />
              </Field>
              <Field label="E-mail" error={errors.email?.message}>
                <Input type="email" invalid={!!errors.email} {...form.register('email')} />
              </Field>
              <Field
                label="Link para regularização"
                error={errors.url?.message}
                hint='Botão "Regularizar agora" (ex.: página de pagamento)'
                className="sm:col-span-2"
              >
                <Input placeholder="https://" invalid={!!errors.url} {...form.register('url')} />
              </Field>
              <div className="flex justify-end sm:col-span-2">
                <Button type="submit" icon={Save} loading={save.isPending}>
                  Salvar
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Integração das instalações" description="Valores usados nas variáveis LICENSE_* de cada instalação do Restly" />
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-1.5 text-sm font-medium">Endereço do Hub (LICENSE_HUB_URL)</p>
                  <CopyBlock value={s?.hubPublicUrl ?? window.location.origin} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Chave pública (LICENSE_HUB_PUBLIC_KEY)</p>
                  <CopyBlock value={s?.hubPublicKey ?? ''} />
                  <p className="mt-1.5 text-xs text-muted">
                    As instalações usam esta chave para confirmar que a licença veio deste Hub. A chave privada nunca sai do servidor.
                  </p>
                </div>
              </div>
            </Card>
            <TwoFactorCard />
            <Card>
              <CardHeader title="Aparência" description="Preferência salva neste navegador" />
              <div className="p-5">
                <ThemeToggle className="w-full" />
              </div>
            </Card>
          </div>
        </div>
      </QueryState>
    </>
  )
}
