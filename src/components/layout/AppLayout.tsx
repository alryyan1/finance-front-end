import { Outlet } from 'react-router-dom'
import { Flex } from 'antd'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { FiscalYearsProvider } from '@/context/FiscalYearsContext'

export const TOPBAR_HEIGHT = 64

export default function AppLayout() {
  return (
    <FiscalYearsProvider>
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
    </FiscalYearsProvider>
  )
}
