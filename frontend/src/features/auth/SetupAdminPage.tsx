import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { zEmail } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/States'
import { AuthShell } from './AuthShell'
import { useAuth } from './AuthProvider'

const schema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome completo'),
    email: zEmail,
    password: z.string().min(8, 'Mínimo de 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem' })
type FormValues = z.infer<typeof schema>

/** Primeiro acesso da instalação: cria o administrador. */
export function SetupAdminPage() {
  const { registerAdmin } = useAuth()
  const setup = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get<{ needsSetup: boolean }>('/auth/setup-status').then((r) => r.data),
  })
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { errors, isSubmitting } = form.formState

  if (setup.isLoading) return <LoadingState className="min-h-screen" />
  if (!setup.data?.needsSetup) return <Navigate to="/login" replace />

  const onSubmit = form.handleSubmit(async ({ name, email, password }) => {
    try {
      await registerAdmin({ name, email, password })
    } catch (e) {
      form.setError('root', { message: getErrorMessage(e) })
    }
  })

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo ao Restly Hub</h1>
        <p className="mt-1 text-sm text-muted">Crie a sua conta de administrador do Hub</p>
      </div>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Nome completo" error={errors.name?.message} required>
            <Input autoFocus invalid={!!errors.name} {...form.register('name')} />
          </Field>
          <Field label="E-mail" error={errors.email?.message} required>
            <Input type="email" autoComplete="email" invalid={!!errors.email} {...form.register('email')} />
          </Field>
          <Field label="Senha" error={errors.password?.message} required>
            <Input type="password" autoComplete="new-password" invalid={!!errors.password} {...form.register('password')} />
          </Field>
          <Field label="Confirmar senha" error={errors.confirm?.message} required>
            <Input type="password" autoComplete="new-password" invalid={!!errors.confirm} {...form.register('confirm')} />
          </Field>
          {errors.root && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errors.root.message}</p>}
          <Button type="submit" icon={UserPlus} loading={isSubmitting} className="mt-1 w-full">
            Criar administrador
          </Button>
        </form>
      </Card>
    </AuthShell>
  )
}
