import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Tooltip } from './Tooltip'

type Tone = 'neutral' | 'primary' | 'danger' | 'success'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  label: string
  tone?: Tone
  size?: 'sm' | 'md'
}

const tones: Record<Tone, string> = {
  neutral: 'text-muted hover:bg-surface-2 hover:text-fg',
  primary: 'text-primary hover:bg-primary-soft',
  danger: 'text-muted hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
  success: 'text-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
}

/** Botão só com ícone; o rótulo aparece como tooltip e aria-label. */
export function IconButton({ icon: Icon, label, tone = 'neutral', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <button
        type={type}
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
          tones[tone],
          className,
        )}
        {...rest}
      >
        <Icon size={size === 'sm' ? 15 : 17} />
      </button>
    </Tooltip>
  )
}
