import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'
import { Button, Flex, Input, Typography } from 'antd'
import { Eye, EyeOff, Lock, User } from 'lucide-react'

const { Title, Text } = Typography

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const toast      = useToast()

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      toast.error(extractError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: 24, userSelect: 'none' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>
        <Flex vertical align="center" style={{ marginBottom: 32 }}>
          <img src="/logo.png" alt="شعار النظام" style={{ width: 150, height: 150, objectFit: 'contain', borderRadius: 12, marginBottom: 16 }} />
          <Title level={4} style={{ margin: 0 }}>نظام المالية</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>سجّل الدخول للمتابعة</Text>
        </Flex>

        <form onSubmit={handleSubmit}>
          <Input
            size="large"
            placeholder="اسم المستخدم"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            prefix={<User size={18} color="var(--ant-color-text-disabled)" />}
            style={{ marginBottom: 12 }}
          />

          <Input
            size="large"
            placeholder="كلمة المرور"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            prefix={<Lock size={18} color="var(--ant-color-text-disabled)" />}
            suffix={
              <Button
                type="text"
                size="small"
                icon={showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                onClick={() => setShowPass(p => !p)}
              />
            }
            style={{ marginBottom: 20 }}
          />

          <Button block type="primary" htmlType="submit" loading={loading} size="large">
            {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
          </Button>
        </form>
      </div>
    </Flex>
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
