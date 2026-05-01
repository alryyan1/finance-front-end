import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
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
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 52,
            height: 52,
            bgcolor: 'primary.main',
            borderRadius: 2,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            mb: 1.5,
          }}>
            م
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>المالية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            أدِر شؤونك المالية بكل سهولة
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>تسجيل الدخول</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            أدخل بياناتك للوصول إلى حسابك
          </Typography>

          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              fullWidth label="اسم المستخدم"
              value={username} onChange={e => setUsername(e.target.value)}
              autoComplete="username" required sx={{ mb: 2 }}
            />
            <TextField
              fullWidth label="كلمة المرور" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete="current-password" required sx={{ mb: 3 }}
            />
            <Button fullWidth variant="contained" type="submit" disabled={loading} size="large">
              {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
            </Button>
          </form>
        </Paper>
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
