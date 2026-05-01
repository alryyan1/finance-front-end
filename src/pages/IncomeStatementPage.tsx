import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress,
  Divider, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'

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

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function IncomeStatementPage() {
  const [from, setFrom] = useState(yearStart())
  const [to, setTo]     = useState(today())
  const [data, setData] = useState<IncomeStatementData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/income-statement/pdf', { from, to }) }
    finally { setPdfLoading(false) }
  }

  const load = () => {
    setLoading(true)
    setError(null)
    api.get<IncomeStatementData>('/api/reports/income-statement', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        قائمة الدخل
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            label="من تاريخ"
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="إلى تاريخ"
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : 'عرض'}
          </Button>
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

      {!loading && data && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, alignItems: 'start' }}>
          {/* Revenue */}
          <TableContainer component={Paper}>
            <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon color="success" />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                الإيرادات
              </Typography>
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
                    <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>
                      {row.code}
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: Number(row.net) >= 0 ? 'success.main' : 'error.main', fontWeight: 500 }}>
                      {numFmt(row.net)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Revenue total */}
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
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                المصروفات
              </Typography>
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
                    <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>
                      {row.code}
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'error.main', fontWeight: 500 }}>
                      {numFmt(row.net)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Expense total */}
                <TableRow sx={{ bgcolor: 'error.50', '& td': { borderTop: '2px solid', borderColor: 'divider', fontWeight: 700 } }}>
                  <TableCell colSpan={2} align="center">إجمالي المصروفات</TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'error.main' }}>
                    {numFmt(data.total_expense)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Net Profit summary — full width */}
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
                color: 'white',
                textAlign: 'center',
                minWidth: 180,
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
