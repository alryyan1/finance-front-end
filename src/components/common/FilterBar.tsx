import { useState } from 'react'
import { Badge, Button, Drawer, Flex } from 'antd'
import { FilterX, SlidersHorizontal } from 'lucide-react'
import { useResponsive } from '@/hooks/useResponsive'

interface FilterBarProps {
  /** Filter controls. Rendered inline on desktop, stacked in a sheet on mobile. */
  children: React.ReactNode
  /** Number of active filters — shown as a badge on the mobile trigger. */
  activeCount?: number
  onReset?: () => void
  /** Extra actions (export/print buttons) shown inline on desktop only. */
  desktopExtra?: React.ReactNode
}

/**
 * Desktop: renders the filter controls inline in a bordered bar.
 * Mobile (`< lg`): renders a full-width "فلترة" button that opens a bottom sheet
 * containing the same controls stacked full-width.
 */
export default function FilterBar({ children, activeCount = 0, onReset, desktopExtra }: FilterBarProps) {
  const { isDesktop } = useResponsive()
  const [open, setOpen] = useState(false)

  if (isDesktop) {
    return (
      <div style={{ padding: '8px 12px', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={8} wrap="wrap" align="flex-end">
          {children}
          {(onReset || desktopExtra) && <div style={{ flex: 1 }} />}
          {onReset && activeCount > 0 && (
            <Button type="text" shape="circle" size="small" onClick={onReset} icon={<FilterX size={16} />} />
          )}
          {desktopExtra}
        </Flex>
      </div>
    )
  }

  return (
    <>
      <Badge count={activeCount} size="small" offset={[-6, 4]} style={{ width: '100%' }}>
        <Button block icon={<SlidersHorizontal size={16} />} onClick={() => setOpen(true)}>
          فلترة
        </Button>
      </Badge>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        placement="bottom"
        height="auto"
        title="فلترة"
        styles={{ body: { paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' } }}
      >
        <Flex vertical gap={14} className="filterbar-sheet">
          {children}
          <Flex gap={8} style={{ marginTop: 4 }}>
            <Button type="primary" block onClick={() => setOpen(false)}>تطبيق</Button>
            {onReset && (
              <Button block onClick={() => { onReset(); setOpen(false) }} icon={<FilterX size={16} />}>
                إلغاء الفلاتر
              </Button>
            )}
          </Flex>
        </Flex>
      </Drawer>
    </>
  )
}
