import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'
import { Card } from './Card'
import { Skeleton } from './States'
import { toneClasses, type Tone } from './Badge'

interface MetricCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  tone?: Tone
  hint?: ReactNode
  /** Variação percentual em relação ao período anterior. */
  variation?: number | null
  loading?: boolean
  onClick?: () => void
}

export function MetricCard({ label, value, icon: Icon, tone = 'primary', hint, variation, loading, onClick }: MetricCardProps) {
  return (
    <Card className={cn('p-4', onClick && 'cursor-pointer transition-colors hover:border-border-strong')} onClick={onClick}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-inset', toneClasses[tone])}>
            <Icon size={16} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-28" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      )}
      {(hint || variation != null) && !loading && (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
          {variation != null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-medium',
                variation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {variation >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {formatPercent(variation)}
            </span>
          )}
          {hint}
        </div>
      )}
    </Card>
  )
}
