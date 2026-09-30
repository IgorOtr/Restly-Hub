import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { zEmail } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/States'
import { AuthShell } from './AuthShell'
import { useAuth } from './AuthProvider'

const schema = z.object({ email: zEmail, password: z.string().min(1, 'Informe a senha') })
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const setup = useQuery({
    queryKey: ['setup-status'],
    queryFn: () => api.get<{ needsSetup: boolean }>('/auth/setup-status').then((r) => r.data),
  })
  const form = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { errors, isSubmitting } = form.formState

  if (setup.isLoading) return <LoadingState className="min-h-screen" />
  if (setup.data?.needsSetup) return <Navigate to="/setup" replace />

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.email, values.password)
    } catch (e) {
      form.setError('root', { message: getErrorMessage(e) })
    }
  })

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Painel de clientes e licenças</p>
      </div>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="E-mail" error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" autoComplete="email" autoFocus invalid={!!errors.email} {...form.register('email')} />
          </Field>
          <Field label="Senha" error={errors.password?.message} htmlFor="password">
            <Input id="password" type="password" autoComplete="current-password" invalid={!!errors.password} {...form.register('password')} />
          </Field>
          {errors.root && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errors.root.message}</p>
          )}
          <Button type="submit" icon={LogIn} loading={isSubmitting} className="mt-1 w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </AuthShell>
  )
}
