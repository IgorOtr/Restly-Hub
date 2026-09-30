import type { ButtonHTMLAttributes, Ref } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'danger-ghost'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: Size
  icon?: LucideIcon
  loading?: boolean
  ref?: Ref<HTMLButtonElement>
}

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm',
  secondary: 'border border-border bg-surface text-fg hover:bg-surface-2 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
  'danger-ghost': 'text-red-600 hover:bg-red-500/10 dark:text-red-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
      ) : (
        Icon && <Icon size={size === 'sm' ? 14 : 16} />
      )}
      {children}
    </button>
  )
}
