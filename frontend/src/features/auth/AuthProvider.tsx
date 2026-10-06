import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, refreshAccessToken, tokenStore } from '@/lib/api'

type Status = 'loading' | 'anonymous' | 'authenticated'

export interface HubUser {
  id: string
  name: string
  email: string
}

interface AuthContextValue {
  status: Status
  user: HubUser | null
  /** 'mfa' quando a conta exige o código do app (segundo passo: verifyMfa). */
  login: (email: string, password: string) => Promise<{ mfaToken: string } | null>
  verifyMfa: (mfaToken: string, code: string) => Promise<void>
  registerAdmin: (data: { name: string; email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<HubUser | null>(null)

  const loadUser = useCallback(async () => {
    const { data } = await api.get<HubUser>('/auth/me')
    setUser(data)
    setStatus('authenticated')
  }, [])

  const reset = useCallback(() => {
    tokenStore.set(null)
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    tokenStore.onExpired(reset)
    refreshAccessToken()
      .then((token) => (token ? loadUser() : setStatus('anonymous')))
      .catch(() => setStatus('anonymous'))
  }, [loadUser, reset])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => {
        const { data } = await api.post<{ accessToken: string } | { mfaRequired: true; mfaToken: string }>('/auth/login', { email, password })
        if ('mfaRequired' in data) return { mfaToken: data.mfaToken }
        tokenStore.set(data.accessToken)
        await loadUser()
        return null
      },
      verifyMfa: async (mfaToken, code) => {
        const { data } = await api.post<{ accessToken: string }>('/auth/login/2fa', { mfaToken, code })
        tokenStore.set(data.accessToken)
        await loadUser()
      },
      registerAdmin: async (payload) => {
        const { data } = await api.post<{ accessToken: string }>('/auth/register-admin', payload)
        tokenStore.set(data.accessToken)
        await loadUser()
      },
      logout: async () => {
        await api.post('/auth/logout').catch(() => undefined)
        reset()
      },
    }),
    [status, user, loadUser, reset],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
