import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Divider, Paper,
  Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import api from '@/lib/axios'
import FiscalYearSelector from '@/components/FiscalYearSelector'

interface OBRow {
  account_id: number
  code: string
  name: string
  type: string
  debit: string
  credit: string
}

type EditRow = OBRow & { _debit: string; _credit: string }

const TYPE_LABELS: Record<string, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
}
const TYPE_ORDER = ['asset', 'liability', 'equity']

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

export default function OpeningBalancesPage() {
  const [rows, setRows]             = useState<EditRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [success, setSuccess]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [periodLabel, setPeriodLabel]   = useState<string>('')

  const load = (fyId: number | null) => {
    setLoading(true)
    setError(null)
    const params = fyId ? { fiscal_year_id: fyId } : {}
    api.get<OBRow[]>('/api/opening-balances', { params })
      .then(r => setRows(r.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      }))))
      .catch(() => setError('تعذّر تحميل الأرصدة'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, from: string, to: string) => {
    setFiscalYearId(fyId)
    setPeriodLabel(fyId ? `${from} — ${to}` : 'أرصدة عامة')
    load(fyId)
  }

  const setDebit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _debit: val, _credit: val ? '' : r._credit } : r))

  const setCredit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _credit: val, _debit: val ? '' : r._debit } : r))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        fiscal_year_id: fiscalYearId,
        rows: rows.map(r => ({
          account_id: r.account_id,
          debit:  parseFloat(r._debit)  || 0,
          credit: parseFloat(r._credit) || 0,
        })),
      }
      const res = await api.put<OBRow[]>('/api/opening-balances', payload)
      setRows(res.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      })))
      setSuccess(true)
    } catch {
      setError('تعذّر الحفظ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(r._debit)  || 0), 0)
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(r._credit) || 0), 0)
  const diff        = Math.abs(totalDebit - totalCredit)
  const isBalanced  = diff < 0.005

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    rows:  rows.filter(r => r.type === type),
  })).filter(g => g.rows.length > 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>الأرصدة الافتتاحية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {periodLabel || 'اختر الفترة المحاسبية لعرض أرصدتها الافتتاحية'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <HelpButton title="دليل استخدام الأرصدة الافتتاحية">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي الأرصدة الافتتاحية؟</Typography>
                <Typography variant="body2">الأرصدة الافتتاحية هي أرصدة الحسابات في بداية الفترة المالية. تُسجَّل عند بدء استخدام النظام لنقل الأرصدة من النظام القديم.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>كيفية الإدخال</Typography>
                <Typography variant="body2">اختر الفترة المالية من منتقي السنة، ثم أدخل الرصيد الافتتاحي لكل حساب مع تحديد الجهة (مدين/دائن). اضغط "حفظ الأرصدة" عند الانتهاء.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>تنبيه مهم</Typography>
                <Typography variant="body2">تأكد أن مجموع أرصدة المدين يساوي مجموع أرصدة الدائن قبل الحفظ. الأرصدة الافتتاحية غير المتوازنة ستؤثر على دقة جميع التقارير.</Typography></Box>
            </Box>
          </HelpButton>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
            onClick={handleSave}
            disabled={saving || loading || rows.length === 0}
          >
            حفظ الأرصدة
          </Button>
        </Box>
      </Box>

      {/* Period selector */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FiscalYearSelector
            onChange={handlePeriodChange}
            defaultFrom={`${new Date().getFullYear()}-01-01`}
            defaultTo={today()}
          />
          {periodLabel && (
            <Typography variant="caption" color="text.secondary">
              النطاق: {periodLabel}
            </Typography>
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && rows.length === 0 && (
        <Alert severity="info">اختر فترة محاسبية لعرض الأرصدة الافتتاحية</Alert>
      )}

      {!loading && rows.length > 0 && (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ width: 90 }}>الرمز</TableCell>
                  <TableCell>اسم الحساب</TableCell>
                  <TableCell align="center" sx={{ width: 160 }}>مدين</TableCell>
                  <TableCell align="center" sx={{ width: 160 }}>دائن</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grouped.map(({ type, label, rows: groupRows }) => (
                  <>
                    <TableRow key={`hdr-${type}`} sx={{ bgcolor: 'grey.100' }}>
                      <TableCell colSpan={4} sx={{ py: 0.75 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                          {label}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    {groupRows.map(row => (
                      <TableRow key={row.account_id} hover>
                        <TableCell sx={{ color: 'text.secondary' }}>{row.code}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>
                          <TextField
                            size="small" type="number" value={row._debit}
                            onChange={e => setDebit(row.account_id, e.target.value)}
                            inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                            sx={{ width: 140 }} placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" type="number" value={row._credit}
                            onChange={e => setCredit(row.account_id, e.target.value)}
                            inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                            sx={{ width: 140 }} placeholder="0.00"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{ p: 2.5 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي المدين</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalDebit)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي الدائن</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalCredit)}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">الفرق</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr', color: isBalanced ? 'success.main' : 'error.main' }}>
                  {numFmt(diff)}
                </Typography>
              </Box>
              <Box sx={{
                px: 2, py: 0.75, borderRadius: 1,
                bgcolor: isBalanced ? 'success.light' : 'error.light',
                color:   isBalanced ? 'success.dark'  : 'error.dark',
              }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {isBalanced ? 'متوازن' : 'غير متوازن'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </>
      )}

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSuccess(false)}>تم حفظ الأرصدة الافتتاحية بنجاح</Alert>
      </Snackbar>
    </Box>
  )
}
