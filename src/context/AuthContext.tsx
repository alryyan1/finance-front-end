import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '@/lib/axios'

export interface User {
  id: number
  name: string
  username: string
  email: string
  roles: string[]
  permissions: string[]
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount: silently check if session is still valid
  useEffect(() => {
    api.get('/api/user')
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    await api.get('/sanctum/csrf-cookie')
    const { data } = await api.post('/api/login', { username, password })
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/logout')
    setUser(null)
  }, [])

  const can = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
