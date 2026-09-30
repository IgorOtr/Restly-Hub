import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DropdownItem {
  label: string
  icon?: LucideIcon
  onClick: () => void
  danger?: boolean
  disabled?: boolean
  hidden?: boolean
}

interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  header?: ReactNode
}

export function Dropdown({ trigger, items, align = 'right', header }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const visible = items.filter((i) => !i.hidden)
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {header && <div className="border-b border-border px-3 py-2 mb-1">{header}</div>}
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40',
                item.danger ? 'text-red-600 hover:bg-red-500/10 dark:text-red-400' : 'text-fg hover:bg-surface-2',
              )}
            >
              {item.icon && <item.icon size={15} className={item.danger ? '' : 'text-muted'} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
