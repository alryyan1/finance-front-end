import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'

interface BSRow {
  account_id: number
  code: string
  name: string
  balance: string
}

interface BalanceSheetData {
  as_of: string
  assets: BSRow[]
  liabilities: BSRow[]
  equity: BSRow[]
  net_profit: string
  is_profit: boolean
  total_assets: string
  total_liabilities: string
  total_equity: string
  total_equity_net: string
  total_liab_equity: string
  balanced: boolean
  // Form 2
  current_assets: BSRow[]
  non_current_assets: BSRow[]
  current_liabilities: BSRow[]
  long_term_liabilities: BSRow[]
  total_current_assets: string
  total_non_current_assets: string
  total_current_liabilities: string
  total_long_term_liabilities: string
  working_capital: string
  net_assets: string
}

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

// ── Form 1 helpers ─────────────────────────────────────────────────────────────

function Section({
  title, color, rows, subtotal, subtotalLabel, extra,
}: {
  title: string
  color: string
  rows: BSRow[]
  subtotal: string
  subtotalLabel: string
  extra?: { label: string; value: string; color?: string }
}) {
  return (
    <>
      <TableRow sx={{ bgcolor: 'grey.100' }}>
        <TableCell colSpan={2} sx={{ py: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color }}>
            {title}
          </Typography>
        </TableCell>
      </TableRow>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={2} sx={{ py: 2, color: 'text.disabled', textAlign: 'center', fontStyle: 'italic' }}>
            لا توجد بيانات
          </TableCell>
        </TableRow>
      )}
      {rows.map(row => (
        <TableRow key={row.account_id} hover>
          <TableCell>
            <Typography variant="body2">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.code}</Typography>
          </TableCell>
          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
            {numFmt(row.balance)}
          </TableCell>
        </TableRow>
      ))}
      {extra && (
        <TableRow hover>
          <TableCell sx={{ color: extra.color ?? 'text.primary' }}>{extra.label}</TableCell>
          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: extra.color ?? 'text.primary' }}>
            {extra.value}
          </TableCell>
        </TableRow>
      )}
      <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' } }}>
        <TableCell>{subtotalLabel}</TableCell>
        <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color }}>
          {numFmt(subtotal)}
        </TableCell>
      </TableRow>
    </>
  )
}

// ── Form 2 helpers ─────────────────────────────────────────────────────────────

function F2Section({
  title, titleColor = 'text.primary', underline = false, rows, subtotal, subtotalLabel, subtotalColor = 'text.primary', negateValues = false,
}: {
  title: string
  titleColor?: string
  underline?: boolean
  rows: BSRow[]
  subtotal: string
  subtotalLabel: string
  subtotalColor?: string
  negateValues?: boolean
}) {
  return (
    <>
      <TableRow sx={{ bgcolor: 'grey.50' }}>
        <TableCell colSpan={3} sx={{ py: 0.75 }}>
          <Typography variant="caption" sx={{
            fontWeight: 700, color: titleColor,
            textDecoration: underline ? 'underline' : 'none',
          }}>
            {title}
          </Typography>
        </TableCell>
      </TableRow>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={3} sx={{ py: 1.5, color: 'text.disabled', textAlign: 'center', fontStyle: 'italic' }}>
            لا توجد بيانات — حدد التصنيف الفرعي للحسابات
          </TableCell>
        </TableRow>
      )}
      {rows.map(row => (
        <TableRow key={row.account_id} hover>
          <TableCell sx={{ width: 40 }} />
          <TableCell>
            <Typography variant="body2">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">{row.code}</Typography>
          </TableCell>
          <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', width: 130 }}>
            {numFmt(negateValues ? -Number(row.balance) : row.balance)}
          </TableCell>
        </TableRow>
      ))}
      <TableRow sx={{ '& td': { fontWeight: 700, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'grey.100' } }}>
        <TableCell />
        <TableCell sx={{ color: subtotalColor }}>{subtotalLabel}</TableCell>
        <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: subtotalColor }}>
          {numFmt(negateValues ? -Number(subtotal) : subtotal)}
        </TableCell>
      </TableRow>
    </>
  )
}

