import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingState } from '@/components/ui/States'
import { useAuth } from '@/features/auth/AuthProvider'

function page<T>(loader: () => Promise<T>, name: keyof T) {
  const Component = lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })))
  return (
    <Suspense fallback={<LoadingState />}>
      <Component />
    </Suspense>
  )
}

function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingState className="min-h-screen" />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <>{children}</>
}

export const router = createBrowserRouter([
  { path: '/login', element: <RedirectIfAuthenticated>{page(() => import('@/features/auth/LoginPage'), 'LoginPage')}</RedirectIfAuthenticated> },
  { path: '/setup', element: <RedirectIfAuthenticated>{page(() => import('@/features/auth/SetupAdminPage'), 'SetupAdminPage')}</RedirectIfAuthenticated> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage') },
      { path: 'clients', element: page(() => import('@/features/clients/ClientsPage'), 'ClientsPage') },
      { path: 'clients/:id', element: page(() => import('@/features/clients/ClientDetailPage'), 'ClientDetailPage') },
      { path: 'settings', element: page(() => import('@/features/settings/SettingsPage'), 'SettingsPage') },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
