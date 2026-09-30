import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/**
 * Cliente HTTP do Hub. O access token fica apenas em memória; o refresh
 * token é um cookie httpOnly renovado automaticamente em respostas 401.
 */
export const api = axios.create({ baseURL: '/api', withCredentials: true })

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let onSessionExpired: (() => void) | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (t: string | null) => {
    accessToken = t
  },
  onExpired: (cb: () => void) => {
    onSessionExpired = cb
  },
}

export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= axios
    .post<{ accessToken: string }>('/api/auth/refresh', null, {
      withCredentials: true,
    })
    .then((r) => {
      accessToken = r.data.accessToken
      return accessToken
    })
    .catch(() => {
      accessToken = null
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as
    | (InternalAxiosRequestConfig & { _retry?: boolean })
    | undefined
  const url = original?.url ?? ''
  const isAuthCall = /\/auth\/(login|refresh|register-admin)/.test(url)
  if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
    original._retry = true
    const token = await refreshAccessToken()
    if (token) {
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    }
    onSessionExpired?.()
  }
  return Promise.reject(error)
})

export interface ApiErrorBody {
  statusCode: number
  message: string | string[]
  code?: string
}

export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as ApiErrorBody | undefined)?.message
    if (Array.isArray(msg)) return msg[0] ?? fallback
    if (msg) return msg
    if (!error.response) return 'Não foi possível conectar ao servidor.'
  }
  return fallback
}

export function getErrorCode(error: unknown) {
  return axios.isAxiosError(error)
    ? (error.response?.data as ApiErrorBody | undefined)?.code
    : undefined
}

export interface Paginated<T> {
  data: T[]
  meta: { page: number; pageSize: number; total: number; totalPages: number }
}
