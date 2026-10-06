import { cn } from '@/lib/cn'

/**
 * Logo oficial do Restly. Variante clara/escura trocada por CSS (dark:), então
 * respeita também trechos forçados em um modo. `compact` mostra só o ícone.
 */
export function RestlyMark({ compact, className }: { compact?: boolean; className?: string }) {
  if (compact) return <img src="/brand/icon.png" alt="Restly" className={cn('h-8 w-8', className)} />
  return (
    <>
      <img src="/brand/logo.png" alt="Restly" className={cn('h-8 w-auto dark:hidden', className)} />
      <img src="/brand/logo-dark.png" alt="Restly" className={cn('hidden h-8 w-auto dark:block', className)} />
    </>
  )
}
