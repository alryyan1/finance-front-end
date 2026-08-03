import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FiscalYear } from '@/api/fiscalYears'
import { whatsappApi, type WhatsAppBusinessPhoneNumber } from '@/api/whatsapp'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useFiscalYears } from '@/context/FiscalYearsContext'
import { Avatar, Button, Dropdown, Flex, Tooltip, Typography, type MenuProps } from 'antd'
import {
  Calendar, CalendarClock, ChevronDown, LockOpen, Lock, LogOut, MessageCircle, Moon, Plus, Sun, TriangleAlert,
} from 'lucide-react'
import { useThemeMode } from '@/context/ThemeModeContext'

const { Text } = Typography

const today = new Date()
const DATE_LABEL = today.toLocaleDateString('ar-SA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

/** Small pill used for at-a-glance status info (date, fiscal period, WhatsApp number) —
 *  keeps the bar readable as a set of distinct chips instead of loose icon+text pairs. */
function StatusChip({
  icon, label, tone, className, onClick,
}: {
  icon: ReactNode
  label: ReactNode
  tone?: 'warning'
  className?: string
  onClick?: () => void
}) {
  return (
    <Flex
      align="center" gap={6}
      className={className}
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        background: tone === 'warning' ? 'var(--ant-color-warning-bg)' : 'var(--ant-color-fill-alter)',
        border: `1px solid ${tone === 'warning' ? 'var(--ant-color-warning-border)' : 'var(--ant-color-border-secondary)'}`,
        color: tone === 'warning' ? 'var(--ant-color-warning)' : 'var(--ant-color-text-secondary)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      {icon}
      <Text style={{ fontSize: 12, color: 'inherit', fontWeight: 500 }}>{label}</Text>
    </Flex>
  )
}

/** Thin vertical rule separating the bar into user / status / actions clusters. */
function VDivider({ className }: { className?: string }) {
  return <div className={className} style={{ width: 1, height: 26, background: 'var(--ant-color-border-secondary)', flexShrink: 0 }} />
}

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
        boxShadow: '0 1px 2px rgba(11,18,32,0.05), 0 2px 10px rgba(11,18,32,0.04)',
        color: 'var(--ant-color-text)',
        height: 64,
        direction: 'rtl',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Flex align="center" gap={14} style={{ height: '100%', padding: '0 20px' }}>
        {/* User avatar + menu */}
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomLeft">
          <Flex
            align="center" gap={8}
            className="topbar-user-trigger"
            style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 999, transition: 'background 0.15s' }}
          >
            <Avatar
              size={34}
              style={{
                background: 'linear-gradient(135deg, #C9A227 0%, #8B6914 100%)',
                color: '#0B1220',
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 0 0 2px var(--ant-color-bg-container), 0 0 0 3px rgba(201,162,39,0.25)',
                flexShrink: 0,
              }}
            >
              {initials}
            </Avatar>
            <div className="topbar-username" style={{ textAlign: 'right' }}>
              <Text style={{ fontWeight: 600, lineHeight: 1.3, display: 'block', fontSize: 13 }}>{user?.name}</Text>
              <Text type="secondary" style={{ fontSize: 11.5 }}>@{user?.username}</Text>
            </div>
            <ChevronDown size={14} className="topbar-username" style={{ opacity: 0.45, flexShrink: 0 }} />
          </Flex>
        </Dropdown>

        <VDivider className="topbar-username" />

        {/* Spacer */}
        <div style={{ flexGrow: 1 }} />

        {/* ── Status chips ── */}
        <Flex align="center" gap={8}>
          <StatusChip
            className="topbar-today-date"
            icon={<Calendar size={14} />}
            label={DATE_LABEL}
          />

          <Tooltip title="اضغط لإدارة الفترات المالية">
            <StatusChip
              className="topbar-fiscal-period"
              onClick={() => navigate('/settings/fiscal-years')}
              tone={activePeriod === null ? 'warning' : undefined}
              icon={
                activePeriod === undefined ? <CalendarClock size={14} />
                  : activePeriod ? <LockOpen size={14} />
                  : <TriangleAlert size={14} />
              }
              label={
                activePeriod === undefined ? '…'
                  : !activePeriod ? 'لا توجد فترة مفتوحة'
                  : todayCovered  ? `${activePeriod.name} • مفتوحة`
                  :                 `${activePeriod.name} • خارج نطاق اليوم`
              }
            />
          </Tooltip>

          {whatsappNumber && (
            <Tooltip title={`اسم الحساب الموثّق: ${whatsappNumber.verified_name}`}>
              <StatusChip
                className="topbar-whatsapp"
                icon={<MessageCircle size={14} color="var(--ant-color-success)" />}
                label={<span dir="ltr">{whatsappNumber.display_phone_number}</span>}
              />
            </Tooltip>
          )}
        </Flex>

        <VDivider className="topbar-today-date" />

        {/* ── Actions ── */}
        <Flex align="center" gap={8}>
          {/* Theme toggle */}
          <Tooltip title={mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}>
            <Button
              type="text" shape="circle" size="middle"
              onClick={toggleMode}
              icon={mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            />
          </Tooltip>

          {/* Quick new entry */}
          <Button
            type="primary"
            size="middle"
            icon={<Plus size={16} />}
            onClick={() => navigate('/transactions/new')}
            className="topbar-new-entry"
            style={{ fontWeight: 600, borderRadius: 8 }}
          >
            قيد جديد
          </Button>

          {/* Mobile: icon only */}
          <Button
            type="text" shape="circle" size="middle"
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
