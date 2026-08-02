import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/lib/toast'
import { Button, Flex, Input, Typography } from 'antd'
import {
  BarChart3, Eye, EyeOff, Landmark, Lock, Receipt, TrendingUp, User,
} from 'lucide-react'

const { Title, Text } = Typography

const FEATURES = [
  { icon: <Receipt size={20} />,   text: 'قيود يومية وكشف حسابات' },
  { icon: <BarChart3 size={20} />, text: 'تقارير مالية شاملة' },
  { icon: <TrendingUp size={20} />, text: 'ميزان مراجعة وقوائم ختامية' },
]

export default function LoginPage() {
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
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
    <Flex style={{ minHeight: '100vh' }}>
      {/* ── Left branding panel ── */}
      <Flex
        vertical
        align="center"
        justify="center"
        className="login-branding-panel"
        style={{
          flex: '0 0 45%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #1a237e 0%, #283593 40%, #1565c0 100%)',
          padding: 48,
        }}
      >
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', width: 380, height: 380,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
          top: -80, right: -80,
        }} />
        <div style={{
          position: 'absolute', width: 260, height: 260,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)',
          bottom: -60, left: -60,
        }} />
        <div style={{
          position: 'absolute', width: 140, height: 140,
          borderRadius: '50%', background: 'rgba(255,255,255,0.04)',
          top: '45%', left: '10%',
        }} />

        {/* Logo */}
        <Flex align="center" justify="center" style={{
          width: 72, height: 72, borderRadius: 12,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          marginBottom: 24,
        }}>
          <Landmark size={38} color="white" />
        </Flex>

        <Title level={3} style={{ color: 'white', marginBottom: 8, textAlign: 'center' }}>
          نظام المالية
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.65)', marginBottom: 48, textAlign: 'center', fontSize: 15 }}>
          إدارة مالية احترافية وشاملة
        </Text>

        {/* Feature list */}
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 300 }}>
          {FEATURES.map((f, i) => (
            <Flex key={i} align="center" gap={16}>
              <Flex align="center" justify="center" style={{
                width: 40, height: 40, borderRadius: 8,
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)', flexShrink: 0,
              }}>
                {f.icon}
              </Flex>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                {f.text}
              </Text>
            </Flex>
          ))}
        </Flex>

        {/* Bottom tag */}
        <Text style={{ position: 'absolute', bottom: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          نظام محاسبة متكامل
        </Text>
      </Flex>

      {/* ── Right form panel ── */}
      <Flex
        align="center"
        justify="center"
        style={{ flex: 1, padding: 24 }}
      >
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <Flex align="center" gap={12} className="login-mobile-logo" style={{ marginBottom: 32 }}>
            <Flex align="center" justify="center" style={{
              width: 40, height: 40, borderRadius: 8,
              background: '#2563eb',
            }}>
              <Landmark size={22} color="white" />
            </Flex>
            <Title level={5} style={{ margin: 0 }}>نظام المالية</Title>
          </Flex>

          {/* Greeting */}
          <Title level={4} style={{ marginBottom: 6 }}>
            مرحباً بك
          </Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
            أدخل بياناتك للوصول إلى لوحة التحكم
          </Text>

          <form onSubmit={handleSubmit}>
            <Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }} type="secondary">
              اسم المستخدم
            </Text>
            <Input
              size="large"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
              prefix={<User size={18} color="var(--ant-color-text-disabled)" />}
              style={{ marginBottom: 20 }}
            />

            <Text style={{ fontWeight: 600, display: 'block', marginBottom: 6 }} type="secondary">
              كلمة المرور
            </Text>
            <Input
              size="large"
              placeholder="أدخل كلمة المرور"
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
              style={{ marginBottom: 32 }}
            />

            <Button
              block
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              style={{
                fontWeight: 700,
                fontSize: 15,
                height: 48,
                background: 'linear-gradient(135deg, #1565c0 0%, #1a237e 100%)',
                boxShadow: '0 4px 15px rgba(21,101,192,0.35)',
              }}
            >
              {loading ? 'جارٍ تسجيل الدخول…' : 'تسجيل الدخول'}
            </Button>
          </form>

          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 40, fontSize: 12 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} — نظام المالية
          </Text>
        </div>
      </Flex>
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
