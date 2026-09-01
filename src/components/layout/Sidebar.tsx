import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import {
  ChevronUp as ChevronUpIcon,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import { navGroups, type NavChild, type NavItem } from './navConfig'

export const SIDEBAR_WIDTH = 260

// ── Colours (always dark navy-and-gold sidebar) ─────────────────────────────

const BG          = '#0B1220'
const BG_SECTION  = 'rgba(255,255,255,0.025)'
const ACCENT      = '#C9A227'          // gold
const ACCENT_DEEP = '#8B6914'          // deep gold, for gradients
const ACTIVE_BG   = 'rgba(201,162,39,0.14)'
const HOVER_BG    = 'rgba(255,255,255,0.05)'
const TEXT_DIM    = 'rgba(255,255,255,0.42)'
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
            color: TEXT_FULL,
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
  const isExpanded = hasChildren && (item.alwaysOpen || sectionOpen)

  return (
    <div>
      {hasChildren ? (
        // Collapsible parent — no NavLink, just a toggle button
        <div
          onClick={item.alwaysOpen ? undefined : onToggle}
          className={`sidebar-nav-item${sectionActive ? ' is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '9px 12px', margin: '0 4px 2px', borderRadius: 6, cursor: item.alwaysOpen ? 'default' : 'pointer',
            color: TEXT_FULL,
            background: sectionActive ? ACTIVE_BG : 'transparent',
            transition: 'background 0.15s, color 0.15s',
            userSelect: 'none',
          }}
        >
          <item.icon size={19} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: sectionActive ? 600 : 400, color: 'inherit', fontSize: 13.5 }}>
            {item.label}
          </span>
          {!item.alwaysOpen && (
            isExpanded
              ? <ChevronUpIcon size={16} style={{ opacity: 0.6 }} />
              : <ChevronDownIcon size={16} style={{ opacity: 0.4 }} />
          )}
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
                color: TEXT_FULL,
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
