import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const control =
  'w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg shadow-xs transition-colors placeholder:text-subtle ' +
  'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70 ' +
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/20'

interface FieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, error, hint, required, className, htmlFor, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  ref?: Ref<HTMLInputElement>
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return <input aria-invalid={invalid || undefined} className={cn(control, 'h-9', className)} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  ref?: Ref<HTMLTextAreaElement>
}

export function Textarea({ className, invalid, rows = 3, ...rest }: TextareaProps) {
  return <textarea rows={rows} aria-invalid={invalid || undefined} className={cn(control, 'py-2', className)} {...rest} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  ref?: Ref<HTMLSelectElement>
}

export function Select({ className, invalid, children, ...rest }: SelectProps) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(control, 'select-control h-9 cursor-pointer pr-9', className)} {...rest}>
      {children}
    </select>
  )
}
