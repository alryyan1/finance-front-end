import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, GuestRoute } from '@/router/guards'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AccountsPage from '@/pages/AccountsPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<ComingSoon title="المعاملات" />} />
          <Route path="/parties" element={<ComingSoon title="الأطراف" />} />
          <Route path="/reports" element={<ComingSoon title="التقارير" />} />
          <Route path="/settings" element={<ComingSoon title="الإعدادات" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
      <p className="text-lg font-medium">{title}</p>
      <p className="text-sm">قريباً</p>
    </div>
  )
}
