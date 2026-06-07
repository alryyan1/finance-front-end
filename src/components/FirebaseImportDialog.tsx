import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, LinearProgress, Stack, Tooltip, Typography,
} from '@mui/material'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import CheckCircleIcon   from '@mui/icons-material/CheckCircle'
import DeleteIcon        from '@mui/icons-material/Delete'
import {
  fetchPendingEntries, fetchDoctorMappings, markAsImported, toJournalPayload, deleteEntry,
  type FirebaseJournalEntry,
} from '@/lib/firebaseImport'
import { journalApi } from '@/api/journal'

interface Props {
  open:    boolean
  onClose: () => void
  onDone:  () => void   // refresh parent list after import
}

export default function FirebaseImportDialog({ open, onClose, onDone }: Props) {
  const [loading,        setLoading]        = useState(false)
  const [entries,        setEntries]        = useState<FirebaseJournalEntry[]>([])
  const [doctorMappings, setDoctorMappings] = useState<Record<string, string>>({})
  const [error,          setError]          = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [progress,  setProgress]  = useState(0)        // 0-100
  const [done,      setDone]      = useState(false)
  const [failed,    setFailed]    = useState<string[]>([])
  const [deleting,  setDeleting]  = useState<string | null>(null)  // firebaseId being deleted

  // Load pending entries whenever dialog opens
  useEffect(() => {
    if (!open) return
    setLoading(true); setError(null); setDone(false); setFailed([])
    Promise.all([fetchPendingEntries(), fetchDoctorMappings()])
      .then(([e, m]) => { setEntries(e); setDoctorMappings(m) })
      .catch(e => setError((e as Error).message ?? 'فشل التحميل'))
      .finally(() => setLoading(false))
  }, [open])

  const handleImportAll = async () => {
    setImporting(true); setProgress(0); setFailed([])
    const errors: string[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      try {
        const payload = toJournalPayload(entry, doctorMappings)
        // Skip lines where account_id couldn't be resolved
        const validLines = payload.lines.filter(l => l.account_id != null)
        if (validLines.length < 2) {
          errors.push(`${entry.description} — أسطر غير كافية (حسابات غير قابلة للتحويل)`)
        } else {
          await journalApi.create({ ...payload, lines: validLines as any })
          await markAsImported(entry.firebaseId)
        }
      } catch (e) {
        errors.push(`${entry.description} — ${(e as Error).message}`)
      }
      setProgress(Math.round(((i + 1) / entries.length) * 100))
    }

    setFailed(errors)
    setDone(true)
    setImporting(false)
    if (errors.length === 0) onDone()
  }

  const handleDelete = async (entry: FirebaseJournalEntry) => {
    if (!window.confirm(`حذف "${entry.description}" من Firebase نهائياً؟`)) return
    setDeleting(entry.firebaseId)
    try {
      await deleteEntry(entry.firebaseId)
      setEntries(prev => prev.filter(e => e.firebaseId !== entry.firebaseId))
    } catch (e) {
      setError((e as Error).message ?? 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm(`حذف جميع القيود (${entries.length}) من Firebase نهائياً؟`)) return
    setDeleting('__all__')
    try {
      await Promise.all(entries.map(e => deleteEntry(e.firebaseId)))
      setEntries([])
    } catch (e) {
      setError((e as Error).message ?? 'فشل الحذف')
    } finally {
      setDeleting(null)
    }
  }

  const handleClose = () => {
    if (importing) return
    setEntries([]); setDone(false); setFailed([])
    onClose()
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 })
  const entryTotal = (e: FirebaseJournalEntry) =>
    e.lines.reduce((s, l) => s + l.debit, 0)

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudDownloadIcon color="primary" />
        استيراد القيود من Firebase
      </DialogTitle>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && !done && (
          <>
            {entries.length === 0 ? (
              <Alert severity="success">لا توجد قيود معلّقة — كل شيء محدَّث.</Alert>
            ) : (
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {entries.length} قيد في Firebase جاهز للاستيراد إلى نظام المحاسبة:
                </Typography>

                {entries.map(e => (
                  <Box key={e.firebaseId} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.description}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={`${fmt(entryTotal(e))} ج.س`} size="small" color="primary" variant="outlined" />
                        <Tooltip title="حذف من Firebase">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={importing || deleting !== null}
                              onClick={() => handleDelete(e)}
                            >
                              {deleting === e.firebaseId
                                ? <CircularProgress size={16} color="error" />
                                : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {e.date} · {e.lines.length} سطر
                      {e.reference ? ` · ${e.reference}` : ''}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </>
        )}

        {importing && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>جاري الاستيراد... {progress}%</Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}

        {done && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="body1" color="success.main" sx={{ fontWeight: 600 }}>
                {entries.length - failed.length} قيد تم استيراده بنجاح
              </Typography>
            </Box>
            {failed.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {failed.length} قيد فشل:
                </Typography>
                {failed.map((msg, i) => (
                  <Typography key={i} variant="caption" display="block">• {msg}</Typography>
                ))}
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {done ? 'إغلاق' : 'إلغاء'}
        </Button>
        {!done && entries.length > 0 && (
          <>
            <Button
              color="error"
              disabled={loading || importing || deleting !== null}
              onClick={handleDeleteAll}
              startIcon={deleting === '__all__' ? <CircularProgress size={16} color="error" /> : <DeleteIcon />}
            >
              حذف الكل
            </Button>
            <Button
              variant="contained"
              disabled={loading || importing || deleting !== null || entries.length === 0}
              onClick={handleImportAll}
              startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
            >
              {importing ? 'جاري الاستيراد...' : `استيراد ${entries.length} قيد`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  )
}
