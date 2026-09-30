import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Input } from './Field'

/** Converte "1.234,56" / "1234.56" em número. */
export function parseMoney(v: string): number {
  const clean = v.trim().replace(/[^\d.,-]/g, '')
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const n = Number(normalized)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

export const formatMoneyInput = (n: number | string | null | undefined) =>
  n === null || n === undefined || n === '' ? '' : Number(n).toFixed(2).replace('.', ',')

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}

export function MoneyInput({ value, onChange, invalid, className, ...rest }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">R$</span>
      <Input
        inputMode="decimal"
        value={value}
        invalid={invalid}
        onChange={(e) => onChange(e.target.value.replace(/[^\d,.]/g, ''))}
        onBlur={() => {
          const n = parseMoney(value)
          if (!Number.isNaN(n) && value !== '') onChange(formatMoneyInput(n))
        }}
        className={cn('pl-9 tabular-nums', className)}
        {...rest}
      />
    </div>
  )
}
