import { useState } from 'react'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined'

interface HelpButtonProps {
  title: string
  children: React.ReactNode
}

export default function HelpButton({ title, children }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Tooltip title="دليل الاستخدام">
        <IconButton onClick={() => setOpen(true)} size="small" color="info">
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.2rem', borderBottom: '1px solid', borderColor: 'divider' }}>
          {title}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setOpen(false)} variant="contained" size="small">
            فهمت
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
