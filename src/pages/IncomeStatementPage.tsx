import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress,
  Divider, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'

interface ISRow {
  account_id: number
  code: string
  name: string
  type: string
  total_debit: string
  total_credit: string
  net: string
}

interface IncomeStatementData {
  from: string
  to: string
  revenue: ISRow[]
  expenses: ISRow[]
  total_revenue: string
  total_expense: string
  net_profit: string
  is_profit: boolean
}

interface Settings { company_name: string; address?: string; phone?: string }

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

// ── Shared section header ──────────────────────────────────────────────────
function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={3}
        sx={{
          bgcolor: '#5b21b6',
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          py: 1,
          borderBottom: 'none',
        }}
      >
        {sub && (
          <Typography component="span" sx={{ fontWeight: 400, fontSize: 12, opacity: 0.8, ml: 1 }}>
            {sub}
          </Typography>
        )}
        {label}
      </TableCell>
    </TableRow>
  )
}

// ── Formal statement view ──────────────────────────────────────────────────
function StatementView({ data, settings }: { data: IncomeStatementData; settings: Settings | null }) {
  const netProfit  = Number(data.net_profit)
  const isProfit   = data.is_profit

  const cellStyle = {
    fontSize: 13,
    borderColor: 'divider',
  }

  const amountCell = {
    ...cellStyle,
    direction: 'ltr' as const,
    fontVariantNumeric: 'tabular-nums',
    width: '21%',
    textAlign: 'left' as const,
  }

  return (
    <TableContainer component={Paper} elevation={1}>
      {/* Report header */}
      <Box sx={{ textAlign: 'center', py: 3, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {settings?.company_name && (
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.25 }}>
            {settings.company_name}
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          قائمة الدخل
        </Typography>
        <Typography variant="body2" color="text.secondary">
          عن الفترة من {data.from} إلى {data.to}
        </Typography>
      </Box>

      <Table size="small">
        {/* Column headers */}
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.100' }}>
            <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>البيان</TableCell>
            <TableCell align="left" sx={{ fontWeight: 700, fontSize: 13, width: '21%' }}>فرعي</TableCell>
            <TableCell align="left" sx={{ fontWeight: 700, fontSize: 13, width: '21%' }}>إجمالي</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {/* ── Revenue section ── */}
          <SectionHeader label="الإيرادات" />

          {data.revenue.map(row => (
            <TableRow key={row.account_id} hover>
              <TableCell sx={cellStyle}>{row.name}</TableCell>
              <TableCell sx={{ ...amountCell, color: 'success.main' }}>{numFmt(row.net)}</TableCell>
              <TableCell sx={amountCell} />
            </TableRow>
          ))}

          {data.revenue.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: 12 }}>
                لا توجد إيرادات
              </TableCell>
            </TableRow>
          )}

          {/* Revenue total */}
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ ...cellStyle, fontWeight: 700 }}>إجمالي الإيرادات</TableCell>
            <TableCell sx={amountCell} />
            <TableCell sx={{ ...amountCell, fontWeight: 700, color: 'success.main', borderTop: '2px solid', borderColor: 'success.light' }}>
              {numFmt(data.total_revenue)}
            </TableCell>
          </TableRow>

          {/* Spacer */}
          <TableRow><TableCell colSpan={3} sx={{ py: 0.75, borderBottom: 'none' }} /></TableRow>

          {/* ── Expenses section ── */}
          <SectionHeader label="المصروفات" sub="يطرح:" />

          {data.expenses.map(row => (
            <TableRow key={row.account_id} hover>
              <TableCell sx={cellStyle}>{row.name}</TableCell>
              <TableCell sx={{ ...amountCell, color: 'error.main' }}>{numFmt(row.net)}</TableCell>
              <TableCell sx={amountCell} />
            </TableRow>
          ))}

          {data.expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary', fontSize: 12 }}>
                لا توجد مصروفات
              </TableCell>
            </TableRow>
          )}

          {/* Expenses total */}
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ ...cellStyle, fontWeight: 700 }}>إجمالي المصروفات</TableCell>
            <TableCell sx={amountCell} />
            <TableCell sx={{ ...amountCell, fontWeight: 700, color: 'error.main', borderTop: '2px solid', borderColor: 'error.light' }}>
              ({numFmt(data.total_expense)})
            </TableCell>
          </TableRow>

          {/* Spacer */}
          <TableRow><TableCell colSpan={3} sx={{ py: 0.5, borderBottom: 'none' }} /></TableRow>

          {/* ── Net Profit / Loss ── */}
          <TableRow
            sx={{
              bgcolor: isProfit ? 'success.50' : 'error.50',
              '& td': { borderTop: '2px solid', borderColor: isProfit ? 'success.main' : 'error.main' },
            }}
          >
            <TableCell sx={{ fontWeight: 800, fontSize: 14, color: isProfit ? 'success.dark' : 'error.dark' }}>
              {isProfit ? 'صافي الربح' : 'صافي الخسارة'}
            </TableCell>
            <TableCell sx={amountCell} />
            <TableCell
              sx={{
                ...amountCell,
                fontWeight: 800,
                fontSize: 15,
                color: isProfit ? 'success.dark' : 'error.dark',
              }}
            >
              {numFmt(Math.abs(netProfit))}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function IncomeStatementPage() {
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]             = useState<IncomeStatementData | null>(null)
  const [settings, setSettings]     = useState<Settings | null>(null)
  const [viewMode, setViewMode]     = useState<'columns' | 'statement'>('columns')
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/income-statement/pdf', { from, to }) }
    finally { setPdfLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    setError(null)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<IncomeStatementData>('/api/reports/income-statement', { params })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  useEffect(() => {
    api.get<Settings>('/api/settings').then(r => setSettings(r.data)).catch(() => {})
  }, [])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>قائمة الدخل</Typography>
        <HelpButton title="دليل استخدام قائمة الدخل">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي قائمة الدخل؟</Typography>
              <Typography variant="body2">قائمة الدخل (حساب الأرباح والخسائر) تُظهر نتيجة النشاط خلال فترة محددة: الإيرادات ناقص المصروفات = صافي الربح أو الخسارة.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>الإيرادات والمصروفات</Typography>
              <Typography variant="body2">الإيرادات: المبالغ المحصّلة من النشاط الرئيسي. المصروفات: التكاليف المتكبّدة لتحقيق تلك الإيرادات. الفرق بينهما هو صافي النتيجة.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>اختيار الفترة</Typography>
              <Typography variant="body2">حدد "من تاريخ" و"إلى تاريخ" لعرض نتائج فترة محددة. يمكن استخدام منتقي السنة المالية للاختيار السريع.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>طريقة العرض</Typography>
              <Typography variant="body2">يمكن التبديل بين العرض الجدولي والعرض التفصيلي. تصدير PDF يُنتج تقريراً رسمياً يحمل اسم الشركة.</Typography></Box>
          </Box>
        </HelpButton>
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

          {/* View toggle */}
          <Box sx={{ mr: 'auto' }}>
            <ToggleButtonGroup value={viewMode} exclusive size="small"
              onChange={(_, v) => v && setViewMode(v)}>
              <ToggleButton value="columns">
                <Tooltip title="عرض عمودين">
                  <TableRowsOutlinedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="statement">
                <Tooltip title="قائمة رسمية (بيان / فرعي / إجمالي)">
                  <ArticleOutlinedIcon fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Statement view ── */}
      {!loading && data && viewMode === 'statement' && (
        <Box sx={{ maxWidth: 720 }}>
          <StatementView data={data} settings={settings} />
        </Box>
      )}

      {/* ── Columns view (original) ── */}
      {!loading && data && viewMode === 'columns' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
          {/* Revenue */}
          <TableContainer component={Paper}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon color="success" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>الإيرادات</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>الرمز</TableCell>
                  <TableCell>الحساب</TableCell>
                  <TableCell align="left">صافي الإيراد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.revenue.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد إيرادات
                    </TableCell>
                  </TableRow>
                )}
                {data.revenue.map(row => (
                  <TableRow key={row.account_id} hover>
                    <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                      color: Number(row.net) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}>
                      {numFmt(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'success.50', '& td': { borderTop: '2px solid', borderColor: 'divider', fontWeight: 700 } }}>
                  <TableCell colSpan={2} align="center">إجمالي الإيرادات</TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'success.main' }}>
                    {numFmt(data.total_revenue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Expenses */}
          <TableContainer component={Paper}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingDownIcon color="error" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>المصروفات</Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>الرمز</TableCell>
                  <TableCell>الحساب</TableCell>
                  <TableCell align="left">صافي المصروف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      لا توجد مصروفات
                    </TableCell>
                  </TableRow>
                )}
                {data.expenses.map(row => (
                  <TableRow key={row.account_id} hover>
                    <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                      color: 'error.main', fontWeight: 500 }}>
                      {numFmt(row.net)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'error.50', '& td': { borderTop: '2px solid', borderColor: 'divider', fontWeight: 700 } }}>
                  <TableCell colSpan={2} align="center">إجمالي المصروفات</TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                    {numFmt(data.total_expense)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Net Profit summary */}
          <Paper sx={{ gridColumn: '1 / -1', p: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">إجمالي الإيرادات</Typography>
                  <Typography sx={{ fontWeight: 700, direction: 'ltr', color: 'success.main' }}>
                    {numFmt(data.total_revenue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">إجمالي المصروفات</Typography>
                  <Typography sx={{ fontWeight: 700, direction: 'ltr', color: 'error.main' }}>
                    {numFmt(data.total_expense)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{
                px: 3, py: 1.5, borderRadius: 2,
                bgcolor: data.is_profit ? 'success.main' : 'error.main',
                color: 'white', textAlign: 'center', minWidth: 180,
              }}>
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {data.is_profit ? 'صافي الربح' : 'صافي الخسارة'}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, direction: 'ltr' }}>
                  {numFmt(Math.abs(Number(data.net_profit)))}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  )
}
