import { Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import AiChatButton from '@/components/AiChat/AiChatButton'
import { FiscalYearsProvider } from '@/context/FiscalYearsContext'

export const TOPBAR_HEIGHT = 64

export default function AppLayout() {
  return (
    <FiscalYearsProvider>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Topbar />
          <Box
            component="main"
            sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: 'background.default' }}
          >
            <Outlet />
          </Box>
        </Box>
        <AiChatButton />
      </Box>
    </FiscalYearsProvider>
  )
}
