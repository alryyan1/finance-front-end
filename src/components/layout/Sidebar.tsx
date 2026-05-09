import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { NavLink, useLocation } from 'react-router-dom'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import type { SvgIconProps } from '@mui/material'
import type { ComponentType } from 'react'

export const SIDEBAR_WIDTH = 240

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SvgIconProps>
  end?: boolean
  children?: { to: string; label: string; icon: ComponentType<SvgIconProps> }[]
}

const navItems: NavItem[] = [
  { to: '/',              label: 'لوحة التحكم',  icon: DashboardOutlinedIcon,  end: true },
  { to: '/accounts',     label: 'الحسابات',      icon: AccountTreeOutlinedIcon },
  { to: '/transactions', label: 'المعاملات',     icon: SwapHorizOutlinedIcon },
  { to: '/cash-vouchers', label: 'إذونات القبض والصرف', icon: AccountBalanceWalletOutlinedIcon },
  { to: '/parties',      label: 'الأطراف',       icon: PeopleOutlinedIcon },
  {
    to: '/reports', label: 'التقارير', icon: AssessmentOutlinedIcon,
    children: [
      { to: '/reports/trial-balance',   label: 'ميزان المراجعة', icon: BalanceOutlinedIcon },
      { to: '/reports/ledger',          label: 'كشف حساب',       icon: MenuBookOutlinedIcon },
      { to: '/reports/income-statement', label: 'قائمة الدخل',       icon: TrendingUpOutlinedIcon },
      { to: '/reports/balance-sheet',   label: 'الميزانية العمومية', icon: AccountBalanceOutlinedIcon },
    ],
  },
  {
    to: '/settings', label: 'الإعدادات', icon: SettingsOutlinedIcon,
    children: [
      { to: '/settings',                  label: 'إعدادات الشركة',    icon: TuneOutlinedIcon },
      { to: '/settings/opening-balances', label: 'الأرصدة الافتتاحية', icon: PlaylistAddOutlinedIcon },
      { to: '/settings/fiscal-years',     label: 'السنوات المالية',    icon: CalendarMonthOutlinedIcon },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const reportsActive  = location.pathname.startsWith('/reports')
  const settingsActive = location.pathname.startsWith('/settings')


  return (
    <Box sx={{
      width: SIDEBAR_WIDTH,
      flexShrink: 0,
      bgcolor: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Logo */}
      <Box sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Box sx={{
          width: 32, height: 32,
          bgcolor: 'primary.main',
          borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 16,
        }}>
          م
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
          المالية
        </Typography>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5, px: 1 }}>
        {navItems.map(({ to, label, icon: Icon, end, children }) => (
          <Box key={to}>
            <NavLink to={to} end={end ?? !children} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 1.5, py: 1.1, mb: 0.5, borderRadius: 1.5, cursor: 'pointer',
                  color: (isActive || (children && (reportsActive || settingsActive))) ? 'white' : 'rgba(255,255,255,0.55)',
                  bgcolor: (isActive || (children && (reportsActive || settingsActive))) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)' },
                }}>
                  <Icon sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: (isActive || (children && (reportsActive || settingsActive))) ? 600 : 400, color: 'inherit' }}>
                    {label}
                  </Typography>
                </Box>
              )}
            </NavLink>

            {/* Sub-items: show when parent section is active */}
            {children && (reportsActive || settingsActive) && (
              <Box sx={{ mb: 0.5 }}>
                {children.map(({ to: childTo, label: childLabel, icon: ChildIcon }) => (
                  <NavLink key={childTo} to={childTo} end style={{ textDecoration: 'none' }}>
                    {({ isActive }) => (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 1.5, py: 0.85, mb: 0.25, borderRadius: 1.5, cursor: 'pointer',
                        pr: 3.5,
                        color: isActive ? 'white' : 'rgba(255,255,255,0.45)',
                        bgcolor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                        transition: 'all 0.15s ease',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)' },
                      }}>
                        <ChildIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: isActive ? 600 : 400, color: 'inherit' }}>
                          {childLabel}
                        </Typography>
                      </Box>
                    )}
                  </NavLink>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
