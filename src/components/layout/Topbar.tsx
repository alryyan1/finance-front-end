import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { fiscalYearsApi } from '@/api/fiscalYears'
import type { FiscalYear } from '@/api/fiscalYears'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import { useThemeMode } from '@/context/ThemeModeContext'

const today = new Date()
const DATE_LABEL = today.toLocaleDateString('ar-SA', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function Topbar() {
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useThemeMode()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const [activePeriod, setActivePeriod] = useState<FiscalYear | null | undefined>(undefined)
  const [todayCovered, setTodayCovered] = useState<boolean>(false)

  useEffect(() => {
    const iso = today.toISOString().slice(0, 10)
    fiscalYearsApi.list()
      .then(years => {
        const open = years.find(y => y.status === 'open') ?? null
        setActivePeriod(open)
        // warn separately if open period doesn't cover today
        if (open) {
          const from = open.start_date <= iso
          const to   = open.end_date   >= iso
          setTodayCovered(from && to)
        } else {
          setTodayCovered(false)
        }
      })
      .catch(() => setActivePeriod(null))
  }, [])

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  async function handleLogout() {
    setAnchor(null)
    await logout()
    navigate('/login')
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', color: 'text.primary', height: 64 }}
    >
      <Toolbar sx={{ height: '100%', gap: 1.5 }}>
        {/* User avatar + menu — right side in RTL */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">@{user?.username}</Typography>
          </Box>
          <IconButton onClick={e => setAnchor(e.currentTarget)} size="small" sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* ── Info chips ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Today's date */}
          <Chip
            icon={<CalendarTodayOutlinedIcon sx={{ fontSize: '15px !important' }} />}
            label={DATE_LABEL}
            size="small"
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'flex' }, fontSize: 12, color: 'text.secondary', borderColor: 'divider' }}
          />

          {/* Active fiscal period */}
          <Tooltip title="اضغط لإدارة الفترات المالية">
            <Chip
              icon={
                activePeriod === undefined
                  ? <EventNoteOutlinedIcon sx={{ fontSize: '15px !important' }} />
                  : activePeriod
                    ? <LockOpenOutlinedIcon sx={{ fontSize: '15px !important' }} />
                    : <WarningAmberOutlinedIcon sx={{ fontSize: '15px !important' }} />
              }
              label={
                activePeriod === undefined ? '…'
                  : !activePeriod       ? 'لا توجد فترة مفتوحة'
                  : todayCovered        ? `${activePeriod.name} • مفتوحة`
                  :                       `${activePeriod.name} • خارج نطاق اليوم`
              }
              size="small"
              onClick={() => navigate('/fiscal-years')}
              color={
                activePeriod === undefined ? 'default'
                  : !activePeriod         ? 'error'
                  : todayCovered          ? 'success'
                  :                         'warning'
              }
              variant={activePeriod ? 'filled' : 'outlined'}
              sx={{ fontSize: 12, cursor: 'pointer', display: { xs: 'none', sm: 'flex' } }}
            />
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={mode === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}>
            <IconButton size="small" onClick={toggleMode} sx={{ color: 'text.secondary' }}>
              {mode === 'light'
                ? <DarkModeOutlinedIcon sx={{ fontSize: 20 }} />
                : <LightModeOutlinedIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>

          {/* Quick new entry */}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/transactions/new')}
            sx={{ fontWeight: 600, px: 1.5, display: { xs: 'none', sm: 'flex' } }}
          >
            قيد جديد
          </Button>

          {/* Mobile: icon only */}
          <IconButton
            color="primary"
            size="small"
            onClick={() => navigate('/transactions/new')}
            sx={{ display: { xs: 'flex', sm: 'none' } }}
          >
            <AddIcon />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          slotProps={{ paper: { sx: { minWidth: 200, mt: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.name}</Typography>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </Box>
          <Divider />

          {/* Period status in menu on mobile */}
          {activePeriod !== undefined && (
            <MenuItem
              dense
              onClick={() => { setAnchor(null); navigate('/fiscal-years') }}
              sx={{ gap: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: activePeriod ? 'success.main' : 'warning.main' }}>
                {activePeriod ? <LockOpenOutlinedIcon fontSize="small" /> : <LockOutlinedIcon fontSize="small" />}
              </ListItemIcon>
              <Typography variant="body2" color={activePeriod ? 'success.main' : 'warning.main'}>
                {activePeriod ? activePeriod.name : 'لا توجد فترة مفتوحة'}
              </Typography>
            </MenuItem>
          )}

          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main', gap: 1 }}>
            <ListItemIcon sx={{ color: 'error.main', minWidth: 0 }}>
              <LogoutOutlinedIcon fontSize="small" />
            </ListItemIcon>
            تسجيل الخروج
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
