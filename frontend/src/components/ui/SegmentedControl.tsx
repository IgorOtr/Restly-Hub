import { cn } from '@/lib/cn'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  size?: 'sm' | 'md'
}

export function SegmentedControl<T extends string>({ value, onChange, options, size = 'md' }: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-border bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
