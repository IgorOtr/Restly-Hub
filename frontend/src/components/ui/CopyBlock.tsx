import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './Button'

/** Bloco de texto monoespaçado com botão de copiar (chaves, variáveis de ambiente). */
export function CopyBlock({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value).catch(() => undefined)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <pre className="overflow-x-auto bg-surface-2 p-3 text-xs leading-relaxed break-all whitespace-pre-wrap">{value}</pre>
      <div className="flex justify-end border-t border-border bg-surface px-3 py-2">
        <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={() => void copy()}>
          {copied ? 'Copiado' : label}
        </Button>
      </div>
    </div>
  )
}
