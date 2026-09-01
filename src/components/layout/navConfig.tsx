import { useLocation } from 'react-router-dom'
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
  DatabaseBackup as DatabaseBackupIcon,
  Building2 as Building2Icon,
  Sparkles as SparklesIcon,
  GitCompareArrows as GitCompareArrowsIcon,
  Menu as MenuIcon,
  type LucideIcon,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

export interface NavChild {
  to: string
  label: string
  icon: LucideIcon
}

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  children?: NavChild[]
  /** Section always stays expanded — not collapsible. */
  alwaysOpen?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

// ── Navigation structure (shared by desktop Sidebar + mobile drawer) ──────────

export const navGroups: NavGroup[] = [
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
      { to: '/petty-cash',   label: 'اذونات الصرف والقبض',   icon: PiggyBankIcon },
      { to: '/parties',      label: 'الأطراف',               icon: UsersIcon },
      { to: '/prepaid-rent', label: 'الإيجار المقدم',        icon: Building2Icon },
    ],
  },
  {
    label: 'التقارير',
    items: [
      {
        to: '/reports', label: 'التقارير', icon: BarChart3Icon,
        alwaysOpen: true,
        children: [
          { to: '/reports/trial-balance',    label: 'ميزان المراجعة',     icon: ScaleIcon },
          { to: '/reports/ledger',           label: 'كشف حساب',           icon: BookOpenIcon },
          { to: '/reports/income-statement', label: 'قائمة الدخل',        icon: TrendingUpIcon },
          { to: '/reports/balance-sheet',    label: 'الميزانية العمومية', icon: LandmarkIcon },
          { to: '/reports/balance-sheet/horizontal', label: 'التحليل الأفقي', icon: GitCompareArrowsIcon },
          { to: '/reports/statement-of-equity', label: 'قائمة حقوق الملكية', icon: CoinsIcon },
        ],
      },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { to: '/backup', label: 'النسخ الاحتياطية', icon: DatabaseBackupIcon },
    ],
  },
]

// ── Bottom tab bar (mobile) ──────────────────────────────────────────────────

export interface BottomNavItem {
  /** `to` navigates; `action: 'drawer'` opens the full nav drawer instead. */
  to?: string
  label: string
  icon: LucideIcon
  end?: boolean
  action?: 'drawer'
}

export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { to: '/',            label: 'الرئيسية', icon: LayoutDashboardIcon, end: true },
  { to: '/transactions', label: 'القيود',   icon: ArrowLeftRightIcon },
  { to: '/petty-cash',   label: 'الأذونات', icon: PiggyBankIcon },
  { to: '/reports',      label: 'التقارير', icon: BarChart3Icon },
  { label: 'المزيد',     icon: MenuIcon, action: 'drawer' },
]

// ── Page-title resolution (mobile topbar) ────────────────────────────────────

/** Titles for routes that aren't in the nav tree. */
const EXTRA_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/transactions/new', title: 'قيد جديد' },
  { prefix: '/transactions/',    title: 'تعديل القيد' },
  { prefix: '/users',            title: 'المستخدمون' },
  { prefix: '/roles',            title: 'الأدوار والصلاحيات' },
  { prefix: '/settings/opening-balances', title: 'الأرصدة الافتتاحية' },
  { prefix: '/settings/fiscal-years',     title: 'السنوات المالية' },
  { prefix: '/settings',         title: 'الإعدادات' },
]

export function resolvePageTitle(pathname: string): string {
  // exact nav item / child match first
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.to === pathname) return item.label
      for (const child of item.children ?? []) {
        if (child.to === pathname) return child.label
      }
    }
  }
  // extra (non-nav) routes
  for (const { prefix, title } of EXTRA_TITLES) {
    if (pathname === prefix || pathname.startsWith(prefix)) return title
  }
  // longest matching nav-item prefix (e.g. /reports/... not covered above)
  let best: { len: number; label: string } | null = null
  for (const group of navGroups) {
    for (const item of group.items) {
      if (pathname.startsWith(item.to) && item.to.length > (best?.len ?? 0)) {
        best = { len: item.to.length, label: item.label }
      }
      for (const child of item.children ?? []) {
        if (pathname.startsWith(child.to) && child.to.length > (best?.len ?? 0)) {
          best = { len: child.to.length, label: child.label }
        }
      }
    }
  }
  return best?.label ?? 'نظام المالية'
}

export function usePageTitle(): string {
  const { pathname } = useLocation()
  return resolvePageTitle(pathname)
}
