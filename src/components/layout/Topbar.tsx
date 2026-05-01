import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
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
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'

export default function Topbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

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
      <Toolbar sx={{ height: '100%' }}>
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

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
          slotProps={{ paper: { sx: { minWidth: 180, mt: 0.5 } } }}
        >
          <MenuItem disabled dense>
            <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          </MenuItem>
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
