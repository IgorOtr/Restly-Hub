import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { ArrowLeft, LogIn, ShieldCheck } from 'lucide-react'
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

/** Segundo passo: código do app autenticador ou de recuperação. */
function SecondFactorStep({ mfaToken, onBack }: { mfaToken: string; onBack: () => void }) {
  const { verifyMfa } = useAuth()
  const [recovery, setRecovery] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const valid = recovery ? code.replace(/[^a-z0-9]/gi, '').length === 10 : /^\d{6}$/.test(code)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setLoading(true)
    setError(null)
    try {
      await verifyMfa(mfaToken, code)
    } catch (err) {
      setError(getErrorMessage(err))
      setCode('')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="flex items-start gap-3 rounded-lg bg-primary-soft px-3 py-2.5 text-sm text-primary">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        <span>
          {recovery
            ? 'Digite um dos seus códigos de recuperação. Cada código vale uma única vez.'
            : 'Digite o código de 6 dígitos do seu app autenticador.'}
        </span>
      </div>
      <Field label={recovery ? 'Código de recuperação' : 'Código'} htmlFor="code">
        <Input
          id="code"
          autoFocus
          autoComplete="one-time-code"
          inputMode={recovery ? 'text' : 'numeric'}
          maxLength={recovery ? 11 : 6}
          placeholder={recovery ? 'xxxxx-xxxxx' : '000000'}
          value={code}
          onChange={(e) => setCode(recovery ? e.target.value.toLowerCase() : e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.3em] tabular-nums"
        />
      </Field>
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <Button type="submit" icon={ShieldCheck} loading={loading} disabled={!valid} className="w-full">
        Verificar e entrar
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-muted hover:text-fg">
          <ArrowLeft size={14} /> Voltar
        </button>
        <button
          type="button"
          onClick={() => {
            setRecovery((r) => !r)
            setCode('')
            setError(null)
          }}
          className="font-medium text-primary hover:underline"
        >
          {recovery ? 'Usar o app autenticador' : 'Usar código de recuperação'}
        </button>
      </div>
    </form>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const [mfaToken, setMfaToken] = useState<string | null>(null)
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
      const challenge = await login(values.email, values.password)
      if (challenge) setMfaToken(challenge.mfaToken)
    } catch (e) {
      form.setError('root', { message: getErrorMessage(e) })
    }
  })

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{mfaToken ? 'Verificação em duas etapas' : 'Entrar'}</h1>
        <p className="mt-1 text-sm text-muted">Painel de clientes e licenças</p>
      </div>
      <Card className="p-6">
        {mfaToken ? (
          <SecondFactorStep
            mfaToken={mfaToken}
            onBack={() => {
              setMfaToken(null)
              form.resetField('password')
            }}
          />
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field label="E-mail" error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" autoFocus invalid={!!errors.email} {...form.register('email')} />
            </Field>
            <Field label="Senha" error={errors.password?.message} htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" invalid={!!errors.password} {...form.register('password')} />
            </Field>
            {errors.root && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{errors.root.message}</p>}
            <Button type="submit" icon={LogIn} loading={isSubmitting} className="mt-1 w-full">
              Entrar
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  )
}
