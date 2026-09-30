import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'restly-theme'

interface ThemeContextValue {
  theme: ThemePreference
  resolved: 'light' | 'dark'
  setTheme: (t: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function readStored(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStored)
  const [systemDark, setSystemDark] = useState(() => media().matches)

  useEffect(() => {
    const m = media()
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    m.addEventListener('change', handler)
    return () => m.removeEventListener('change', handler)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const setTheme = (t: ThemePreference) => {
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* armazenamento indisponível */
    }
  }

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme fora do ThemeProvider')
  return ctx
}
