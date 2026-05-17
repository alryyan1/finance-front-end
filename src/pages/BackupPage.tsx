import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'

import { backupApi } from '@/api/users'
import type { BackupFile } from '@/api/users'
import HelpButton from '@/components/common/HelpButton'

export default function BackupPage() {
  const [backups, setBackups]   = useState<BackupFile[]>([])
  const [loading, setLoading]   = useState(true)
  const [running, setRunning]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)
  const [delTarget, setDelTarget] = useState<BackupFile | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const load = () => {
    setLoading(true)
    backupApi.list()
      .then(setBackups)
      .catch(() => setError('تعذّر تحميل النسخ الاحتياطية'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await backupApi.run()
      setSuccess(res.message)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'فشل إنشاء النسخة الاحتياطية')
    } finally { setRunning(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await backupApi.remove(delTarget.name)
      setSuccess('تم حذف النسخة الاحتياطية')
      setDelTarget(null)
      load()
    } catch {
      setError('فشل الحذف')
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BackupOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>النسخ الاحتياطية</Typography>
            <Typography variant="body2" color="text.secondary">{backups.length} نسخة احتياطية</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <HelpButton title="دليل استخدام النسخ الاحتياطية">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي النسخة الاحتياطية؟</Typography>
                <Typography variant="body2">النسخة الاحتياطية تحفظ جميع بيانات قاعدة البيانات (القيود، الحسابات، المستخدمين…) في ملف مضغوط يمكن استخدامه للاستعادة عند الحاجة.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>إنشاء نسخة احتياطية</Typography>
                <Typography variant="body2">اضغط "إنشاء نسخة احتياطية" وانتظر حتى تكتمل العملية. تُحفظ النسخة على الخادم ويمكن تنزيلها على جهازك.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>تنزيل النسخة</Typography>
                <Typography variant="body2">اضغط أيقونة التنزيل بجانب أي نسخة لحفظها على جهازك. يُنصح بالاحتفاظ بنسخ دورية (يومية أو أسبوعية).</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>حذف النسخ القديمة</Typography>
                <Typography variant="body2">احذف النسخ القديمة لتوفير المساحة على الخادم. احرص على الاحتفاظ دائماً بآخر نسختين على الأقل.</Typography></Box>
            </Box>
          </HelpButton>
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>تحديث</Button>
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <BackupOutlinedIcon />}
            onClick={handleRun}
            disabled={running}
          >
            {running ? 'جاري الإنشاء…' : 'إنشاء نسخة احتياطية'}
          </Button>
        </Box>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Info card */}
      <Alert severity="info" sx={{ mb: 3 }}>
        النسخ الاحتياطية تشمل قاعدة البيانات فقط وتُخزّن محلياً على الخادم. يُنصح بإنشاء نسخة دورية قبل أي تحديثات كبيرة.
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>اسم الملف</TableCell>
                <TableCell align="center">الحجم</TableCell>
                <TableCell>تاريخ الإنشاء</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {backups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                    لا توجد نسخ احتياطية — اضغط "إنشاء نسخة احتياطية" للبدء
                  </TableCell>
                </TableRow>
              )}
              {backups.map((b, i) => (
                <TableRow key={b.name} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {b.name}
                      </Typography>
                      {i === 0 && <Chip label="الأحدث" color="success" size="small" />}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={b.size_human} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ direction: 'ltr', color: 'text.secondary', fontSize: 13 }}>
                    {b.date}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="تنزيل">
                        <IconButton
                          size="small" color="primary"
                          component="a"
                          href={backupApi.downloadUrl(b.name)}
                          download={b.name}
                        >
                          <DownloadOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDelTarget(b)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete confirm */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت متأكد من حذف النسخة الاحتياطية <strong>{delTarget?.name}</strong>؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelTarget(null)} disabled={deleting}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
