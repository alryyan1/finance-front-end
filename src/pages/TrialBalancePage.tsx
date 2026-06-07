import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import BalanceIcon from '@mui/icons-material/Balance'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'

type ViewType = 'totals' | 'balances' | 'both'

interface TrialBalanceRow {
  account_id: number
  code: string
  name: string
  type: string
  total_debit: string
  total_credit: string
  balance: string
  balance_side: 'debit' | 'credit'
  balance_debit: string
  balance_credit: string
}

interface TrialBalanceData {
  from: string
  to: string
  rows: TrialBalanceRow[]
  totals: {
    debit: string
    credit: string
    balance_debit: string
    balance_credit: string
    balanced: boolean
  }
}

const TYPE_LABELS: Record<string, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_COLORS: Record<string, 'primary' | 'error' | 'secondary' | 'success' | 'warning'> = {
  asset:     'primary',
  liability: 'error',
  equity:    'secondary',
  revenue:   'success',
  expense:   'warning',
}

const numFmt = (v: string) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function TrialBalancePage() {
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [viewType, setViewType]     = useState<ViewType>('both')
  const [data, setData]             = useState<TrialBalanceData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/trial-balance/pdf', { from, to, view_type: viewType }) }
    finally { setPdfLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    setError(null)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<TrialBalanceData>('/api/reports/trial-balance', { params })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  // FiscalYearSelector calls handlePeriodChange on mount, which triggers the initial load

  const grouped = data
    ? (['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map(type => ({
        type,
        rows: data.rows.filter(r => r.type === type),
      })).filter(g => g.rows.length > 0)
    : []

  // Column config per view type
  const showTotals   = viewType === 'totals'   || viewType === 'both'
  const showBalances = viewType === 'balances' || viewType === 'both'
  const colSpanLabel = 2 // code + name

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>ميزان المراجعة</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {{
              totals:   'بالمجاميع',
              balances: 'بالأرصدة',
              both:     'بالمجاميع والأرصدة',
            }[viewType]}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {data && (
            <Chip
              icon={<BalanceIcon />}
              label={data.totals.balanced ? 'متوازن' : 'غير متوازن'}
              color={data.totals.balanced ? 'success' : 'error'}
            />
          )}
          <HelpButton title="دليل استخدام ميزان المراجعة">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هو ميزان المراجعة؟</Typography>
                <Typography variant="body2">ميزان المراجعة يُظهر مجموع المدين والدائن لكل حساب في فترة محددة. يُستخدم للتحقق من توازن القيود المحاسبية وصحة البيانات.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>أنواع العرض</Typography>
                <Typography variant="body2">بالمجاميع: يُظهر إجمالي المدين والدائن. بالأرصدة: يُظهر الرصيد الصافي فقط. بالمجاميع والأرصدة: يجمع الاثنين معاً.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>التوازن</Typography>
                <Typography variant="body2">إجمالي المدين يجب أن يساوي إجمالي الدائن دائماً. إذا ظهرت "غير متوازن" فهناك قيد غير مكتمل يحتاج مراجعة.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>تصدير PDF</Typography>
                <Typography variant="body2">اضغط زر PDF لتصدير الميزان بصيغة قابلة للطباعة. يمكن اختيار الفترة الزمنية قبل التصدير.</Typography></Box>
            </Box>
          </HelpButton>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={yearStart()} defaultTo={today()} />
          <TextField
            label="من تاريخ" type="date" value={from}
            onChange={e => setFrom(e.target.value)}
            size="small" slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="إلى تاريخ" type="date" value={to}
            onChange={e => setTo(e.target.value)}
            size="small" slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={() => load()} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : 'عرض'}
          </Button>
          <Button
            variant="outlined" color="error"
            startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
            onClick={handlePdf}
            disabled={pdfLoading || !data}
          >
            طباعة PDF
          </Button>
        </Box>

        {/* View type toggle */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            نوع الميزان
          </Typography>
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={(_, v) => v && setViewType(v)}
            size="small"
          >
            <ToggleButton value="totals">بالمجاميع</ToggleButton>
            <ToggleButton value="balances">بالأرصدة</ToggleButton>
            <ToggleButton value="both">بالمجاميع والأرصدة</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ width: 80 }}>الرمز</TableCell>
                <TableCell>اسم الحساب</TableCell>
                <TableCell sx={{ width: 80 }}>النوع</TableCell>
                {showTotals && (
                  <>
                    <TableCell align="center" colSpan={2} sx={{ borderBottom: '2px solid', borderColor: 'primary.main' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        المجاميع
                      </Typography>
                    </TableCell>
                  </>
                )}
                {showBalances && (
                  <>
                    <TableCell align="center" colSpan={2} sx={{ borderBottom: '2px solid', borderColor: 'success.main' }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'success.main' }}>
                        الأرصدة
                      </Typography>
                    </TableCell>
                  </>
                )}
              </TableRow>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell />
                <TableCell />
                <TableCell />
                {showTotals && (
                  <>
                    <TableCell align="left" sx={{ width: 120, color: 'primary.main', fontWeight: 600 }}>مجموع مدين</TableCell>
                    <TableCell align="left" sx={{ width: 120, color: 'primary.main', fontWeight: 600 }}>مجموع دائن</TableCell>
                  </>
                )}
                {showBalances && (
                  <>
                    <TableCell align="left" sx={{ width: 120, color: 'success.dark', fontWeight: 600 }}>رصيد مدين</TableCell>
                    <TableCell align="left" sx={{ width: 120, color: 'success.dark', fontWeight: 600 }}>رصيد دائن</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {grouped.map(({ type, rows }) => (
                <>
                  <TableRow key={`hdr-${type}`} sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={3 + (showTotals ? 2 : 0) + (showBalances ? 2 : 0)} sx={{ py: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                        {TYPE_LABELS[type]}
                      </Typography>
                    </TableCell>
                  </TableRow>

                  {rows.map(row => (
                    <TableRow key={row.account_id} hover>
                      <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>
                        {row.code}
                      </TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={TYPE_LABELS[row.type]}
                          color={TYPE_COLORS[row.type]}
                          size="small" variant="outlined"
                        />
                      </TableCell>
                      {showTotals && (
                        <>
                          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(row.total_debit) > 0 ? numFmt(row.total_debit) : '—'}
                          </TableCell>
                          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(row.total_credit) > 0 ? numFmt(row.total_credit) : '—'}
                          </TableCell>
                        </>
                      )}
                      {showBalances && (
                        <>
                          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {Number(row.balance_debit) > 0 ? numFmt(row.balance_debit) : '—'}
                          </TableCell>
                          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {Number(row.balance_credit) > 0 ? numFmt(row.balance_credit) : '—'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </>
              ))}

              {/* Totals row */}
              {data.rows.length > 0 && (
                <TableRow sx={{ bgcolor: 'grey.50', '& td': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                  <TableCell colSpan={3} align="center">الإجمالي</TableCell>
                  {showTotals && (
                    <>
                      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}>
                        {numFmt(data.totals.debit)}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                          color: viewType === 'totals'
                            ? (data.totals.balanced ? 'success.main' : 'error.main')
                            : 'primary.main',
                        }}
                      >
                        {numFmt(data.totals.credit)}
                        {viewType === 'totals' && (
                          <Typography component="span" variant="caption" sx={{ mr: 0.5 }}>
                            {data.totals.balanced ? ' ✓' : ' ✗'}
                          </Typography>
                        )}
                      </TableCell>
                    </>
                  )}
                  {showBalances && (
                    <>
                      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'success.dark' }}>
                        {numFmt(data.totals.balance_debit)}
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{
                          direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                          color: data.totals.balanced ? 'success.dark' : 'error.main',
                        }}
                      >
                        {numFmt(data.totals.balance_credit)}
                        <Typography component="span" variant="caption" sx={{ mr: 0.5 }}>
                          {data.totals.balanced ? ' ✓' : ' ✗'}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )}

              {data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد بيانات في هذه الفترة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
