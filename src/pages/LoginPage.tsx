import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  Alert, Box, Button, IconButton, InputAdornment,
  TextField, Typography,
} from '@mui/material'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'

const FEATURES = [
  { icon: <ReceiptLongOutlinedIcon />, text: 'قيود يومية وكشف حسابات' },
  { icon: <AssessmentOutlinedIcon />,  text: 'تقارير مالية شاملة' },
  { icon: <TrendingUpIcon />,          text: 'ميزان مراجعة وقوائم ختامية' },
]

export default function LoginPage() {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      {/* ── Left branding panel ── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 45%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #1a237e 0%, #283593 40%, #1565c0 100%)',
          p: 6,
          gap: 0,
        }}
      >
        {/* Decorative circles */}
        <Box sx={{
          position: 'absolute', width: 380, height: 380,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
          top: -80, right: -80,
        }} />
        <Box sx={{
          position: 'absolute', width: 260, height: 260,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
          bottom: -60, left: -60,
        }} />
        <Box sx={{
          position: 'absolute', width: 140, height: 140,
          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)',
          top: '45%', left: '10%',
        }} />

        {/* Logo */}
        <Box sx={{
          width: 72, height: 72, borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3,
        }}>
          <AccountBalanceIcon sx={{ fontSize: 38, color: 'white' }} />
        </Box>

        <Typography variant="h4" sx={{ color: 'white', fontWeight: 800, mb: 1, textAlign: 'center' }}>
          نظام المالية
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', mb: 6, textAlign: 'center', fontSize: 15 }}>
          إدارة مالية احترافية وشاملة
        </Typography>

        {/* Feature list */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '100%', maxWidth: 300 }}>
          {FEATURES.map((f, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.9)', flexShrink: 0,
              }}>
                {f.icon}
              </Box>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                {f.text}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Bottom tag */}
        <Typography sx={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          نظام محاسبة متكامل
        </Typography>
      </Box>

      {/* ── Right form panel ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: { xs: 3, sm: 6 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AccountBalanceIcon sx={{ fontSize: 22, color: 'white' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>نظام المالية</Typography>
          </Box>

          {/* Greeting */}
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.75 }}>
            مرحباً بك
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            أدخل بياناتك للوصول إلى لوحة التحكم
          </Typography>

          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              اسم المستخدم
            </Typography>
            <TextField
              fullWidth
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              sx={{ mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', mb: 0.75, display: 'block' }}>
              كلمة المرور
            </Typography>
            <TextField
              fullWidth
              placeholder="أدخل كلمة المرور"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              sx={{ mb: 4 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPass(p => !p)} edge="end">
                        {showPass
                          ? <VisibilityOffOutlinedIcon sx={{ fontSize: 20 }} />
                          : <VisibilityOutlinedIcon   sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              size="large"
              sx={{
                py: 1.5,
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1565c0 0%, #1a237e 100%)',
                boxShadow: '0 4px 15px rgba(21,101,192,0.35)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1976d2 0%, #283593 100%)',
                  boxShadow: '0 6px 20px rgba(21,101,192,0.45)',
                },
                '&:disabled': { background: 'action.disabledBackground' },
              }}
            >
              {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
            </Button>
          </form>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 5 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} — نظام المالية
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}
