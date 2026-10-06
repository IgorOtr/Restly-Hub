import { useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, ChevronDown, Inbox, LayoutDashboard, LogOut, Menu, Settings } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/features/auth/AuthProvider'
import { ThemeToggle } from '@/features/theme/ThemeToggle'
import { Dropdown } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import { LoadingState } from '@/components/ui/States'
import { Logo } from './Logo'
import { leadsApi, leadsKeys } from '@/features/leads/api'

const NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', path: '/clients', icon: Building2 },
  { label: 'Leads', path: '/leads', icon: Inbox },
  { label: 'Configurações', path: '/settings', icon: Settings },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  // Leads novos do site (atualiza a cada minuto).
  const newLeads = useQuery({ queryKey: leadsKeys.newCount, queryFn: leadsApi.newCount, refetchInterval: 60_000 })
  return (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <ul className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              <item.icon size={17} />
              {item.label}
              {item.path === '/leads' && Boolean(newLeads.data) && (
                <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-fg tabular-nums">{newLeads.data}</span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

/** Layout autenticado do Hub (exige sessão). */
export function AppLayout() {
  const { status, user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (status === 'loading') return <LoadingState className="min-h-screen" />
  if (status === 'anonymous' || !user) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-border bg-surface lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 border-r border-border bg-surface shadow-xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6">
        <IconButton icon={Menu} label="Menu" className="lg:hidden" onClick={() => setMobileOpen(true)} />
        <div className="flex-1" />
        <ThemeToggle className="hidden md:inline-flex" />
        <Dropdown
          header={
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          }
          items={[{ label: 'Sair', icon: LogOut, onClick: () => void logout(), danger: true }]}
          trigger={({ toggle }) => (
            <button type="button" onClick={toggle} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                {initials(user.name)}
              </span>
              <span className="hidden text-sm font-medium sm:block">{user.name.split(' ')[0]}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
          )}
        />
      </header>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
