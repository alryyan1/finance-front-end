import { useState } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'
import { NavLink, useLocation } from 'react-router-dom'

import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import BalanceOutlinedIcon from '@mui/icons-material/BalanceOutlined'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import CloudSyncOutlinedIcon from '@mui/icons-material/CloudSyncOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import type { SvgIconProps } from '@mui/material'
import type { ComponentType } from 'react'

export const SIDEBAR_WIDTH = 260

// ── Types ────────────────────────────────────────────────────────────────────

interface NavChild {
  to: string
  label: string
  icon: ComponentType<SvgIconProps>
}

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SvgIconProps>
  end?: boolean
  children?: NavChild[]
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

// ── Navigation structure ──────────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'لوحة التحكم', icon: DashboardOutlinedIcon, end: true },
    ],
  },
  {
    label: 'المحاسبة',
    items: [
      { to: '/accounts',     label: 'الحسابات',              icon: AccountTreeOutlinedIcon },
      { to: '/transactions', label: 'القيود المحاسبية',      icon: SwapHorizOutlinedIcon },
      { to: '/cash-vouchers', label: 'إذونات القبض والصرف',  icon: AccountBalanceWalletOutlinedIcon },
      { to: '/petty-cash',   label: 'صندوق النثريات',        icon: SavingsOutlinedIcon },
      { to: '/parties',      label: 'الأطراف',               icon: PeopleOutlinedIcon },
    ],
  },
  {
    label: 'التقارير',
    items: [
      {
        to: '/reports', label: 'التقارير', icon: AssessmentOutlinedIcon,
        children: [
          { to: '/reports/trial-balance',    label: 'ميزان المراجعة',     icon: BalanceOutlinedIcon },
          { to: '/reports/ledger',           label: 'كشف حساب',           icon: MenuBookOutlinedIcon },
          { to: '/reports/income-statement', label: 'قائمة الدخل',        icon: TrendingUpOutlinedIcon },
          { to: '/reports/balance-sheet',    label: 'الميزانية العمومية', icon: AccountBalanceOutlinedIcon },
        ],
      },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { to: '/users',  label: 'المستخدمون',      icon: ManageAccountsOutlinedIcon },
      { to: '/backup', label: 'النسخ الاحتياطية', icon: CloudSyncOutlinedIcon },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      {
        to: '/settings', label: 'الإعدادات', icon: SettingsOutlinedIcon,
        children: [
          { to: '/settings',                  label: 'إعدادات الشركة',     icon: TuneOutlinedIcon },
          { to: '/settings/opening-balances', label: 'الأرصدة الافتتاحية', icon: PlaylistAddOutlinedIcon },
          { to: '/settings/fiscal-years',     label: 'السنوات المالية',    icon: CalendarMonthOutlinedIcon },
        ],
      },
    ],
  },
]

// ── Colours (always dark sidebar) ────────────────────────────────────────────

const BG          = '#0f172a'
const BG_SECTION  = 'rgba(255,255,255,0.03)'
const ACCENT      = '#3b82f6'          // blue-500
const ACTIVE_BG   = 'rgba(59,130,246,0.15)'
const HOVER_BG    = 'rgba(255,255,255,0.06)'
const TEXT_DIM    = 'rgba(255,255,255,0.45)'
const TEXT_MID    = 'rgba(255,255,255,0.70)'
const TEXT_FULL   = '#ffffff'
const DIVIDER     = 'rgba(255,255,255,0.07)'

// ── Sub-item ─────────────────────────────────────────────────────────────────

function SubItem({ to, label, icon: Icon }: NavChild) {
  return (
    <NavLink to={to} end style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Box sx={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 1.5,
          px: 2, py: 0.9, mx: 1, mb: 0.25, borderRadius: 1.5, cursor: 'pointer',
          pl: 4,
          color: isActive ? TEXT_FULL : TEXT_DIM,
          bgcolor: isActive ? ACTIVE_BG : 'transparent',
          transition: 'all 0.15s',
          '&:hover': { bgcolor: HOVER_BG, color: TEXT_MID },
          ...(isActive && {
            '&::before': {
              content: '""',
              position: 'absolute',
              right: 0, top: '20%', bottom: '20%',
              width: 3, borderRadius: '3px 0 0 3px',
              bgcolor: ACCENT,
            },
          }),
        }}>
          <Icon sx={{ fontSize: 15, opacity: isActive ? 1 : 0.7 }} />
          <Typography variant="caption" sx={{ fontWeight: isActive ? 600 : 400, color: 'inherit', fontSize: 12.5 }}>
            {label}
          </Typography>
        </Box>
      )}
    </NavLink>
  )
}

// ── Main item ─────────────────────────────────────────────────────────────────

