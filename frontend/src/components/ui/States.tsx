import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, RotateCw, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { getErrorMessage } from '@/lib/api'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Carregando...', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-14 text-sm text-muted', className)}>
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error?: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
        <AlertTriangle size={22} />
      </div>
      <p className="text-sm font-semibold">Não foi possível carregar</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RotateCw} className="mt-5" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-3', className)} />
}

/** Renderiza loading/erro/vazio de uma query de forma padronizada. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry?: () => void
  isEmpty?: boolean
  empty?: ReactNode
  skeleton?: ReactNode
  children: ReactNode
}) {
  if (isLoading) return <>{skeleton ?? <LoadingState />}</>
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (isEmpty) return <>{empty}</>
  return <>{children}</>
}
