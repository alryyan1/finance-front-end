import { useEffect, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Divider, IconButton, MenuItem, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import AddIcon from '@mui/icons-material/Add'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DateRangeOutlinedIcon from '@mui/icons-material/DateRangeOutlined'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'

type PeriodType = 'yearly' | 'monthly'

interface FiscalYear {
  id: number
  name: string
  period_type: PeriodType
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  closed_at: string | null
  closing_entry_id: number | null
  unposted_count: number
  net_profit: string
  is_profit: boolean
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const currentYear = new Date().getFullYear()
const yearStart   = () => `${currentYear}-01-01`
const yearEnd     = () => `${currentYear}-12-31`

function lastDayOfMonth(year: number, month: number): string {
  return new Date(year, month, 0).toISOString().slice(0, 10)
}
function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export default function FiscalYearsPage() {
  const [years, setYears]       = useState<FiscalYear[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Filter
  const [filterType, setFilterType] = useState<'all' | PeriodType>('all')

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [periodType, setPeriodType] = useState<PeriodType>('yearly')

  // Yearly form
  const [yearlyForm, setYearlyForm] = useState({ name: '', start_date: yearStart(), end_date: yearEnd() })

  // Monthly form
  const [monthYear,  setMonthYear]  = useState(currentYear)
  const [monthMonth, setMonthMonth] = useState(0) // 0 = all 12 months

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

  // Monthly period preview
  const monthlyName      = monthMonth === 0
    ? `جميع أشهر ${monthYear} (12 شهراً)`
    : `${ARABIC_MONTHS[monthMonth - 1]} ${monthYear}`
  const monthlyStartDate = monthMonth > 0 ? firstDayOfMonth(monthYear, monthMonth) : ''
  const monthlyEndDate   = monthMonth > 0 ? lastDayOfMonth(monthYear, monthMonth)  : ''

  const openCreateDialog = () => {
    setYearlyForm({ name: '', start_date: yearStart(), end_date: yearEnd() })
    setMonthYear(currentYear)
    setMonthMonth(0)
    setError(null)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      if (periodType === 'yearly') {
        if (!yearlyForm.name || !yearlyForm.start_date || !yearlyForm.end_date) return
        await api.post('/api/fiscal-years', { ...yearlyForm, period_type: 'yearly' })
      } else if (monthMonth === 0) {
        // Bulk: create all 12 months
        const res = await api.post('/api/fiscal-years/bulk-months', { year: monthYear })
        const { created, skipped } = res.data
        if (skipped > 0) setError(`تم إنشاء ${created} شهراً — تم تخطي ${skipped} شهراً لأنها موجودة مسبقاً`)
      } else {
        // Single month
        await api.post('/api/fiscal-years', {
          name:        `${ARABIC_MONTHS[monthMonth - 1]} ${monthYear}`,
          period_type: 'monthly',
          start_date:  monthlyStartDate,
          end_date:    monthlyEndDate,
        })
      }
      setCreateOpen(false)
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

  const filteredYears = years.filter(y =>
    filterType === 'all' || y.period_type === filterType
  )

  const createDisabled = creating || (
    periodType === 'yearly'
      ? !yearlyForm.name
      : false
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>الفترات المالية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            إدارة الفترات المالية السنوية والشهرية
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <HelpButton title="دليل استخدام الفترات المالية">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي الفترة المالية؟</Typography>
                <Typography variant="body2">الفترة المالية هي النطاق الزمني الذي يُسجَّل فيه النشاط المحاسبي. عادةً سنة كاملة (يناير–ديسمبر)، أو يمكن تقسيمها لفترات شهرية.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>إنشاء فترة جديدة</Typography>
                <Typography variant="body2">اضغط "فترة جديدة"، حدد تاريخ البداية والنهاية. يمكن إنشاء فترة سنوية وتقسيمها تلقائياً لـ 12 فترة شهرية.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>قفل الفترة</Typography>
                <Typography variant="body2">بعد إغلاق الفترة المالية اضغط أيقونة القفل لمنع إضافة أو تعديل أي قيود فيها. الفترات المقفولة محمية من التغيير.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>الفترة النشطة</Typography>
                <Typography variant="body2">الفترة المحددة في منتقي السنة المالية هي التي تُستخدم في جميع صفحات النظام تلقائياً عند عرض البيانات.</Typography></Box>
            </Box>
          </HelpButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            فترة جديدة
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Filter */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup value={filterType} exclusive size="small"
          onChange={(_, v) => v && setFilterType(v)}>
          <ToggleButton value="all">الكل</ToggleButton>
          <ToggleButton value="yearly" sx={{ gap: 0.5 }}>
            <DateRangeOutlinedIcon fontSize="small" /> سنوية
          </ToggleButton>
          <ToggleButton value="monthly" sx={{ gap: 0.5 }}>
            <CalendarMonthOutlinedIcon fontSize="small" /> شهرية
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>اسم الفترة</TableCell>
                <TableCell align="center" sx={{ width: 80 }}>النوع</TableCell>
                <TableCell align="center">من</TableCell>
                <TableCell align="center">إلى</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">قيود غير مرحّلة</TableCell>
                <TableCell align="center">صافي الربح / الخسارة</TableCell>
                <TableCell align="center">تاريخ الإغلاق</TableCell>
                <TableCell align="center" sx={{ width: 70 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredYears.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد فترات مالية — أنشئ فترة جديدة للبدء
                  </TableCell>
                </TableRow>
              )}
              {filteredYears.map(y => (
                <TableRow key={y.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{y.name}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      icon={y.period_type === 'yearly' ? <DateRangeOutlinedIcon /> : <CalendarMonthOutlinedIcon />}
                      label={y.period_type === 'yearly' ? 'سنوية' : 'شهرية'}
                      color={y.period_type === 'yearly' ? 'primary' : 'secondary'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ direction: 'ltr', fontSize: 12 }}>{y.start_date}</TableCell>
                  <TableCell align="center" sx={{ direction: 'ltr', fontSize: 12 }}>{y.end_date}</TableCell>
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
                    <Typography variant="body2" sx={{ fontWeight: 600, direction: 'ltr',
                      color: y.is_profit ? 'success.main' : 'error.main' }}>
                      {y.is_profit ? '+' : '-'}{numFmt(Math.abs(Number(y.net_profit)))}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'text.secondary', direction: 'ltr', fontSize: 12 }}>
                    {y.closed_at ? new Date(y.closed_at).toLocaleDateString('en-GB') : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {y.status === 'open' ? (
                      <Tooltip title="إغلاق الفترة">
                        <IconButton size="small" color="warning" onClick={() => setCloseTarget(y)}>
                          <LockOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="إعادة فتح الفترة">
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
        <DialogTitle>إنشاء فترة مالية جديدة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

          {/* Period type toggle */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              نوع الفترة
            </Typography>
            <ToggleButtonGroup value={periodType} exclusive fullWidth size="small"
              onChange={(_, v) => v && setPeriodType(v)}>
              <ToggleButton value="yearly" sx={{ gap: 0.5 }}>
                <DateRangeOutlinedIcon fontSize="small" /> سنوية
              </ToggleButton>
              <ToggleButton value="monthly" sx={{ gap: 0.5 }}>
                <CalendarMonthOutlinedIcon fontSize="small" /> شهرية
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* ── Yearly fields ── */}
          {periodType === 'yearly' && (
            <>
              <TextField
                label="اسم الفترة"
                value={yearlyForm.name}
                onChange={e => setYearlyForm(f => ({ ...f, name: e.target.value }))}
                placeholder={`السنة المالية ${currentYear}`}
                fullWidth size="small"
              />
              <TextField
                label="تاريخ البداية" type="date" value={yearlyForm.start_date}
                onChange={e => setYearlyForm(f => ({ ...f, start_date: e.target.value }))}
                fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="تاريخ النهاية" type="date" value={yearlyForm.end_date}
                onChange={e => setYearlyForm(f => ({ ...f, end_date: e.target.value }))}
                fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }}
              />
            </>
          )}

          {/* ── Monthly fields ── */}
          {periodType === 'monthly' && (
            <>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  label="السنة" type="number" value={monthYear}
                  onChange={e => setMonthYear(Number(e.target.value))}
                  size="small" sx={{ width: 110 }}
                  slotProps={{ htmlInput: { min: 2000, max: 2100 } }}
                />
                <TextField
                  select label="الشهر" value={monthMonth} size="small" fullWidth
                  onChange={e => setMonthMonth(Number(e.target.value))}
                >
                  <MenuItem value={0}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label="12" size="small" color="primary" />
                      جميع الأشهر
                    </Box>
                  </MenuItem>
                  {ARABIC_MONTHS.map((name, i) => (
                    <MenuItem key={i + 1} value={i + 1}>{name}</MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Preview box */}
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">معاينة:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>{monthlyName}</Typography>
                {monthMonth > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr', display: 'block' }}>
                    {monthlyStartDate} — {monthlyEndDate}
                  </Typography>
                )}
                {monthMonth === 0 && (
                  <Typography variant="caption" color="primary.main" sx={{ display: 'block' }}>
                    سيتم إنشاء 12 فترة شهرية — الأشهر الموجودة مسبقاً ستُتخطى تلقائياً
                  </Typography>
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={createDisabled}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {periodType === 'monthly' && monthMonth === 0 ? 'إنشاء 12 شهراً' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Close dialog ── */}
      <Dialog open={!!closeTarget} onClose={() => setCloseTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>إغلاق الفترة المالية</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          {closeTarget && (
            <>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{closeTarget.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr', display: 'block' }}>
                  {closeTarget.start_date} — {closeTarget.end_date}
                </Typography>
              </Box>

              <Box sx={{
                p: 2, mb: 2, borderRadius: 1, bgcolor: closeTarget.is_profit ? 'success.50' : 'error.50',
                border: '1px solid', borderColor: closeTarget.is_profit ? 'success.200' : 'error.200',
              }}>
                <Typography variant="caption" color="text.secondary">
                  {closeTarget.is_profit ? 'صافي الربح المحقق' : 'صافي الخسارة'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, direction: 'ltr',
                  color: closeTarget.is_profit ? 'success.main' : 'error.main' }}>
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
                اختر حساب الأرباح المحتجزة:
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
                سيتم إنشاء قيد إقفال مرحَّل يُصفّر حسابات الإيرادات والمصروفات.
              </DialogContentText>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleClose}
            disabled={closing || !retainedAcct}
            startIcon={closing ? <CircularProgress size={16} color="inherit" /> : <LockOutlinedIcon />}>
            إغلاق الفترة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Reopen dialog ── */}
      <Dialog open={!!reopenTarget} onClose={() => setReopenTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>إعادة فتح الفترة المالية</DialogTitle>
        <DialogContent>
          <DialogContentText>
            سيتم حذف قيد الإقفال وإعادة فتح الفترة للتعديل.
          </DialogContentText>
          {reopenTarget && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{reopenTarget.name}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReopenTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleReopen} disabled={reopening}
            startIcon={reopening ? <CircularProgress size={16} color="inherit" /> : <LockOpenOutlinedIcon />}>
            إعادة الفتح
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
