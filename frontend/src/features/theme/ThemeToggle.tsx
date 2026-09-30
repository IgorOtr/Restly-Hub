import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useTheme, type ThemePreference } from './ThemeProvider'

const options: { value: ThemePreference; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label="Tema" className={cn('inline-flex rounded-lg border border-border bg-surface-2 p-0.5', className)}>
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
            theme === value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          <Icon size={14} />
          <span className="sr-only sm:not-sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
