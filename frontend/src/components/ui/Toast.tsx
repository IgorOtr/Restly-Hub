import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const icons = { success: CheckCircle2, error: XCircle, info: Info }
const colors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-sky-500',
}

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => setItems((all) => all.filter((t) => t.id !== id)), [])
  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++seq
      setItems((all) => [...all.slice(-3), { id, type, message }])
      setTimeout(() => remove(id), type === 'error' ? 6000 : 3500)
    },
    [remove],
  )

  const [api] = useState<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }))

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg"
            >
              <Icon size={18} className={cn('mt-0.5 shrink-0', colors[t.type])} />
              <p className="flex-1 text-fg">{t.message}</p>
              <button type="button" aria-label="Fechar" onClick={() => remove(t.id)} className="text-muted hover:text-fg">
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
