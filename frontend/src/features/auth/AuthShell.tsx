import type { ReactNode } from 'react'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { Logo } from '@/components/layout/Logo'

/** Layout das telas sem sessão (login, cadastro inicial, onboarding). */
export function AuthShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className={wide ? 'w-full max-w-3xl' : 'w-full max-w-sm'}>{children}</div>
      </main>
    </div>
  )
}
