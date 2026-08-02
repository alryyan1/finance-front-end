import { useState, useRef, useEffect } from 'react'
import { Avatar, Button, Flex, Input, Modal, Spin, Tooltip } from 'antd'
import { Bot, Send, Sparkles, User, X } from 'lucide-react'
import { aiApi, type ChatMessage } from '@/api/ai'

export default function AiChatButton() {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'مرحباً! أنا مساعدك المحاسبي. كيف يمكنني مساعدتك اليوم؟' },
  ])
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
      const reply = await aiApi.chat(history.filter(m => m.text !== messages[0].text || m.role !== 'model'))
      setMessages([...history, { role: 'model', text: reply }])
    } catch {
      setMessages([...history, { role: 'model', text: 'عذراً، حدث خطأ. حاول مرة أخرى.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Tooltip title="المساعد المحاسبي الذكي" placement="right">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<Sparkles size={20} />}
          onClick={() => setOpen(true)}
          style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1200, width: 56, height: 56 }}
        />
      </Tooltip>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={520}
        closeIcon={<X size={16} color="white" />}
        styles={{
          header: { background: 'var(--ant-color-primary)', padding: '14px 16px', marginBottom: 0 },
          body: { padding: 0, height: '60vh', display: 'flex', flexDirection: 'column' },
        }}
        title={
          <Flex align="center" gap={8}>
            <Sparkles size={16} color="white" />
            <span style={{ color: 'white', fontWeight: 700 }}>المساعد المحاسبي الذكي</span>
          </Flex>
        }
        footer={
          <Input
            placeholder="اكتب سؤالك المحاسبي..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onPressEnter={e => { e.preventDefault(); send() }}
            disabled={loading}
            suffix={
              <Button
                type="text"
                size="small"
                icon={<Send size={16} />}
                disabled={!input.trim() || loading}
                onClick={send}
              />
            }
          />
        }
      >
        <Flex vertical gap={12} style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {messages.map((msg, i) => (
            <Flex key={i} gap={8} align="flex-start" style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar
                size={30}
                style={{ backgroundColor: msg.role === 'user' ? 'var(--ant-color-primary)' : 'var(--ant-color-success)', flexShrink: 0 }}
                icon={msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              />
              <div
                style={{
                  padding: 12, maxWidth: '80%', borderRadius: 8,
                  background: msg.role === 'user' ? 'var(--ant-color-primary-bg)' : 'var(--ant-color-fill-alter)',
                  border: '1px solid var(--ant-color-border-secondary)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                }}
              >
                {msg.text}
              </div>
            </Flex>
          ))}

          {loading && (
            <Flex gap={8} align="center">
              <Avatar size={30} style={{ backgroundColor: 'var(--ant-color-success)' }} icon={<Bot size={16} />} />
              <Spin size="small" />
            </Flex>
          )}
          <div ref={bottomRef} />
        </Flex>
      </Modal>
    </>
  )
}
