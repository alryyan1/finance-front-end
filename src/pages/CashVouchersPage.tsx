import { useEffect, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  IconButton, InputAdornment, MenuItem, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'
import { openPdf } from '@/api/pdf'

type VoucherType    = 'receipt' | 'payment'
type PaymentMethod  = 'cash' | 'bank_transfer' | 'check'
type FilterType     = 'all' | VoucherType

interface Party { id: number; name: string }

interface CashVoucher {
  id: number
  type: VoucherType
  date: string
  reference: string | null
  amount: string
  payment_method: PaymentMethod
  cash_account_id: number
  contra_account_id: number
  party_id: number | null
  description: string | null
  journal_entry_id: number | null
  cash_account: { id: number; code: string; name: string }
  contra_account: { id: number; code: string; name: string }
  party: { id: number; name: string } | null
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash:          'نقدي',
  bank_transfer: 'تحويل بنكي',
  check:         'شيك',
}

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

const emptyForm = () => ({
  type:              'receipt' as VoucherType,
  date:              today(),
  reference:         '',
  amount:            '',
  payment_method:    'cash' as PaymentMethod,
  cash_account_id:   null as Account | null,
  contra_account_id: null as Account | null,
  party_id:          null as Party | null,
  description:       '',
})

export default function CashVouchersPage() {
  const [vouchers, setVouchers]   = useState<CashVoucher[]>([])
  const [accounts, setAccounts]   = useState<Account[]>([])
  const [parties, setParties]     = useState<Party[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm]             = useState(emptyForm())
  const [creating, setCreating]     = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CashVoucher | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // PDF loading per row
  const [pdfLoading, setPdfLoading] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    const params: Record<string, string> = { from, to }
    if (filterType !== 'all') params.type = filterType
    api.get<CashVoucher[]>('/api/cash-vouchers', { params })
      .then(r => setVouchers(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    accountsApi.list().then(setAccounts)
    api.get<Party[]>('/api/parties').then(r => setParties(r.data))
  }, [])

  // Asset accounts suitable for cash/bank
  const cashAccounts = accounts.filter(a => a.type === 'asset')

  const handleCreate = async () => {
    if (!form.cash_account_id || !form.contra_account_id || !form.amount) return
    setCreating(true)
    setError(null)
    try {
      await api.post('/api/cash-vouchers', {
        type:              form.type,
        date:              form.date,
        reference:         form.reference || undefined,
        amount:            form.amount,
        payment_method:    form.payment_method,
        cash_account_id:   form.cash_account_id.id,
        contra_account_id: form.contra_account_id.id,
        party_id:          form.party_id?.id ?? undefined,
        description:       form.description || undefined,
      })
      setCreateOpen(false)
      setForm(emptyForm())
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'تعذّر الحفظ')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/api/cash-vouchers/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'تعذّر الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const handlePdf = async (v: CashVoucher) => {
    setPdfLoading(v.id)
    try { await openPdf(`/api/cash-vouchers/${v.id}/voucher`, {}) }
    finally { setPdfLoading(null) }
  }

  const totalReceipts = vouchers.filter(v => v.type === 'receipt').reduce((s, v) => s + Number(v.amount), 0)
  const totalPayments = vouchers.filter(v => v.type === 'payment').reduce((s, v) => s + Number(v.amount), 0)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>إذونات القبض والصرف</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            تسجيل الحركات النقدية وإصدار الإذونات
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          إذن جديد
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Chip icon={<ReceiptOutlinedIcon />} label={`إجمالي القبض: ${numFmt(totalReceipts)}`} color="success" variant="outlined" />
        <Chip icon={<PaymentsOutlinedIcon />} label={`إجمالي الصرف: ${numFmt(totalPayments)}`}  color="error"   variant="outlined" />
        <Chip label={`الصافي: ${numFmt(totalReceipts - totalPayments)}`} color={totalReceipts >= totalPayments ? 'primary' : 'warning'} variant="outlined" />
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField label="من تاريخ" type="date" value={from} onChange={e => setFrom(e.target.value)}
            size="small" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="إلى تاريخ" type="date" value={to} onChange={e => setTo(e.target.value)}
            size="small" slotProps={{ inputLabel: { shrink: true } }} />
          <ToggleButtonGroup value={filterType} exclusive size="small"
            onChange={(_, v) => v && setFilterType(v)}>
            <ToggleButton value="all">الكل</ToggleButton>
            <ToggleButton value="receipt">قبض</ToggleButton>
            <ToggleButton value="payment">صرف</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="contained" onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : 'عرض'}
          </Button>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell align="center" sx={{ width: 60 }}>رقم</TableCell>
                <TableCell align="center" sx={{ width: 110 }}>التاريخ</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>النوع</TableCell>
                <TableCell>الطرف</TableCell>
                <TableCell>الحساب النقدي</TableCell>
                <TableCell>الحساب المقابل</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>طريقة الدفع</TableCell>
                <TableCell align="left" sx={{ width: 130 }}>المبلغ</TableCell>
                <TableCell>البيان</TableCell>
                <TableCell align="center" sx={{ width: 90 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد إذونات في هذه الفترة
                  </TableCell>
                </TableRow>
              )}
              {vouchers.map(v => (
                <TableRow key={v.id} hover>
                  <TableCell align="center" sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {v.reference || `#${v.id}`}
                  </TableCell>
                  <TableCell align="center" sx={{ direction: 'ltr', fontSize: 12 }}>{v.date}</TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={v.type === 'receipt' ? <ReceiptOutlinedIcon /> : <PaymentsOutlinedIcon />}
                      label={v.type === 'receipt' ? 'قبض' : 'صرف'}
                      color={v.type === 'receipt' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{v.party?.name ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{v.cash_account.name}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{v.contra_account.name}</TableCell>
                  <TableCell align="center" sx={{ fontSize: 12 }}>
                    {PAYMENT_METHOD_LABELS[v.payment_method]}
                  </TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                    color: v.type === 'receipt' ? 'success.main' : 'error.main' }}>
                    {numFmt(v.amount)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 180,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v.description ?? '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="طباعة الإذن">
                      <IconButton size="small" color="primary" onClick={() => handlePdf(v)}
                        disabled={pdfLoading === v.id}>
                        {pdfLoading === v.id
                          ? <CircularProgress size={16} />
                          : <PictureAsPdfOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف الإذن">
                      <IconButton size="small" color="error" onClick={() => setDeleteTarget(v)}>
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إذن جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

          {/* Type toggle */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              نوع الإذن
            </Typography>
            <ToggleButtonGroup value={form.type} exclusive fullWidth size="small"
              onChange={(_, v) => v && setForm(f => ({ ...f, type: v }))}>
              <ToggleButton value="receipt" sx={{ gap: 0.5 }}>
                <ReceiptOutlinedIcon fontSize="small" /> إذن قبض
              </ToggleButton>
              <ToggleButton value="payment" sx={{ gap: 0.5 }}>
                <PaymentsOutlinedIcon fontSize="small" /> إذن صرف
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="التاريخ" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              fullWidth size="small" slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="رقم الإذن (اختياري)" value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              fullWidth size="small" placeholder="يُولَّد تلقائياً" />
          </Box>

          <TextField
            label="المبلغ" type="number" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            fullWidth size="small"
            slotProps={{ input: { startAdornment: <InputAdornment position="start">ر.س</InputAdornment> } }}
          />

          <TextField
            select label="طريقة الدفع" value={form.payment_method} size="small" fullWidth
            onChange={e => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}>
            <MenuItem value="cash">نقدي</MenuItem>
            <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
            <MenuItem value="check">شيك</MenuItem>
          </TextField>

          <Autocomplete
            options={cashAccounts}
            value={form.cash_account_id}
            onChange={(_, v) => setForm(f => ({ ...f, cash_account_id: v }))}
            getOptionLabel={a => `${a.code} — ${a.name}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="لا توجد حسابات"
            size="small"
            renderInput={p => (
              <TextField {...p}
                label={form.type === 'receipt' ? 'حساب الصندوق / البنك (المستلِم)' : 'حساب الصندوق / البنك (الدافع)'}
              />
            )}
          />

          <Autocomplete
            options={accounts}
            value={form.contra_account_id}
            onChange={(_, v) => setForm(f => ({ ...f, contra_account_id: v }))}
            getOptionLabel={a => `${a.code} — ${a.name}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="لا توجد حسابات"
            size="small"
            renderInput={p => (
              <TextField {...p}
                label={form.type === 'receipt' ? 'الحساب المقابل (المصدر)' : 'الحساب المقابل (الوجهة)'}
              />
            )}
          />

          <Autocomplete
            options={parties}
            value={form.party_id}
            onChange={(_, v) => setForm(f => ({ ...f, party_id: v }))}
            getOptionLabel={p => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="لا توجد أطراف"
            size="small"
            renderInput={p => <TextField {...p} label="الطرف (اختياري)" />}
          />

          <TextField
            label="البيان" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            fullWidth size="small" multiline rows={2}
            placeholder={form.type === 'receipt' ? 'مثال: سداد فاتورة رقم 101' : 'مثال: دفع إيجار شهر مايو'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color={form.type === 'receipt' ? 'success' : 'error'}
            onClick={handleCreate}
            disabled={creating || !form.cash_account_id || !form.contra_account_id || !form.amount}
            startIcon={creating ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {form.type === 'receipt' ? 'حفظ إذن القبض' : 'حفظ إذن الصرف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>حذف الإذن</DialogTitle>
        <DialogContent>
          <DialogContentText>
            سيتم حذف الإذن والقيد المحاسبي المرتبط به نهائياً. هذا الإجراء لا يمكن التراجع عنه.
          </DialogContentText>
          {deleteTarget && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {deleteTarget.type === 'receipt' ? 'إذن قبض' : 'إذن صرف'} —{' '}
                {deleteTarget.reference ?? `#${deleteTarget.id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                المبلغ: {numFmt(deleteTarget.amount)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutlinedIcon />}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
