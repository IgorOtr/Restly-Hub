const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatMoney = (v: number | string | null | undefined) => brl.format(Number(v ?? 0))

export const formatNumber = (v: number | string, digits = 0) =>
  Number(v).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: 0 })

export const formatPercent = (v: number) =>
  `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`

export const formatDateTime = (v: string | Date | null | undefined) =>
  v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export const formatDate = (v: string | Date | null | undefined) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—'

export const formatTime = (v: string | Date | null | undefined) =>
  v ? new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'

/** "há 12 min", "1h 05min" — duração desde a data informada. */
export function formatElapsed(from: string | Date, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000))
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${String(m).padStart(2, '0')}min`
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const tableLabel = (n: number) => `Mesa ${pad2(n)}`

export const digits = (v: string) => v.replace(/\D/g, '')

export function maskCpf(v: string) {
  return digits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function maskCnpj(v: string) {
  return digits(v)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function maskPhone(v: string) {
  const d = digits(v).slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export const maskCep = (v: string) => digits(v).slice(0, 8).replace(/(\d{5})(\d{1,3})$/, '$1-$2')
