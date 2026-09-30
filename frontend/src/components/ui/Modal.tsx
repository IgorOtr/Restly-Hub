import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  size?: Size
  children: ReactNode
  footer?: ReactNode
}

const sizes: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
}

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onEscape()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, onEscape])
}

/**
 * Bloqueia a rolagem da página enquanto houver ao menos um modal/painel aberto.
 * Usa contador global: modais sobrepostos ou fechados fora de ordem não deixam
 * a página travada.
 */
let bodyLocks = 0

export function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    bodyLocks += 1
    document.body.style.overflow = 'hidden'
    return () => {
      bodyLocks = Math.max(0, bodyLocks - 1)
      if (bodyLocks === 0) document.body.style.overflow = ''
    }
  }, [active])
}

/** Modal centralizado com cabeçalho, corpo rolável e rodapé fixo. */
export function Modal({ open, onClose, title, description, size = 'md', children, footer }: ModalProps) {
  const titleId = useId()
  useEscape(open, onClose)
  useBodyLock(open)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-2xl border border-border bg-surface shadow-2xl',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
