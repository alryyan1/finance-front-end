import { useEffect, useState } from 'react'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, MenuItem,
  Paper, Tab, Tabs, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import HelpIcon from '@mui/icons-material/Help'
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'

import { pettyCashApi } from '@/api/pettyCash'
import { accountsApi } from '@/api/accounts'
import { useAuth } from '@/context/AuthContext'
import type { Account } from '@/types/account'
import type {
  PettyCashFund, PettyCashRequest, PettyCashReplenishment, RequestCategory,
} from '@/types/pettyCash'
import {
  CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS,
} from '@/types/pettyCash'

const numFmt = (v: string | number | null | undefined) =>
  (parseFloat(String(v ?? 0)) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [RequestCategory, string][]

// ─── Fund status card ───────────────────────────────────────────────────────

function FundCard({ fund, onRefresh }: { fund: PettyCashFund; onRefresh: () => void }) {
  const balance   = parseFloat(String(fund.current_balance  ?? 0)) || 0
  const max       = parseFloat(String(fund.max_amount       ?? 0)) || 0
  const threshold = parseFloat(String(fund.low_balance_threshold ?? 0)) || 0
  const pct       = max > 0 ? Math.min((balance / max) * 100, 100) : 0
  const isLow     = balance <= threshold

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{fund.name}</Typography>
          <Typography variant="body2" color="text.secondary">أمين الصندوق: {fund.custodian_name}</Typography>
        </Box>
        <Tooltip title="تحديث">
          <Button size="small" onClick={onRefresh} startIcon={<RefreshIcon />}>تحديث</Button>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, mb: 3 }}>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">الرصيد الحالي</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: isLow ? 'error.main' : 'success.main' }}>
            {numFmt(fund.current_balance)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">الحد الأقصى</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{numFmt(fund.max_amount)}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary">حد التنبيه</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'warning.main' }}>{numFmt(fund.low_balance_threshold)}</Typography>
        </Box>
      </Box>

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">نسبة الرصيد</Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>{pct.toFixed(0)}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          color={isLow ? 'error' : pct < 50 ? 'warning' : 'success'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {isLow && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 2 }}>
          الرصيد منخفض — يُنصح بطلب تعبئة الصندوق
        </Alert>
      )}
    </Paper>
  )
}

// ─── Request row actions ────────────────────────────────────────────────────

