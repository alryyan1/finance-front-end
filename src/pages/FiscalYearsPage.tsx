import { useEffect, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'

interface FiscalYear {
  id: number
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  closed_at: string | null
  closing_entry_id: number | null
  unposted_count: number
  net_profit: string
  is_profit: boolean
}

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`
const yearEnd   = () => `${new Date().getFullYear()}-12-31`

export default function FiscalYearsPage() {
  const [years, setYears]     = useState<FiscalYear[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', start_date: yearStart(), end_date: yearEnd() })
  const [creating, setCreating] = useState(false)

  // Close dialog
  const [closeTarget, setCloseTarget]   = useState<FiscalYear | null>(null)
  const [retainedAcct, setRetainedAcct] = useState<Account | null>(null)
  const [closing, setClosing]           = useState(false)

  // Reopen dialog
  const [reopenTarget, setReopenTarget] = useState<FiscalYear | null>(null)
  const [reopening, setReopening]       = useState(false)

  const load = () => {
    setLoading(true)
    api.get<FiscalYear[]>('/api/fiscal-years')
      .then(r => setYears(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    accountsApi.list().then(setAccounts)
  }, [])

  const equityAccounts = accounts.filter(a => a.type === 'equity')

  const handleCreate = async () => {
    if (!form.name || !form.start_date || !form.end_date) return
    setCreating(true)
    try {
      await api.post('/api/fiscal-years', form)
      setCreateOpen(false)
      setForm({ name: '', start_date: yearStart(), end_date: yearEnd() })
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'تعذّر الإنشاء')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = async () => {
    if (!closeTarget || !retainedAcct) return
    setClosing(true)
    try {
      await api.post(`/api/fiscal-years/${closeTarget.id}/close`, {
        retained_earnings_account_id: retainedAcct.id,
      })
      setCloseTarget(null)
      setRetainedAcct(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'تعذّر الإغلاق')
    } finally {
      setClosing(false)
    }
  }

  const handleReopen = async () => {
    if (!reopenTarget) return
    setReopening(true)
    try {
      await api.post(`/api/fiscal-years/${reopenTarget.id}/reopen`)
      setReopenTarget(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'تعذّر إعادة الفتح')
    } finally {
      setReopening(false)
    }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>السنوات المالية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            إدارة السنوات المالية وإقفال الفترات المحاسبية
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          سنة جديدة
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>اسم السنة</TableCell>
                <TableCell align="center">من</TableCell>
                <TableCell align="center">إلى</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">قيود غير مرحّلة</TableCell>
                <TableCell align="center">صافي الربح / الخسارة</TableCell>
                <TableCell align="center">تاريخ الإغلاق</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {years.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد سنوات مالية — أنشئ سنة جديدة للبدء
                  </TableCell>
                </TableRow>
              )}
              {years.map(y => (
                <TableRow key={y.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{y.name}</TableCell>
                  <TableCell align="center" sx={{ direction: 'ltr' }}>{y.start_date}</TableCell>
                  <TableCell align="center" sx={{ direction: 'ltr' }}>{y.end_date}</TableCell>
                  <TableCell align="center">
                    {y.status === 'open'
                      ? <Chip label="مفتوحة" color="success" size="small" />
                      : <Chip label="مغلقة"  color="default" size="small" icon={<LockOutlinedIcon />} />}
                  </TableCell>
                  <TableCell align="center">
                    {y.unposted_count > 0
                      ? <Chip label={y.unposted_count} color="warning" size="small" />
                      : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, direction: 'ltr', color: y.is_profit ? 'success.main' : 'error.main' }}
                    >
                      {y.is_profit ? '+' : '-'}{numFmt(Math.abs(Number(y.net_profit)))}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary', direction: 'ltr' }}>
                    {y.closed_at ? new Date(y.closed_at).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {y.status === 'open' ? (
                      <Tooltip title="إغلاق السنة المالية">
                        <IconButton size="small" color="warning" onClick={() => setCloseTarget(y)}>
                          <LockOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="إعادة فتح السنة المالية">
                        <IconButton size="small" color="primary" onClick={() => setReopenTarget(y)}>
                          <LockOpenOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إنشاء سنة مالية جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField
            label="اسم السنة"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder={`السنة المالية ${new Date().getFullYear()}`}
            fullWidth size="small"
          />
          <TextField
            label="تاريخ البداية" type="date" value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="تاريخ النهاية" type="date" value={form.end_date}
            onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !form.name}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Close dialog ── */}
      <Dialog open={!!closeTarget} onClose={() => setCloseTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إغلاق السنة المالية</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          {closeTarget && (
            <>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{closeTarget.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr', display: 'block' }}>
                  {closeTarget.start_date} — {closeTarget.end_date}
                </Typography>
              </Box>

              {/* Net profit summary */}
              <Box sx={{
                p: 2, mb: 2, borderRadius: 1,
                bgcolor: closeTarget.is_profit ? 'success.50' : 'error.50',
                border: '1px solid',
                borderColor: closeTarget.is_profit ? 'success.200' : 'error.200',
              }}>
                <Typography variant="caption" color="text.secondary">
                  {closeTarget.is_profit ? 'صافي الربح المحقق' : 'صافي الخسارة'}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, direction: 'ltr', color: closeTarget.is_profit ? 'success.main' : 'error.main' }}
                >
                  {numFmt(Math.abs(Number(closeTarget.net_profit)))}
                </Typography>
              </Box>

              {closeTarget.unposted_count > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  يوجد {closeTarget.unposted_count} قيد غير مرحَّل — لن يُدرج في قيد الإقفال
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                اختر حساب الأرباح المحتجزة (سيُرحَّل إليه صافي الربح/الخسارة):
              </Typography>
              <Autocomplete
                options={equityAccounts}
                value={retainedAcct}
                onChange={(_, v) => setRetainedAcct(v)}
                getOptionLabel={a => `${a.code} — ${a.name}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText="لا توجد حسابات حقوق ملكية"
                renderInput={p => <TextField {...p} label="حساب الأرباح المحتجزة" size="small" />}
                size="small"
              />
              <DialogContentText sx={{ mt: 2, fontSize: 13 }}>
                سيتم إنشاء قيد إقفال مرحَّل يُصفّر حسابات الإيرادات والمصروفات وتقييد
                أي تعديل على قيود هذه الفترة.
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseTarget(null)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleClose}
            disabled={closing || !retainedAcct}
            startIcon={closing ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}
          >
            إغلاق السنة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reopen dialog ── */}
      <Dialog open={!!reopenTarget} onClose={() => setReopenTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>إعادة فتح السنة المالية</DialogTitle>
        <DialogContent>
          <DialogContentText>
            سيتم حذف قيد الإقفال وإعادة فتح السنة للتعديل. هذا الإجراء قد يؤثر على
            دقة التقارير إذا كانت ثمة سنة مالية لاحقة.
          </DialogContentText>
          {reopenTarget && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{reopenTarget.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReopenTarget(null)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReopen}
            disabled={reopening}
            startIcon={reopening ? <CircularProgress size={16} color="inherit" /> : <LockOpenOutlinedIcon />}
          >
            إعادة الفتح
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
