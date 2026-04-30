import { useState, useCallback } from 'react'
import api from '@/lib/axios'

export interface User {
  id: number
  name: string
  email: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false,
    error: null,
  })

  const login = useCallback(async (username: string, password: string) => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      // Sanctum SPA: fetch CSRF cookie first
      await api.get('/sanctum/csrf-cookie')
      const { data } = await api.post('/api/login', { username, password })
      setState({ user: data.user, loading: false, error: null })
      return data.user as User
    } catch (err: unknown) {
      const message = extractError(err)
      setState(s => ({ ...s, loading: false, error: message }))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    await api.post('/api/logout')
    setState({ user: null, loading: false, error: null })
  }, [])

  const fetchUser = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      const { data } = await api.get('/api/user')
      setState({ user: data, loading: false, error: null })
    } catch {
      setState({ user: null, loading: false, error: null })
    }
  }, [])

  return { ...state, login, logout, fetchUser }
}

function extractError(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    err.response &&
    typeof err.response === 'object' &&
    'data' in err.response
  ) {
    const data = (err.response as { data: { errors?: Record<string, string[]>; message?: string } }).data
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ')
    }
    if (data?.message) return data.message
  }
  return 'حدث خطأ غير متوقع.'
}
