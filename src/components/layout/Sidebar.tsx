import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import {
  LayoutDashboard as LayoutDashboardIcon,
  ListTree as ListTreeIcon,
  ArrowLeftRight as ArrowLeftRightIcon,
  PiggyBank as PiggyBankIcon,
  Users as UsersIcon,
  BarChart3 as BarChart3Icon,
  Scale as ScaleIcon,
  BookOpen as BookOpenIcon,
  TrendingUp as TrendingUpIcon,
  Landmark as LandmarkIcon,
  Coins as CoinsIcon,
  UserCog as UserCogIcon,
  DatabaseBackup as DatabaseBackupIcon,
  Settings as SettingsIcon,
  SlidersHorizontal as SlidersHorizontalIcon,
  ListPlus as ListPlusIcon,
  CalendarDays as CalendarDaysIcon,
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
  Building2 as Building2Icon,
  Sparkles as SparklesIcon,
  type LucideIcon,
} from 'lucide-react'

export const SIDEBAR_WIDTH = 260

// ── Types ────────────────────────────────────────────────────────────────────

interface NavChild {
  to: string
  label: string
  icon: LucideIcon
}

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
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
      { to: '/', label: 'لوحة التحكم', icon: LayoutDashboardIcon, end: true },
      { to: '/ai-assistant', label: 'المساعد الذكي', icon: SparklesIcon },
    ],
  },
  {
    label: 'المحاسبة',
    items: [
      { to: '/accounts',     label: 'الحسابات',              icon: ListTreeIcon },
      { to: '/transactions', label: 'القيود المحاسبية',      icon: ArrowLeftRightIcon },
      { to: '/petty-cash',   label: 'صندوق النثريات',        icon: PiggyBankIcon },
      { to: '/parties',      label: 'الأطراف',               icon: UsersIcon },
      { to: '/prepaid-rent', label: 'الإيجار المقدم',        icon: Building2Icon },
    ],
  },
  {
    label: 'التقارير',
    items: [
      {
        to: '/reports', label: 'التقارير', icon: BarChart3Icon,
        children: [
          { to: '/reports/trial-balance',    label: 'ميزان المراجعة',     icon: ScaleIcon },
          { to: '/reports/ledger',           label: 'كشف حساب',           icon: BookOpenIcon },
          { to: '/reports/income-statement', label: 'قائمة الدخل',        icon: TrendingUpIcon },
          { to: '/reports/balance-sheet',    label: 'الميزانية العمومية', icon: LandmarkIcon },
          { to: '/reports/statement-of-equity', label: 'قائمة حقوق الملكية', icon: CoinsIcon },
        ],
      },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { to: '/users',  label: 'المستخدمون',      icon: UserCogIcon },
      { to: '/backup', label: 'النسخ الاحتياطية', icon: DatabaseBackupIcon },
    ],
  },
  {
    label: 'الإعدادات',
    items: [
      {
        to: '/settings', label: 'الإعدادات', icon: SettingsIcon,
        children: [
          { to: '/settings',                  label: 'إعدادات الشركة',     icon: SlidersHorizontalIcon },
          { to: '/settings/opening-balances', label: 'الأرصدة الافتتاحية', icon: ListPlusIcon },
          { to: '/settings/fiscal-years',     label: 'السنوات المالية',    icon: CalendarDaysIcon },
        ],
      },
    ],
  },
]

// ── Colours (always dark navy-and-gold sidebar) ─────────────────────────────

const BG          = '#0B1220'
const BG_SECTION  = 'rgba(255,255,255,0.025)'
const ACCENT      = '#C9A227'          // gold
const ACCENT_DEEP = '#8B6914'          // deep gold, for gradients
const ACTIVE_BG   = 'rgba(201,162,39,0.14)'
const HOVER_BG    = 'rgba(255,255,255,0.05)'
const TEXT_DIM    = 'rgba(255,255,255,0.42)'
const TEXT_MID    = 'rgba(255,255,255,0.72)'
const TEXT_FULL   = '#ffffff'
const DIVIDER     = 'rgba(201,162,39,0.10)'

// ── Sub-item ─────────────────────────────────────────────────────────────────

