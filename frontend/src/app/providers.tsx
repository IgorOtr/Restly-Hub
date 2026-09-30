import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ThemeProvider } from '@/features/theme/ThemeProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ToastProvider } from '@/components/ui/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined
        return status !== undefined && status < 500 ? false : count < 2
      },
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
