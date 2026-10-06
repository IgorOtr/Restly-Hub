import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { digits } from '@/lib/format'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { settingsKey } from '@/features/clients/api'

export interface SalesContact {
  whatsapp: string | null
  email: string | null
}

/** "55 (11) 98888-7777" a partir dos dígitos com DDI. */
const maskWhatsapp = (v: string) => {
  const d = digits(v).slice(0, 13)
  if (d.length <= 2) return d
  const rest = d.slice(2)
  const ddd = rest.slice(0, 2)
  const num = rest.slice(2)
  return `${d.slice(0, 2)} (${ddd}${ddd.length === 2 ? ')' : ''}${num ? ` ${num.length > 8 ? `${num.slice(0, 5)}-${num.slice(5)}` : num.length > 4 ? `${num.slice(0, 4)}-${num.slice(4)}` : num}` : ''}`
}

/** Contato comercial usado pelo site de vendas (botões de WhatsApp e e-mail). */
export function SalesContactCard({ value }: { value: SalesContact | undefined }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  useEffect(() => {
    setWhatsapp(value?.whatsapp ? maskWhatsapp(value.whatsapp) : '')
    setEmail(value?.email ?? '')
  }, [value])

  const save = useMutation({
    mutationFn: () => api.put('/settings/sales-contact', { whatsapp: digits(whatsapp) || null, email: email.trim() || null }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: settingsKey })
      toast.success('Contato do site salvo')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Card>
      <CardHeader title="Site de vendas" description="Contato comercial exibido no site (botões de WhatsApp e e-mail)" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="WhatsApp comercial" hint="Com DDI e DDD, ex.: 55 (11) 98888-7777">
          <Input inputMode="tel" value={whatsapp} placeholder="55 (11) 98888-7777" onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))} />
        </Field>
        <Field label="E-mail comercial">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button icon={Save} loading={save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </div>
      </div>
    </Card>
  )
}