function F2SummaryRow({ label, value, color, indent = false, doubleUnderline = false }: {
  label: string; value: string; color?: string; indent?: boolean; doubleUnderline?: boolean
}) {
  return (
    <TableRow sx={{
      '& td': {
        fontWeight: 700,
        borderBottom: doubleUnderline ? '3px double' : '2px solid',
        borderColor: 'divider',
        bgcolor: doubleUnderline ? 'action.selected' : 'background.paper',
      },
    }}>
      <TableCell />
      <TableCell sx={{ color, paddingInlineStart: indent ? 4 : 2 }}>{label}</TableCell>
      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color }}>
        {numFmt(value)}
      </TableCell>
    </TableRow>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BalanceSheetPage() {
  const [asOf, setAsOf]             = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]             = useState<BalanceSheetData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [viewForm, setViewForm]     = useState<'1' | '2'>('1')

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/balance-sheet/pdf', { as_of: asOf }) }
    finally { setPdfLoading(false) }
  }

  const load = (aof = asOf, fyId = fiscalYearId) => {
    setLoading(true)
    setError(null)
    const params = fyId ? { fiscal_year_id: fyId } : { as_of: aof }
    api.get<BalanceSheetData>('/api/reports/balance-sheet', { params })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, _from: string, to: string) => {
    setFiscalYearId(fyId)
    const aof = fyId ? to : asOf
    if (fyId) setAsOf(to)
    load(aof, fyId)
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          الميزانية العمومية
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {data && (
            <Chip
              icon={<AccountBalanceOutlinedIcon />}
              label={data.balanced ? 'متوازنة' : 'غير متوازنة'}
              color={data.balanced ? 'success' : 'error'}
            />
          )}
          <HelpButton title="دليل استخدام الميزانية العمومية">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي الميزانية العمومية؟</Typography>
                <Typography variant="body2">الميزانية العمومية تُظهر المركز المالي للشركة في تاريخ محدد: الأصول (ما تملكه) في مقابل الخصوم وحقوق الملكية (ما عليك).</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>المعادلة المحاسبية</Typography>
                <Typography variant="body2">الأصول = الخصوم + حقوق الملكية. إذا كانت الميزانية "غير متوازنة" فهناك خطأ في القيود يجب تصحيحه.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>اختيار التاريخ</Typography>
                <Typography variant="body2">تُعرض الميزانية "كما في تاريخ" معين. اختر نهاية الفترة المالية (مثلاً 31/12) للحصول على ميزانية ختامية.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>تصدير PDF</Typography>
                <Typography variant="body2">اضغط زر PDF لتصدير الميزانية كتقرير رسمي قابل للطباعة والمشاركة.</Typography></Box>
            </Box>
          </HelpButton>
        </Box>
      </Box>

      {/* Filter */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={today()} defaultTo={today()} />
          <TextField
            label="كما في تاريخ"
            type="date"
            value={asOf}
            onChange={e => setAsOf(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={() => load()} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : 'عرض'}
          </Button>

          <ToggleButtonGroup
            value={viewForm} exclusive size="small"
            onChange={(_, v) => v && setViewForm(v)}
          >
            <ToggleButton value="1" sx={{ px: 2, fontSize: 12 }}>الشكل الأول</ToggleButton>
            <ToggleButton value="2" sx={{ px: 2, fontSize: 12 }}>الشكل الثاني</ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            color="error"
            startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
            onClick={handlePdf}
            disabled={pdfLoading || !data}
          >
            طباعة PDF
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Form 1: Traditional two-column layout ── */}
      {!loading && data && viewForm === '1' && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Assets */}
            <TableContainer component={Paper}>
              <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>الأصول</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الحساب</TableCell>
                    <TableCell align="left">الرصيد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <Section
                    title="الأصول"
                    color="#2563eb"
                    rows={data.assets}
                    subtotal={data.total_assets}
                    subtotalLabel="إجمالي الأصول"
                  />
                </TableBody>
              </Table>
            </TableContainer>

            {/* Liabilities + Equity */}
            <TableContainer component={Paper}>
              <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>الخصوم وحقوق الملكية</Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الحساب</TableCell>
                    <TableCell align="left">الرصيد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <Section
                    title="الخصوم"
                    color="#dc2626"
                    rows={data.liabilities}
                    subtotal={data.total_liabilities}
                    subtotalLabel="إجمالي الخصوم"
                  />
                  <TableRow><TableCell colSpan={2} sx={{ py: 0.5 }} /></TableRow>
                  <Section
                    title="حقوق الملكية"
                    color="#7c3aed"
                    rows={data.equity}
                    subtotal={data.total_equity_net}
                    subtotalLabel="إجمالي حقوق الملكية"
                    extra={{
                      label: data.is_profit ? 'صافي الربح' : 'صافي الخسارة',
                      value: numFmt(Math.abs(Number(data.net_profit))),
                      color: data.is_profit ? '#16a34a' : '#dc2626',
                    }}
                  />
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Totals bar */}
          <Paper sx={{ p: 2.5 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي الأصول</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, direction: 'ltr', color: 'primary.main' }}>
                  {numFmt(data.total_assets)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي الخصوم</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, direction: 'ltr', color: 'error.main' }}>
                  {numFmt(data.total_liabilities)}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي حقوق الملكية</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, direction: 'ltr', color: '#7c3aed' }}>
                  {numFmt(data.total_equity_net)}
                </Typography>
              </Box>
              <Box sx={{
                textAlign: 'center', px: 3, py: 1, borderRadius: 2,
                bgcolor: data.balanced ? 'success.main' : 'error.main',
                color: 'white',
              }}>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {data.balanced ? 'الميزانية متوازنة' : 'الميزانية غير متوازنة'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, direction: 'ltr' }}>
                  {numFmt(data.total_liab_equity)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </>
      )}

      {/* ── Form 2: Working capital format ── */}
      {!loading && data && viewForm === '2' && (
        <TableContainer component={Paper}>
          <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              قائمة المركز المالي — الشكل الثاني
            </Typography>
            <Typography variant="caption" color="text.secondary">كما في تاريخ {data.as_of}</Typography>
          </Box>
          <Divider />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }} />
                <TableCell>البيان</TableCell>
                <TableCell align="left" sx={{ width: 130 }}>المبلغ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>

              {/* Current Assets */}
              <F2Section
                title="الأصول المتداولة:"
                titleColor="#2563eb"
                underline
                rows={data.current_assets}
                subtotal={data.total_current_assets}
                subtotalLabel="إجمالي الأصول المتداولة"
                subtotalColor="#2563eb"
              />

              <TableRow><TableCell colSpan={3} sx={{ py: 0.25 }} /></TableRow>

              {/* Current Liabilities (deducted) */}
              <F2Section
                title="يطرح: الخصوم المتداولة:"
                titleColor="#dc2626"
                underline
                rows={data.current_liabilities}
                subtotal={data.total_current_liabilities}
                subtotalLabel="إجمالي الخصوم المتداولة"
                subtotalColor="#dc2626"
              />

              {/* Working Capital */}
              <F2SummaryRow
                label="رأس المال العامل"
                value={data.working_capital}
                color={Number(data.working_capital) >= 0 ? '#16a34a' : '#dc2626'}
              />

              <TableRow><TableCell colSpan={3} sx={{ py: 0.5 }} /></TableRow>

              {/* Non-current Assets */}
              <F2Section
                title="يضاف: الأصول الثابتة وغير الملموسة:"
                titleColor="#2563eb"
                underline
                rows={data.non_current_assets}
                subtotal={data.total_non_current_assets}
                subtotalLabel="إجمالي الأصول الثابتة وغير الملموسة"
                subtotalColor="#2563eb"
              />

              {/* Total Assets */}
              <F2SummaryRow
                label="إجمالي الأصول"
                value={String(Number(data.working_capital) + Number(data.total_non_current_assets))}
                color="primary.main"
              />

              <TableRow><TableCell colSpan={3} sx={{ py: 0.5 }} /></TableRow>

              {/* Long-term Liabilities (deducted) */}
              <F2Section
                title="يطرح: الخصوم طويلة الأجل:"
                titleColor="#dc2626"
                underline
                rows={data.long_term_liabilities}
                subtotal={data.total_long_term_liabilities}
                subtotalLabel="إجمالي الخصوم طويلة الأجل"
                subtotalColor="#dc2626"
              />

              {/* Net Assets */}
              <F2SummaryRow
                label="صافي الأصول"
                value={data.net_assets}
                color="#7c3aed"
                doubleUnderline
              />

              <TableRow><TableCell colSpan={3} sx={{ py: 0.5 }} /></TableRow>

              {/* Equity section */}
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell colSpan={3} sx={{ py: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#7c3aed', textDecoration: 'underline' }}>
                    حقوق الملكية:
                  </Typography>
                </TableCell>
              </TableRow>
              {data.equity.map(row => (
                <TableRow key={row.account_id} hover>
                  <TableCell />
                  <TableCell>
                    <Typography variant="body2">{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.code}</Typography>
                  </TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {numFmt(row.balance)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Net profit in equity */}
              <TableRow hover>
                <TableCell />
                <TableCell sx={{ color: data.is_profit ? '#16a34a' : '#dc2626' }}>
                  {data.is_profit ? 'صافي الربح' : 'صافي الخسارة'}
                </TableCell>
                <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: data.is_profit ? '#16a34a' : '#dc2626' }}>
                  {numFmt(Math.abs(Number(data.net_profit)))}
                </TableCell>
              </TableRow>

              {/* Total Equity */}
              <F2SummaryRow
                label="صافي حقوق الملكية"
                value={data.total_equity_net}
                color="#7c3aed"
                doubleUnderline
              />

            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
