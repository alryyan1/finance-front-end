import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Flex } from 'antd'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav'
import MobileNavDrawer from './MobileNavDrawer'
import { FiscalYearsProvider } from '@/context/FiscalYearsContext'
import { useResponsive } from '@/hooks/useResponsive'

export const TOPBAR_HEIGHT = 64

export default function AppLayout() {
  const { isDesktop } = useResponsive()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <FiscalYearsProvider>
      {isDesktop ? (
        <Flex style={{ height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <Flex vertical style={{ flexGrow: 1, minWidth: 0 }}>
            <Topbar />
            <div
              style={{ flexGrow: 1, overflow: 'auto', padding: 24, background: 'var(--ant-color-bg-layout)' }}
            >
              <Outlet />
            </div>
          </Flex>
        </Flex>
      ) : (
        <Flex vertical style={{ minHeight: '100dvh', background: 'var(--ant-color-bg-layout)' }}>
          <Topbar mobile onMenu={() => setDrawerOpen(true)} />
          <div style={{ flexGrow: 1, padding: 12, paddingBottom: BOTTOM_NAV_HEIGHT + 16 }}>
            <Outlet />
          </div>
          <BottomNav onOpenDrawer={() => setDrawerOpen(true)} />
          <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </Flex>
      )}
    </FiscalYearsProvider>
  )
}