function RequestActions({
  req, onApprove, onReject, onPay,
}: {
  req: PettyCashRequest
  onApprove: (id: number) => void
  onReject: (id: number) => void
  onPay: (id: number) => void
}) {
  if (req.status === 'pending') return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title="موافقة">
        <Button size="small" color="success" variant="outlined" onClick={() => onApprove(req.id)}
          startIcon={<CheckCircleIcon />}>موافقة</Button>
      </Tooltip>
      <Tooltip title="رفض">
        <Button size="small" color="error" variant="outlined" onClick={() => onReject(req.id)}
          startIcon={<CancelOutlinedIcon />}>رفض</Button>
      </Tooltip>
    </Box>
  )

  if (req.status === 'approved') return (
    <Tooltip title="صرف المبلغ">
      <Button size="small" color="primary" variant="contained" onClick={() => onPay(req.id)}
        startIcon={<PaymentsOutlinedIcon />}>صرف</Button>
    </Tooltip>
  )

  return null
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function PettyCashPage() {
  const { user } = useAuth()
  const [tab, setTab]                   = useState(0)
  const [helpOpen, setHelpOpen]         = useState(false)
  const [fund, setFund]                 = useState<PettyCashFund | null>(null)
  const [requests, setRequests]         = useState<PettyCashRequest[]>([])
  const [replenishments, setReplenishments] = useState<PettyCashReplenishment[]>([])
  const [accounts, setAccounts]         = useState<Account[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  // Dialogs
  const [reqDialog, setReqDialog]       = useState(false)
  const [replDialog, setReplDialog]     = useState(false)
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'pay' | 'approveRepl' | 'rejectRepl'
    id: number
    label?: string
  } | null>(null)
  const [actionNote, setActionNote]     = useState('')

  const defaultRequesterName = () => user?.name ?? ''

  // Request form
  const [reqForm, setReqForm] = useState({
    requester_name: user?.name ?? '', date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(),
    amount: '', category: 'other' as RequestCategory,
    description: '', reference: '', expense_account_id: '',
    document: null as File | null,
  })

  // Replenishment form
  const [replForm, setReplForm] = useState({
    amount: '', description: '', requested_by: '',
  })

  // Fund setup form
  const [fundForm, setFundForm] = useState({
    name: 'صندوق النثريات', custodian_name: '',
    account_id: '', bank_account_id: '',
    max_amount: '1000', low_balance_threshold: '200',
  })

  const loadAll = async () => {
    setLoading(true)
    // Load accounts independently so they always show even if no fund yet
    accountsApi.list().then(setAccounts).catch(() => {})
    try {
      const [f, reqs, repls] = await Promise.all([
        pettyCashApi.getFund(),
        pettyCashApi.listRequests(),
        pettyCashApi.listReplenishments(),
      ])
      setFund(f)
      setRequests(reqs)
      setReplenishments(repls)
      if (f) {
        setFundForm({
          name: f.name, custodian_name: f.custodian_name,
          account_id: String(f.account_id), bank_account_id: String(f.bank_account_id),
          max_amount: f.max_amount, low_balance_threshold: f.low_balance_threshold,
        })
      }
    } catch {
      setError('تعذّر تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const pendingRepl  = replenishments.filter(r => r.status === 'pending').length

  // ── Actions ──────────────────────────────────────────────────────────────

  const openDocument = async (req: PettyCashRequest) => {
    try {
      const blob = await pettyCashApi.fetchDocument(req.id)
      const url  = URL.createObjectURL(blob)
      const win  = window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)
      if (!win) setError('يرجى السماح بالنوافذ المنبثقة في المتصفح')
    } catch {
      setError('تعذّر فتح المستند')
    }
  }

  const handleCreateRequest = async () => {
    try {
      const fd = new FormData()
      fd.append('requester_name', reqForm.requester_name)
      fd.append('date', reqForm.date)
      fd.append('amount', reqForm.amount)
      fd.append('category', reqForm.category)
      fd.append('description', reqForm.description)
      if (reqForm.reference) fd.append('reference', reqForm.reference)
      if (reqForm.expense_account_id) fd.append('expense_account_id', reqForm.expense_account_id)
      if (reqForm.document) fd.append('document', reqForm.document)

      await pettyCashApi.createRequest(fd)
      setReqDialog(false)
      setReqForm({ requester_name: defaultRequesterName(), date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })(), amount: '', category: 'other', description: '', reference: '', expense_account_id: '', document: null })
      loadAll()
    } catch { setError('فشل إنشاء الطلب') }
  }

  const handleCreateReplenishment = async () => {
    try {
      await pettyCashApi.createReplenishment({
        amount: Number(replForm.amount),
        description: replForm.description || undefined,
        requested_by: replForm.requested_by,
      })
      setReplDialog(false)
      setReplForm({ amount: '', description: '', requested_by: '' })
      loadAll()
    } catch { setError('فشل إنشاء طلب التعبئة') }
  }

  const handleAction = async () => {
    if (!actionDialog) return
    try {
      const { type, id } = actionDialog
      if (type === 'approve')      await pettyCashApi.approveRequest(id, actionNote || 'المدير')
      if (type === 'reject')       await pettyCashApi.rejectRequest(id, actionNote)
      if (type === 'pay')          await pettyCashApi.payRequest(id, actionNote || 'أمين الصندوق')
      if (type === 'approveRepl')  await pettyCashApi.approveReplenishment(id, actionNote || 'المدير')
      if (type === 'rejectRepl')   await pettyCashApi.rejectReplenishment(id, actionNote)
      setActionDialog(null)
      setActionNote('')
      loadAll()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'فشل تنفيذ الإجراء')
    }
  }

  const handleSaveFund = async () => {
    try {
      await pettyCashApi.setupFund({
        ...fundForm,
        account_id: Number(fundForm.account_id) as unknown as number,
        bank_account_id: Number(fundForm.bank_account_id) as unknown as number,
        max_amount: fundForm.max_amount as unknown as string,
        low_balance_threshold: fundForm.low_balance_threshold as unknown as string,
      })
      loadAll()
    } catch { setError('فشل حفظ إعدادات الصندوق') }
  }

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
      <CircularProgress />
    </Box>
  )

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>صندوق النثريات</Typography>
          <Tooltip title="دليل الاستخدام">
            <Button size="small" onClick={() => setHelpOpen(true)} sx={{ minWidth: 0, p: 0.5, color: 'text.secondary' }}>
              <HelpIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Box>
        {fund && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => setReplDialog(true)}>
              طلب تعبئة
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setReqDialog(true)}>
              طلب صرف جديد
            </Button>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Fund card */}
      {fund && <FundCard fund={fund} onRefresh={loadAll} />}
      {!fund && (
        <Alert severity="info" sx={{ mb: 3 }}>
          لم يتم إعداد الصندوق بعد — اذهب إلى تبويب الإعدادات
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={<Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          الطلبات {pendingCount > 0 && <Chip label={pendingCount} size="small" color="warning" />}
        </Box>} />
        <Tab label={<Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          التعبئة {pendingRepl > 0 && <Chip label={pendingRepl} size="small" color="warning" />}
        </Box>} />
        <Tab label={<Box sx={{ display: 'flex', gap: 0.5 }}><SettingsOutlinedIcon fontSize="small" />إعدادات الصندوق</Box>} />
      </Tabs>

      {/* ── Tab 0: Requests ── */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>التاريخ</TableCell>
                <TableCell>مقدم الطلب</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>البيان</TableCell>
                <TableCell align="center">المبلغ</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">مستند</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>لا توجد طلبات</TableCell></TableRow>
              )}
              {requests.map(req => (
                <TableRow key={req.id} hover
                  sx={{ bgcolor: req.status === 'pending' ? 'rgba(237,108,2,0.04)' : undefined }}>
                  <TableCell sx={{ color: 'text.secondary', direction: 'ltr' }}>{req.date}</TableCell>
                  <TableCell>{req.requester_name}</TableCell>
                  <TableCell><Chip label={CATEGORY_LABELS[req.category]} size="small" variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography variant="body2">{req.description}</Typography>
                    {req.rejection_reason && (
                      <Typography variant="caption" color="error">سبب الرفض: {req.rejection_reason}</Typography>
                    )}
                    {req.approved_by && req.status !== 'rejected' && (
                      <Typography variant="caption" color="text.secondary"> وافق: {req.approved_by}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, direction: 'ltr' }}>
                    {numFmt(req.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={STATUS_LABELS[req.status]} color={STATUS_COLORS[req.status]} size="small" />
                  </TableCell>
                  <TableCell align="center">
                    {req.document_path ? (
                      <Tooltip title={req.document_original_name ?? 'عرض المستند'}>
                        <IconButton size="small" color="error" onClick={() => openDocument(req)}>
                          <PictureAsPdfOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <RequestActions
                      req={req}
                      onApprove={id => setActionDialog({ type: 'approve', id, label: 'اسم المعتمد' })}
                      onReject={id  => setActionDialog({ type: 'reject',  id, label: 'سبب الرفض' })}
                      onPay={id     => setActionDialog({ type: 'pay',     id, label: 'اسم أمين الصندوق' })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Tab 1: Replenishments ── */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>التاريخ</TableCell>
                <TableCell>مقدم الطلب</TableCell>
                <TableCell>البيان</TableCell>
                <TableCell align="center">المبلغ</TableCell>
                <TableCell align="center">الحالة</TableCell>
                <TableCell align="center">إجراء</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {replenishments.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>لا توجد طلبات تعبئة</TableCell></TableRow>
              )}
              {replenishments.map(r => (
                <TableRow key={r.id} hover
                  sx={{ bgcolor: r.status === 'pending' ? 'rgba(237,108,2,0.04)' : undefined }}>
                  <TableCell sx={{ color: 'text.secondary', direction: 'ltr' }}>
                    {new Date(r.created_at).toLocaleDateString('en-CA')}
                  </TableCell>
                  <TableCell>{r.requested_by}</TableCell>
                  <TableCell>
                    {r.description || '—'}
                    {r.rejection_reason && (
                      <Typography variant="caption" color="error" display="block">سبب الرفض: {r.rejection_reason}</Typography>
                    )}
                    {r.approved_by && r.status === 'approved' && (
                      <Typography variant="caption" color="success.main" display="block">اعتمد: {r.approved_by}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(r.amount)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={{ pending: 'معلق', approved: 'موافق', rejected: 'مرفوض' }[r.status]}
                      color={{ pending: 'warning', approved: 'success', rejected: 'error' }[r.status] as 'warning' | 'success' | 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {r.status === 'pending' && (
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Button size="small" color="success" variant="outlined"
                          onClick={() => setActionDialog({ type: 'approveRepl', id: r.id, label: 'اسم المعتمد' })}>
                          موافقة
                        </Button>
                        <Button size="small" color="error" variant="outlined"
                          onClick={() => setActionDialog({ type: 'rejectRepl', id: r.id, label: 'سبب الرفض' })}>
                          رفض
                        </Button>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Tab 2: Fund Setup ── */}
      {tab === 2 && (
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>إعدادات الصندوق</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="اسم الصندوق" value={fundForm.name} onChange={e => setFundForm(p => ({ ...p, name: e.target.value }))} size="small" />
            <TextField label="أمين الصندوق" value={fundForm.custodian_name} onChange={e => setFundForm(p => ({ ...p, custodian_name: e.target.value }))} size="small" />
            <Divider />
            <Autocomplete
              options={accounts}
              getOptionLabel={a => `${a.code} — ${a.name}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={accounts.find(a => String(a.id) === fundForm.account_id) ?? null}
              onChange={(_, v) => setFundForm(p => ({ ...p, account_id: v ? String(v.id) : '' }))}
              renderInput={params => <TextField {...params} label="حساب الصندوق الصغير" size="small" />}
            />
            <Autocomplete
              options={accounts}
              getOptionLabel={a => `${a.code} — ${a.name}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={accounts.find(a => String(a.id) === fundForm.bank_account_id) ?? null}
              onChange={(_, v) => setFundForm(p => ({ ...p, bank_account_id: v ? String(v.id) : '' }))}
              renderInput={params => <TextField {...params} label="حساب البنك / الصندوق الرئيسي" size="small" />}
            />
            <Divider />
            <TextField label="الحد الأقصى للصندوق" type="number" size="small"
              value={fundForm.max_amount} onChange={e => setFundForm(p => ({ ...p, max_amount: e.target.value }))} />
            <TextField label="حد التنبيه (تعبئة تلقائية)" type="number" size="small"
              value={fundForm.low_balance_threshold} onChange={e => setFundForm(p => ({ ...p, low_balance_threshold: e.target.value }))} />
            <Button variant="contained" onClick={handleSaveFund} sx={{ alignSelf: 'flex-start' }}>حفظ الإعدادات</Button>
          </Box>
        </Paper>
      )}

      {/* ── Dialog: New Request ── */}
      <Dialog open={reqDialog} onClose={() => setReqDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طلب صرف نثري جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="اسم مقدم الطلب" size="small" value={reqForm.requester_name}
              onChange={e => setReqForm(p => ({ ...p, requester_name: e.target.value }))} />
            <TextField label="التاريخ" type="date" size="small" value={reqForm.date}
              onChange={e => setReqForm(p => ({ ...p, date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="المبلغ" type="number" size="small" value={reqForm.amount}
              onChange={e => setReqForm(p => ({ ...p, amount: e.target.value }))} />
            <TextField select label="الفئة" size="small" value={reqForm.category}
              onChange={e => setReqForm(p => ({ ...p, category: e.target.value as RequestCategory }))}>
              {CATEGORIES.map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField label="البيان / الوصف" size="small" multiline rows={2} value={reqForm.description}
              onChange={e => setReqForm(p => ({ ...p, description: e.target.value }))} />
            <TextField label="المرجع (اختياري)" size="small" value={reqForm.reference}
              onChange={e => setReqForm(p => ({ ...p, reference: e.target.value }))} />
            <Autocomplete
              options={accounts.filter(a => a.type === 'expense')}
              getOptionLabel={a => `${a.code} — ${a.name}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={accounts.find(a => String(a.id) === reqForm.expense_account_id) ?? null}
              onChange={(_, v) => setReqForm(p => ({ ...p, expense_account_id: v ? String(v.id) : '' }))}
              renderInput={params => <TextField {...params} label="حساب المصروف (اختياري)" size="small" />}
            />
            {/* PDF upload */}
            <Box>
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<AttachFileOutlinedIcon />}
                color={reqForm.document ? 'success' : 'inherit'}
                fullWidth
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {reqForm.document
                  ? reqForm.document.name
                  : 'إرفاق مستند PDF (اختياري)'}
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={e => setReqForm(p => ({ ...p, document: e.target.files?.[0] ?? null }))}
                />
              </Button>
              {reqForm.document && (
                <Button size="small" color="error" onClick={() => setReqForm(p => ({ ...p, document: null }))}>
                  إزالة الملف
                </Button>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReqDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateRequest}
            disabled={!reqForm.requester_name || !reqForm.amount || !reqForm.description}>
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: New Replenishment ── */}
      <Dialog open={replDialog} onClose={() => setReplDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>طلب تعبئة صندوق النثريات</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="مقدم الطلب" size="small" value={replForm.requested_by}
              onChange={e => setReplForm(p => ({ ...p, requested_by: e.target.value }))} />
            <TextField label="المبلغ المطلوب" type="number" size="small" value={replForm.amount}
              onChange={e => setReplForm(p => ({ ...p, amount: e.target.value }))} />
            <TextField label="ملاحظات (اختياري)" size="small" value={replForm.description}
              onChange={e => setReplForm(p => ({ ...p, description: e.target.value }))} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateReplenishment}
            disabled={!replForm.requested_by || !replForm.amount}>
            إرسال طلب التعبئة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Help Guide ── */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ fontWeight: 700, fontSize: 20, borderBottom: 1, borderColor: 'divider', pb: 2 }}>
          دليل استخدام نظام صندوق النثريات
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* What is petty cash */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                ما هو صندوق النثريات؟
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2 }}>
                صندوق النثريات (Petty Cash) هو مبلغ نقدي صغير يُحتفظ به لتغطية المصاريف اليومية الصغيرة التي لا تستحق إصدار شيك أو حوالة بنكية، مثل شراء القرطاسية أو مصاريف النقل أو الضيافة. يُدار الصندوق وفق نظام السُّلفة الثابتة (Imprest System)، حيث يُعبَّأ الصندوق دائماً بنفس المبلغ الأصلي عند اقتراب نفاده.
              </Typography>
            </Box>

            <Divider />

            {/* Step 1 */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label="1" color="primary" size="small" sx={{ fontWeight: 700, width: 28, height: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>إعداد الصندوق (مرة واحدة فقط)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2, pr: 5 }}>
                اذهب إلى تبويب <strong>إعدادات الصندوق</strong> وحدد:
              </Typography>
              <Box component="ul" sx={{ pr: 6, mt: 1, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>اسم الصندوق وأمين الصندوق:</strong> بيانات تعريفية تظهر في التقارير.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>حساب الصندوق الصغير:</strong> حساب أصول نقدية مخصص للنثريات (أنشئه في الحسابات إن لم يوجد).</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>حساب البنك / الصندوق الرئيسي:</strong> المصدر الذي تُسحب منه الأموال لتعبئة الصندوق.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>الحد الأقصى:</strong> إجمالي المبلغ المخصص للصندوق (مثلاً 1,000 ريال).</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>حد التنبيه:</strong> عند وصول الرصيد لهذا الحد يظهر تنبيه لطلب التعبئة (مثلاً 200 ريال).</Typography>
              </Box>
            </Box>

            <Divider />

            {/* Step 2 */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label="2" color="primary" size="small" sx={{ fontWeight: 700, width: 28, height: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>تعبئة الصندوق أول مرة</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2, pr: 5 }}>
                بعد الإعداد، الرصيد يكون صفراً. اضغط <strong>طلب تعبئة</strong> بالمبلغ الكامل (مثلاً 1,000 ريال)، ثم اعتمد الطلب. عند الاعتماد يُنشئ النظام تلقائياً هذا القيد المحاسبي:
              </Typography>
              <Box sx={{ mt: 1.5, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider', pr: 5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1, mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>الحساب</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>مدين</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center' }}>دائن</Typography>
                </Box>
                <Divider sx={{ mb: 0.5 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1 }}>
                  <Typography variant="body2">صندوق النثريات (الصندوق الصغير)</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'center', color: 'success.main', fontWeight: 700 }}>✓</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>—</Typography>
                  <Typography variant="body2">البنك / الصندوق الرئيسي</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>—</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'center', color: 'error.main', fontWeight: 700 }}>✓</Typography>
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* Step 3 */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label="3" color="primary" size="small" sx={{ fontWeight: 700, width: 28, height: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>دورة حياة طلب الصرف</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 5, mb: 1.5 }}>
                {[
                  { label: 'طلب جديد', color: 'default' as const },
                  { label: '←', color: 'default' as const },
                  { label: 'معلق', color: 'warning' as const },
                  { label: '←', color: 'default' as const },
                  { label: 'موافق عليه', color: 'success' as const },
                  { label: '←', color: 'default' as const },
                  { label: 'مدفوع', color: 'default' as const },
                ].map((s, i) => s.label === '←'
                  ? <Typography key={i} variant="body2" color="text.disabled">←</Typography>
                  : <Chip key={i} label={s.label} color={s.color} size="small" />
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>أو</Typography>
                <Chip label="مرفوض" color="error" size="small" />
              </Box>
              <Box component="ol" sx={{ pr: 6, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>إنشاء الطلب:</strong> يضغط الموظف "طلب صرف جديد" ويُدخل الاسم والمبلغ والفئة والبيان.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>الموافقة أو الرفض:</strong> يراجع المدير الطلبَ المعلق ويوافق عليه أو يرفضه مع ذكر السبب.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}><strong>الصرف:</strong> يضغط أمين الصندوق "صرف" على الطلبات الموافق عليها — يُخصم المبلغ من رصيد الصندوق فوراً.</Typography>
              </Box>
            </Box>

            <Divider />

            {/* Step 4 */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip label="4" color="primary" size="small" sx={{ fontWeight: 700, width: 28, height: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>تعبئة الصندوق (عند اقتراب النفاد)</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 2, pr: 5 }}>
                عندما يصل الرصيد لحد التنبيه أو يقترب من النفاد، اضغط <strong>طلب تعبئة</strong> وحدد المبلغ المطلوب. بعد اعتماده من المدير يُنشئ النظام قيداً محاسبياً تلقائياً ويُضيف المبلغ للرصيد.
              </Typography>
            </Box>

            <Divider />

            {/* Tips */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>نصائح مهمة</Typography>
              <Box component="ul" sx={{ pr: 4, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}>تأكد دائماً أن مجموع الإيصالات + الرصيد المتبقي = الحد الأقصى للصندوق.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}>لا تُصرف مبالغ كبيرة من النثريات — استخدم التحويل البنكي أو الشيك للمبالغ الكبيرة.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}>احرص على تحديد حساب المصروف في كل طلب لتتبع التحليل المالي بدقة.</Typography>
                <Typography component="li" variant="body2" sx={{ lineHeight: 2 }}>اطبع تقرير الصندوق دورياً وقارنه بالرصيد الفعلي للتحقق من الانطباق.</Typography>
              </Box>
            </Box>

          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
          <Button variant="contained" onClick={() => setHelpOpen(false)}>فهمت، شكراً</Button>
        </DialogActions>
      </Dialog>

      {/* ── Dialog: Action (approve / reject / pay) ── */}
      <Dialog open={!!actionDialog} onClose={() => { setActionDialog(null); setActionNote('') }} maxWidth="xs" fullWidth>
        <DialogTitle>
          {{ approve: 'موافقة على الطلب', reject: 'رفض الطلب', pay: 'صرف المبلغ', approveRepl: 'موافقة على التعبئة', rejectRepl: 'رفض التعبئة' }[actionDialog?.type ?? 'approve']}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" sx={{ mt: 1 }}
            label={actionDialog?.label ?? ''}
            value={actionNote}
            onChange={e => setActionNote(e.target.value)}
            required={actionDialog?.type === 'reject' || actionDialog?.type === 'rejectRepl'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setActionDialog(null); setActionNote('') }}>إلغاء</Button>
          <Button
            variant="contained"
            color={actionDialog?.type?.includes('reject') ? 'error' : actionDialog?.type === 'pay' ? 'primary' : 'success'}
            onClick={handleAction}
            disabled={(actionDialog?.type === 'reject' || actionDialog?.type === 'rejectRepl') && !actionNote}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
