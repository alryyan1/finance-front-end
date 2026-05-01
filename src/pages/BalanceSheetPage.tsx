import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import api from '@/lib/axios'

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
}

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)

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

export default function BalanceSheetPage() {
  const [asOf, setAsOf]   = useState(today())
  const [data, setData]   = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    api.get<BalanceSheetData>('/api/reports/balance-sheet', { params: { as_of: asOf } })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          الميزانية العمومية
        </Typography>
        {data && (
          <Chip
            icon={<AccountBalanceOutlinedIcon />}
            label={data.balanced ? 'متوازنة' : 'غير متوازنة'}
            color={data.balanced ? 'success' : 'error'}
          />
        )}
      </Box>

      {/* Filter */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField
            label="كما في تاريخ"
            type="date"
            value={asOf}
            onChange={e => setAsOf(e.target.value)}
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
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
            {/* Assets */}
            <TableContainer component={Paper}>
              <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  الأصول
                </Typography>
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
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'error.main' }}>
                  الخصوم وحقوق الملكية
                </Typography>
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
    </Box>
  )
}
