import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import BalanceIcon from '@mui/icons-material/Balance'
import api from '@/lib/axios'

interface TrialBalanceRow {
  account_id: number
  code: string
  name: string
  type: string
  total_debit: string
  total_credit: string
  balance: string
  balance_side: 'debit' | 'credit'
}

interface TrialBalanceData {
  from: string
  to: string
  rows: TrialBalanceRow[]
  totals: { debit: string; credit: string; balanced: boolean }
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

const today = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function TrialBalancePage() {
  const [from, setFrom] = useState(yearStart())
  const [to, setTo]     = useState(today())
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.get<TrialBalanceData>('/api/reports/trial-balance', { params: { from, to } })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Group rows by account type
  const grouped = data
    ? (['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map(type => ({
        type,
        rows: data.rows.filter(r => r.type === type),
      })).filter(g => g.rows.length > 0)
    : []

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          ميزان المراجعة
        </Typography>
        {data && (
          <Chip
            icon={<BalanceIcon />}
            label={data.totals.balanced ? 'متوازن' : 'غير متوازن'}
            color={data.totals.balanced ? 'success' : 'error'}
          />
        )}
      </Box>

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
              <TableRow>
                <TableCell sx={{ width: 90 }}>الرمز</TableCell>
                <TableCell>اسم الحساب</TableCell>
                <TableCell sx={{ width: 80 }}>النوع</TableCell>
                <TableCell align="left" sx={{ width: 140 }}>مدين</TableCell>
                <TableCell align="left" sx={{ width: 140 }}>دائن</TableCell>
                <TableCell align="left" sx={{ width: 140 }}>الرصيد</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grouped.map(({ type, rows }) => (
                <>
                  {/* Section header */}
                  <TableRow key={`hdr-${type}`} sx={{ bgcolor: 'grey.100' }}>
                    <TableCell colSpan={6} sx={{ py: 0.75 }}>
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
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                        {numFmt(row.total_debit)}
                      </TableCell>
                      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                        {numFmt(row.total_credit)}
                      </TableCell>
                      <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {numFmt(row.balance)}
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                          {row.balance_side === 'debit' ? 'م' : 'د'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}

              {/* Totals row */}
              {data.rows.length > 0 && (
                <TableRow sx={{ bgcolor: 'grey.50', '& td': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                  <TableCell colSpan={3} align="center">الإجمالي</TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {numFmt(data.totals.debit)}
                  </TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {numFmt(data.totals.credit)}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{
                      direction: 'ltr',
                      color: data.totals.balanced ? 'success.main' : 'error.main',
                    }}
                  >
                    {data.totals.balanced ? '✓ متوازن' : `فرق: ${numFmt(String(Math.abs(Number(data.totals.debit) - Number(data.totals.credit))))}`}
                  </TableCell>
                </TableRow>
              )}

              {data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
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
