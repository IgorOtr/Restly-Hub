import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type Tone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'orange' | 'violet'

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-gray-500/10 text-gray-700 ring-gray-500/20 dark:text-gray-300',
  primary: 'bg-primary-soft text-primary ring-primary/20',
  info: 'bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300',
  success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
  danger: 'bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300',
  orange: 'bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300',
  violet: 'bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300',
}

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-gray-400',
  primary: 'bg-primary',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  orange: 'bg-orange-500',
  violet: 'bg-violet-500',
}

interface BadgeProps {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} />}
      {children}
    </span>
  )
}

export interface StatusMeta {
  label: string
  tone: Tone
}

/** Badge a partir de um mapa centralizado status → {label, tone}. */
export function StatusBadge<T extends string>({ status, map, className }: { status: T; map: Record<T, StatusMeta>; className?: string }) {
  const meta = map[status] ?? { label: status, tone: 'neutral' as Tone }
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  )
}