function SubItem({ to, label, icon: Icon }: NavChild) {
  return (
    <NavLink to={to} end style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '7px 16px', margin: '0 8px 2px', paddingRight: 32, borderRadius: 6, cursor: 'pointer',
            color: isActive ? TEXT_FULL : TEXT_DIM,
            background: isActive ? ACTIVE_BG : 'transparent',
            transition: 'background 0.15s, color 0.15s',
          }}>
          <Icon size={15} style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
          <span style={{ fontWeight: isActive ? 600 : 400, color: 'inherit', fontSize: 12.5 }}>
            {label}
          </span>
          {isActive && (
            <span style={{
              position: 'absolute', right: 0, top: '20%', bottom: '20%',
              width: 3, borderRadius: '3px 0 0 3px', background: ACCENT,
              boxShadow: `0 0 6px ${ACCENT}80`,
            }} />
          )}
        </div>
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
    <div>
      {hasChildren ? (
        // Collapsible parent — no NavLink, just a toggle button
        <div
          onClick={onToggle}
          className={`sidebar-nav-item${sectionActive ? ' is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 12px', margin: '0 4px 2px', borderRadius: 6, cursor: 'pointer',
            color: sectionActive ? TEXT_FULL : TEXT_MID,
            background: sectionActive ? ACTIVE_BG : 'transparent',
            transition: 'background 0.15s, color 0.15s',
            userSelect: 'none',
          }}
        >
          <item.icon size={19} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: sectionActive ? 600 : 400, color: 'inherit', fontSize: 13.5 }}>
            {item.label}
          </span>
          {isExpanded
            ? <ChevronUpIcon size={16} style={{ opacity: 0.6 }} />
            : <ChevronDownIcon size={16} style={{ opacity: 0.4 }} />}
        </div>
      ) : (
        // Regular NavLink
        <NavLink to={item.to} end={item.end ?? true} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <div
              className={`sidebar-nav-item${isActive ? ' is-active' : ''}`}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 12px', margin: '0 4px 2px', borderRadius: 6, cursor: 'pointer',
                color: isActive ? TEXT_FULL : TEXT_MID,
                background: isActive ? ACTIVE_BG : 'transparent',
                transition: 'background 0.15s, color 0.15s',
              }}>
              <item.icon size={19} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: isActive ? 600 : 400, color: 'inherit', fontSize: 13.5 }}>
                {item.label}
              </span>
              {isActive && (
                <span style={{
                  position: 'absolute', right: 0, top: '18%', bottom: '18%',
                  width: 3, borderRadius: '3px 0 0 3px', background: ACCENT,
                  boxShadow: `0 0 6px ${ACCENT}80`,
                }} />
              )}
            </div>
          )}
        </NavLink>
      )}

      {/* Children */}
      {hasChildren && (
        <div style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.2s ease',
          overflow: 'hidden',
        }}>
          <div style={{ minHeight: 0, marginBottom: isExpanded ? 4 : 0 }}>
            {item.children!.map(child => (
              <SubItem key={child.to} {...child} />
            ))}
          </div>
        </div>
      )}
    </div>
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
    <div style={{
      width: SIDEBAR_WIDTH,
      flexShrink: 0,
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: `1px solid ${DIVIDER}`,
    }}>
      {/* ── Logo ── */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 20px',
        borderBottom: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34,
          background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DEEP} 100%)`,
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 12px rgba(201,162,39,0.35)`,
        }}>
          <span style={{ color: BG, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>م</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: TEXT_FULL, lineHeight: 1.2, letterSpacing: '0.02em' }}>
            المالية
          </div>
          <div style={{ fontSize: 10, color: ACCENT, lineHeight: 1, letterSpacing: '0.04em' }}>
            نظام المحاسبة
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <div className="sidebar-nav-scroll" style={{ flex: 1, overflow: 'auto', padding: '12px 4px' }}>
        {navGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {/* Section label */}
            {group.label && (
              <div style={{
                padding: `${gi === 0 ? 0 : 12}px 16px 4px`,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: TEXT_DIM, textTransform: 'uppercase',
              }}>
                {group.label}
              </div>
            )}

            <div style={group.label ? {
              background: BG_SECTION,
              borderRadius: 8,
              border: `1px solid ${DIVIDER}`,
              padding: 4,
              marginBottom: 8,
            } : undefined}>
              {group.items.map(item => (
                <NavRow
                  key={item.to}
                  item={item}
                  sectionOpen={!!open[item.to]}
                  onToggle={() => toggle(item.to)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${DIVIDER}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: TEXT_DIM, textAlign: 'center' }}>
          v1.0 · نظام جودة المحاسبي
        </div>
      </div>
    </div>
  )
}
