import { NavLink, useLocation } from 'react-router-dom'
import { BOTTOM_NAV_ITEMS } from './navConfig'

const ACCENT = '#C9A227'

export const BOTTOM_NAV_HEIGHT = 58

interface Props {
  onOpenDrawer: () => void
}

/** Fixed mobile tab bar. Only mounted below the `lg` breakpoint (see AppLayout). */
export default function BottomNav({ onOpenDrawer }: Props) {
  const { pathname } = useLocation()

  return (
    <nav
      style={{
        position: 'fixed', insetInline: 0, bottom: 0, zIndex: 100,
        display: 'flex',
        background: 'var(--ant-color-bg-container)',
        borderTop: '1px solid var(--ant-color-border-secondary)',
        boxShadow: '0 -1px 8px rgba(11,18,32,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {BOTTOM_NAV_ITEMS.map(item => {
        const Icon = item.icon
        const active = item.to
          ? (item.end ? pathname === item.to : pathname.startsWith(item.to))
          : false

        const inner = (
          <span
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 3,
              height: BOTTOM_NAV_HEIGHT,
              color: active ? ACCENT : 'var(--ant-color-text-secondary)',
              borderTop: `2px solid ${active ? ACCENT : 'transparent'}`,
              transition: 'color 0.15s',
              cursor: 'pointer',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{item.label}</span>
          </span>
        )

        if (item.action === 'drawer') {
          return (
            <button
              key="more"
              type="button"
              onClick={onOpenDrawer}
              style={{ flex: 1, background: 'none', border: 'none', padding: 0 }}
            >
              {inner}
            </button>
          )
        }

        return (
          <NavLink key={item.to} to={item.to!} style={{ flex: 1, textDecoration: 'none' }}>
            {inner}
          </NavLink>
        )
      })}
    </nav>
  )
}
