import { useState, useRef, useEffect } from 'react'
import {
  Avatar, Box, CircularProgress, Dialog, DialogContent,
  DialogTitle, Fab, IconButton, InputAdornment, Paper,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
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
        <Fab
          color="primary"
          size="medium"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 24, left: 24, zIndex: 1200 }}
        >
          <AutoAwesomeIcon />
        </Fab>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: 3, height: '70vh', display: 'flex', flexDirection: 'column' } }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: 'primary.main', color: 'white', py: 1.5,
        }}>
          <AutoAwesomeIcon fontSize="small" />
          <Typography fontWeight={700}>المساعد المحاسبي الذكي</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ mr: 'auto', color: 'white' }} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: msg.role === 'user' ? 'primary.main' : 'success.main', flexShrink: 0 }}>
                {msg.role === 'user' ? <PersonIcon sx={{ fontSize: 16 }} /> : <SmartToyIcon sx={{ fontSize: 16 }} />}
              </Avatar>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5, maxWidth: '80%', borderRadius: 2,
                  bgcolor: msg.role === 'user' ? 'primary.50' : 'grey.100',
                  border: '1px solid',
                  borderColor: msg.role === 'user' ? 'primary.200' : 'grey.200',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85rem',
                  lineHeight: 1.7,
                }}
              >
                {msg.text}
              </Paper>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Avatar sx={{ width: 30, height: 30, bgcolor: 'success.main' }}>
                <SmartToyIcon sx={{ fontSize: 16 }} />
              </Avatar>
              <CircularProgress size={18} />
            </Box>
          )}
          <div ref={bottomRef} />
        </DialogContent>

        <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="اكتب سؤالك المحاسبي..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            disabled={loading}
            multiline
            maxRows={3}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={send} disabled={!input.trim() || loading} color="primary" size="small">
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Dialog>
    </>
  )
}
