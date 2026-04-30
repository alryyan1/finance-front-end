import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  FileText,
  Settings,
  Wallet,
} from 'lucide-react'

const navItems = [
  { to: '/',            label: 'لوحة التحكم',  icon: LayoutDashboard },
  { to: '/accounts',   label: 'الحسابات',       icon: Wallet },
  { to: '/transactions',label: 'المعاملات',     icon: ArrowLeftRight },
  { to: '/parties',    label: 'الأطراف',        icon: Users },
  { to: '/reports',    label: 'التقارير',        icon: FileText },
  { to: '/settings',   label: 'الإعدادات',      icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-l bg-card flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
          م
        </div>
        <span className="font-semibold text-base">المالية</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
