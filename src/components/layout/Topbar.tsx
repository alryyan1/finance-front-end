import { useEffect, useMemo, useState } from 'react'
import type { FiscalYear } from '@/api/fiscalYears'
import { whatsappApi, type WhatsAppBusinessPhoneNumber } from '@/api/whatsapp'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useFiscalYears } from '@/context/FiscalYearsContext'
import { Avatar, Button, Dropdown, Flex, Tooltip, Typography, type MenuProps } from 'antd'
import {
  Calendar, CalendarClock, LockOpen, Lock, LogOut, MessageCircle, Moon, Plus, Sun, TriangleAlert,
} from 'lucide-react'
import { useThemeMode } from '@/context/ThemeModeContext'

const { Text } = Typography

const today = new Date()
const DATE_LABEL = today.toLocaleDateString('ar-SA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function Topbar() {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useThemeMode()
  const navigate = useNavigate()
  const { years } = useFiscalYears()
  const [whatsappNumber, setWhatsappNumber] = useState<WhatsAppBusinessPhoneNumber | null>(null)

  useEffect(() => {
    whatsappApi.getPhoneNumber().then(setWhatsappNumber).catch(() => setWhatsappNumber(null))
  }, [])

  const activePeriod = useMemo<FiscalYear | null>(() => {
    return years.find(y => y.status === 'open') ?? null
  }, [years])

  const todayCovered = useMemo<boolean>(() => {
    if (!activePeriod) return false
    const d = new Date(); const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    return activePeriod.start_date <= iso && activePeriod.end_date >= iso
  }, [activePeriod])

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <Flex vertical style={{ padding: '4px 0' }}>
          <Text style={{ fontWeight: 600 }}>{user?.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
        </Flex>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...(activePeriod !== undefined ? [{
      key: 'period',
      label: activePeriod ? activePeriod.name : 'لا توجد فترة مفتوحة',
      icon: activePeriod ? <LockOpen size={16} color="var(--ant-color-success)" /> : <Lock size={16} color="var(--ant-color-warning)" />,
      onClick: () => navigate('/fiscal-years'),
    }] : []),
    { type: 'divider' },
    {
      key: 'logout',
      label: 'تسجيل الخروج',
      icon: <LogOut size={16} />,
      danger: true,
      onClick: handleLogout,
    },
  ]

  return (
    <header
      style={{
        background: 'var(--ant-color-bg-container)',
        borderBottom: '1px solid rgba(201,162,39,0.25)',
        boxShadow: '0 1px 3px rgba(11,18,32,0.06)',
        color: 'var(--ant-color-text)',
        height: 64,
        direction: 'rtl',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Flex align="center" gap={12} style={{ height: '100%', padding: '0 24px' }}>
        {/* User avatar + menu */}
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomLeft">
          <Flex align="center" gap={8} style={{ cursor: 'pointer' }}>
            <div className="topbar-username" style={{ textAlign: 'right' }}>
              <Text style={{ fontWeight: 500, lineHeight: 1.3, display: 'block' }}>{user?.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>@{user?.username}</Text>
            </div>
            <Avatar
              size={34}
              style={{
                background: 'linear-gradient(135deg, #C9A227 0%, #8B6914 100%)',
                color: '#0B1220',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
          </Flex>
        </Dropdown>

        {/* Spacer */}
        <div style={{ flexGrow: 1 }} />

        {/* ── Info items ── */}
        <Flex align="center" gap={22}>
          {/* Today's date */}
          <Flex align="center" gap={4} className="topbar-today-date" style={{ color: 'var(--ant-color-text-secondary)' }}>
            <Calendar size={15} />
            <Text style={{ fontSize: 12 }}>{DATE_LABEL}</Text>
          </Flex>

          {/* Active fiscal period */}
          <Tooltip title="اضغط لإدارة الفترات المالية">
            <Flex
              align="center" gap={4}
              className="topbar-fiscal-period"
              onClick={() => navigate('/settings/fiscal-years')}
              style={{ color: 'var(--ant-color-text-secondary)', cursor: 'pointer' }}
            >
              {activePeriod === undefined
                ? <CalendarClock size={15} />
                : activePeriod
                  ? <LockOpen size={15} />
                  : <TriangleAlert size={15} />}
              <Text style={{ fontSize: 12 }}>
                {activePeriod === undefined ? '…'
                  : !activePeriod       ? 'لا توجد فترة مفتوحة'
                  : todayCovered        ? `${activePeriod.name} • مفتوحة`
                  :                       `${activePeriod.name} • خارج نطاق اليوم`}
              </Text>
            </Flex>
          </Tooltip>

          {/* WhatsApp business sending number */}
          {whatsappNumber && (
            <Tooltip title={`اسم الحساب الموثّق: ${whatsappNumber.verified_name}`}>
              <Flex align="center" gap={4} className="topbar-whatsapp" style={{ color: 'var(--ant-color-text-secondary)' }}>
                <MessageCircle size={15} />
                <Text style={{ fontSize: 12 }} dir="ltr">{whatsappNumber.display_phone_number}</Text>
              </Flex>
            </Tooltip>
          )}

          {/* Theme toggle */}
          <Tooltip title={mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}>
            <Button
              type="text" shape="circle" size="small"
              onClick={toggleMode}
              icon={mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            />
          </Tooltip>

          {/* Quick new entry */}
          <Button
            type="primary"
            size="small"
            icon={<Plus size={16} />}
            onClick={() => navigate('/transactions/new')}
            className="topbar-new-entry"
            style={{ fontWeight: 600 }}
          >
            قيد جديد
          </Button>

          {/* Mobile: icon only */}
          <Button
            type="text" shape="circle" size="small"
            className="topbar-new-entry-mobile"
            color="primary" variant="text"
            onClick={() => navigate('/transactions/new')}
            icon={<Plus size={18} />}
          />
        </Flex>
      </Flex>
    </header>
  )
}
