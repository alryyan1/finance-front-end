import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, Drawer, Flex, Typography } from 'antd'
import {
  ChevronDown, ChevronUp, LogOut, Moon, SlidersHorizontal, Sun, ShieldCheck, UserCog,
} from 'lucide-react'
import { navGroups, type NavChild, type NavItem } from './navConfig'
import { useAuth } from '@/context/AuthContext'
import { useThemeMode } from '@/context/ThemeModeContext'
import { useFiscalYears } from '@/context/FiscalYearsContext'

const { Text } = Typography

const ACCENT = '#C9A227'

const today = new Date().toLocaleDateString('ar-SA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

interface Props {
  open: boolean
  onClose: () => void
}

function SubItem({ to, label, icon: Icon, onNavigate }: NavChild & { onNavigate: () => void }) {
  return (
    <NavLink to={to} end onClick={onNavigate} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Flex
          align="center" gap={12}
          style={{
            padding: '10px 14px', margin: '0 8px 2px', paddingInlineStart: 34,
            borderRadius: 8,
            color: isActive ? ACCENT : 'var(--ant-color-text)',
            background: isActive ? 'var(--ant-color-fill-alter)' : 'transparent',
            fontWeight: isActive ? 600 : 400,
          }}
        >
          <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
          <span style={{ fontSize: 13.5 }}>{label}</span>
        </Flex>
      )}
    </NavLink>
  )
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const location = useLocation()
  const hasChildren = !!item.children
  const sectionActive = hasChildren && location.pathname.startsWith(item.to)
  const [open, setOpen] = useState(sectionActive || !!item.alwaysOpen)
  const isExpanded = hasChildren && (item.alwaysOpen || open)

  const rowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', margin: '0 8px 2px', borderRadius: 8,
    color: active ? ACCENT : 'var(--ant-color-text)',
    background: active ? 'var(--ant-color-fill-alter)' : 'transparent',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
  })

  return (
    <div>
      {hasChildren ? (
        <div
          onClick={item.alwaysOpen ? undefined : () => setOpen(o => !o)}
          style={{ ...rowStyle(sectionActive), cursor: item.alwaysOpen ? 'default' : 'pointer', userSelect: 'none' }}
        >
          <item.icon size={19} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
          {!item.alwaysOpen && (
            isExpanded ? <ChevronUp size={16} style={{ opacity: 0.6 }} /> : <ChevronDown size={16} style={{ opacity: 0.4 }} />
          )}
        </div>
      ) : (
        <NavLink to={item.to} end={item.end ?? true} onClick={onNavigate} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div style={rowStyle(isActive)}>
              <item.icon size={19} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
            </div>
          )}
        </NavLink>
      )}

      {hasChildren && (
        <div style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
          overflow: 'hidden',
        }}>
          <div style={{ minHeight: 0, marginBottom: isExpanded ? 4 : 0 }}>
            {item.children!.map(child => (
              <SubItem key={child.to} {...child} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FooterAction({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <Flex
      align="center" gap={12} onClick={onClick}
      style={{
        padding: '11px 14px', borderRadius: 8, cursor: 'pointer',
        color: danger ? 'var(--ant-color-error)' : 'var(--ant-color-text)',
      }}
    >
      {icon}
      <span style={{ fontSize: 14 }}>{label}</span>
    </Flex>
  )
}

export default function MobileNavDrawer({ open, onClose }: Props) {
  const { user, logout, can } = useAuth()
  const { mode, toggleMode } = useThemeMode()
  const { years } = useFiscalYears()
  const navigate = useNavigate()
  const location = useLocation()

  // Close whenever the route changes.
  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const activePeriod = years.find(y => y.status === 'open') ?? null

  const initials = user?.name
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'

  const go = (to: string) => { onClose(); navigate(to) }

  const handleLogout = async () => {
    onClose()
    await logout()
    navigate('/login')
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={288}
      closable={false}
      styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header — user + status */}
      <div style={{ padding: 16, borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
        <Flex align="center" gap={12}>
          <Avatar
            size={40}
            style={{
              background: 'linear-gradient(135deg, #C9A227 0%, #8B6914 100%)',
              color: '#0B1220', fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ display: 'block', fontSize: 14, lineHeight: 1.3 }}>{user?.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
          </div>
        </Flex>
        <Flex vertical gap={2} style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{today}</Text>
          <Text
            style={{ fontSize: 12, color: activePeriod ? 'var(--ant-color-success)' : 'var(--ant-color-warning)', cursor: 'pointer' }}
            onClick={() => go('/settings/fiscal-years')}
          >
            {activePeriod ? `${activePeriod.name} • فترة مفتوحة` : 'لا توجد فترة مفتوحة'}
          </Text>
        </Flex>
      </div>

      {/* Nav tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 0' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            {group.label && (
              <div style={{
                padding: '10px 22px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--ant-color-text-tertiary)',
              }}>
                {group.label}
              </div>
            )}
            {group.items.map(item => (
              <NavRow key={item.to} item={item} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </div>

      {/* Footer — settings / theme / logout */}
      <div style={{ borderTop: '1px solid var(--ant-color-border-secondary)', padding: '8px 8px' }}>
        <FooterAction
          icon={<UserCog size={18} />} label="المستخدمون"
          onClick={() => go('/users')}
        />
        {can('roles.view') && (
          <FooterAction
            icon={<ShieldCheck size={18} />} label="الأدوار والصلاحيات"
            onClick={() => go('/roles')}
          />
        )}
        <FooterAction
          icon={<SlidersHorizontal size={18} />} label="الإعدادات"
          onClick={() => go('/settings')}
        />
        <FooterAction
          icon={mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          label={mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
          onClick={toggleMode}
        />
        <FooterAction icon={<LogOut size={18} />} label="تسجيل الخروج" onClick={handleLogout} danger />
      </div>
    </Drawer>
  )
}
