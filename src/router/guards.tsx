import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Flex, Spin } from 'antd'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

function FullPageSpinner() {
  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', background: 'var(--ant-color-bg-layout)' }}>
      <Spin size="large" />
    </Flex>
  )
}
