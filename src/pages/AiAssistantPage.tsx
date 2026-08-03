import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Card, Flex, Input, Spin, Typography } from 'antd'
import { Bot, Send, User } from 'lucide-react'
import HelpButton from '@/components/common/HelpButton'
import { aiApi, type ChatMessage } from '@/api/ai'

const { Title, Text } = Typography

const GREETING: ChatMessage = { role: 'model', text: 'مرحباً! أنا مساعدك المحاسبي. كيف يمكنني مساعدتك اليوم؟' }

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', text }
    const history = [...messages, userMsg]
    setMessages(history)
    setInput('')
    setLoading(true)

    try {
      const reply = await aiApi.chat(history.filter(m => !(m.role === 'model' && m.text === GREETING.text)))
      setMessages([...history, { role: 'model', text: reply }])
    } catch {
      setMessages([...history, { role: 'model', text: 'عذراً، حدث خطأ. حاول مرة أخرى.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Flex vertical style={{ height: '100%' }}>
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>المساعد المحاسبي الذكي</Title>
          <Text type="secondary">اسأل عن المفاهيم المحاسبية، القيود، أو التقارير المالية</Text>
        </div>
        <HelpButton title="دليل استخدام المساعد الذكي">
          <Text>
            يمكنك سؤال المساعد عن المفاهيم المحاسبية، شرح القيود، أو طلب توضيح للتقارير المالية.
            الإجابات مبنية على نموذج ذكاء اصطناعي عام وليست متصلة ببيانات النظام الفعلية.
          </Text>
        </HelpButton>
      </Flex>

      <Card
        styles={{ body: { padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Flex vertical gap={12} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
          {messages.map((msg, i) => (
            <Flex key={i} gap={8} align="flex-start" style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar
                size={32}
                style={{ backgroundColor: msg.role === 'user' ? 'var(--ant-color-primary)' : 'var(--ant-color-success)', flexShrink: 0 }}
                icon={msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              />
              <div
                style={{
                  padding: 12, maxWidth: '70%', borderRadius: 8,
                  background: msg.role === 'user' ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-fill-alter)',
                  border: '1px solid var(--ant-color-border-secondary)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                }}
              >
                {msg.text}
              </div>
            </Flex>
          ))}

          {loading && (
            <Flex gap={8} align="center">
              <Avatar size={32} style={{ backgroundColor: 'var(--ant-color-success)' }} icon={<Bot size={16} />} />
              <Spin size="small" />
            </Flex>
          )}
          <div ref={bottomRef} />
        </Flex>

        <div style={{ borderTop: '1px solid var(--ant-color-border-secondary)', padding: 16, flexShrink: 0 }}>
          <Input
            placeholder="اكتب سؤالك المحاسبي..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={e => { e.preventDefault(); send() }}
            disabled={loading}
            size="large"
            suffix={
              <Button
                type="text"
                icon={<Send size={18} />}
                disabled={!input.trim() || loading}
                onClick={send}
              />
            }
          />
        </div>
      </Card>
    </Flex>
  )
}