function NavRow({
  item, sectionOpen, onToggle,
}: {
  item: NavItem
  sectionOpen: boolean
  onToggle: () => void
}) {
  const location = useLocation()
  const hasChildren = !!item.children
  const sectionActive = hasChildren && location.pathname.startsWith(item.to)
  const isExpanded = hasChildren && sectionOpen

  return (
    <Box>
      {hasChildren ? (
        // Collapsible parent — no NavLink, just a toggle button
        <Box
          onClick={onToggle}
          sx={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 1.5,
            px: 1.5, py: 1.1, mx: 0.5, mb: 0.25, borderRadius: 1.5, cursor: 'pointer',
            color: sectionActive ? TEXT_FULL : TEXT_MID,
            bgcolor: sectionActive ? ACTIVE_BG : 'transparent',
            transition: 'all 0.15s',
            '&:hover': { bgcolor: HOVER_BG, color: TEXT_FULL },
            userSelect: 'none',
          }}
        >
          <item.icon sx={{ fontSize: 19 }} />
          <Typography variant="body2" sx={{ flex: 1, fontWeight: sectionActive ? 600 : 400, color: 'inherit', fontSize: 13.5 }}>
            {item.label}
          </Typography>
          {isExpanded
            ? <ExpandLessIcon sx={{ fontSize: 16, opacity: 0.6 }} />
            : <ExpandMoreIcon sx={{ fontSize: 16, opacity: 0.4 }} />
          }
        </Box>
      ) : (
        // Regular NavLink
        <NavLink to={item.to} end={item.end ?? true} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <Box sx={{
              position: 'relative',
              display: 'flex', alignItems: 'center', gap: 1.5,
              px: 1.5, py: 1.1, mx: 0.5, mb: 0.25, borderRadius: 1.5, cursor: 'pointer',
              color: isActive ? TEXT_FULL : TEXT_MID,
              bgcolor: isActive ? ACTIVE_BG : 'transparent',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: HOVER_BG, color: TEXT_FULL },
              ...(isActive && {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  right: 0, top: '18%', bottom: '18%',
                  width: 3, borderRadius: '3px 0 0 3px',
                  bgcolor: ACCENT,
                },
              }),
            }}>
              <item.icon sx={{ fontSize: 19 }} />
              <Typography variant="body2" sx={{ flex: 1, fontWeight: isActive ? 600 : 400, color: 'inherit', fontSize: 13.5 }}>
                {item.label}
              </Typography>
            </Box>
          )}
        </NavLink>
      )}

      {/* Children */}
      {hasChildren && (
        <Collapse in={isExpanded} timeout={200} unmountOnExit={false}>
          <Box sx={{ mb: 0.5 }}>
            {item.children!.map(child => (
              <SubItem key={child.to} {...child} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const location = useLocation()

  // Track open state for each collapsible group independently
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    navGroups.forEach(g => g.items.forEach(item => {
      if (item.children) {
        init[item.to] = location.pathname.startsWith(item.to)
      }
    }))
    return init
  })

  const toggle = (to: string) => setOpen(p => ({ ...p, [to]: !p[to] }))

  return (
    <Box sx={{
      width: SIDEBAR_WIDTH,
      flexShrink: 0,
      bgcolor: BG,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: `1px solid ${DIVIDER}`,
    }}>
      {/* ── Logo ── */}
      <Box sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        borderBottom: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        <Box sx={{
          width: 34, height: 34,
          background: `linear-gradient(135deg, ${ACCENT} 0%, #6366f1 100%)`,
          borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px rgba(59,130,246,0.4)`,
        }}>
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 15, lineHeight: 1 }}>م</Typography>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 15, color: TEXT_FULL, lineHeight: 1.2 }}>
            المالية
          </Typography>
          <Typography sx={{ fontSize: 10, color: TEXT_DIM, lineHeight: 1 }}>
            نظام المحاسبة
          </Typography>
        </Box>
      </Box>

      {/* ── Nav ── */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5, px: 0.5,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
      }}>
        {navGroups.map((group, gi) => (
          <Box key={gi} sx={{ mb: 0.5 }}>
            {/* Section label */}
            {group.label && (
              <Typography sx={{
                px: 2, pt: gi === 0 ? 0 : 1.5, pb: 0.5,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: TEXT_DIM, textTransform: 'uppercase',
              }}>
                {group.label}
              </Typography>
            )}

            <Box sx={{
              ...(group.label && {
                bgcolor: BG_SECTION,
                borderRadius: 2,
                border: `1px solid ${DIVIDER}`,
                p: 0.5,
                mb: 1,
              }),
            }}>
              {group.items.map(item => (
                <NavRow
                  key={item.to}
                  item={item}
                  sectionOpen={!!open[item.to]}
                  onToggle={() => toggle(item.to)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        px: 2, py: 1.5,
        borderTop: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        <Typography sx={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center' }}>
          v1.0 · نظام المحاسبة العربي
        </Typography>
      </Box>
    </Box>
  )
}
