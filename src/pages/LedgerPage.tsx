import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'

interface LedgerRow {
  entry_id: number
  date: string
  reference: string | null
  entry_description: string
  line_description: string | null
  party_name: string | null
  debit: string
  credit: string
  balance: string
  balance_side: 'debit' | 'credit'
}

interface LedgerData {
  account: { id: number; code: string; name: string; type: string }
  from: string
  to: string
  opening_balance: string
  opening_side: 'debit' | 'credit'
  closing_balance: string
  closing_side: 'debit' | 'credit'
  rows: LedgerRow[]
  totals: { debit: string; credit: string }
}

const numFmt = (v: string) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const sideLbl = (s: 'debit' | 'credit') => (s === 'debit' ? 'م' : 'د')

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function LedgerPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [account, setAccount]         = useState<Account | null>(null)
  const [from, setFrom]               = useState(yearStart())
  const [to, setTo]                   = useState(today())
  const [data, setData]               = useState<LedgerData | null>(null)
  const [loading, setLoading]         = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    accountsApi.list()
      .then(setAccounts)
      .finally(() => setLoadingAccounts(false))
  }, [])

  const load = () => {
    if (!account) return
    setLoading(true)
    setError(null)
    api.get<LedgerData>('/api/reports/ledger', { params: { account_id: account.id, from, to } })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        كشف حساب
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Autocomplete
            options={accounts}
            value={account}
            onChange={(_, v) => { setAccount(v); setData(null) }}
            getOptionLabel={a => `${a.code} — ${a.name}`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            loading={loadingAccounts}
            noOptionsText="لا توجد نتائج"
            renderInput={params => (
              <TextField {...params} label="الحساب" size="small" sx={{ minWidth: 280 }} />
            )}
            size="small"
          />
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
          <Button variant="contained" onClick={load} disabled={!account || loading}>
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
          {/* Account info bar */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
              {data.account.code} — {data.account.name}
            </Typography>
            <Chip
              label={`رصيد افتتاحي: ${numFmt(data.opening_balance)} ${sideLbl(data.opening_side)}`}
              size="small"
              color="default"
              variant="outlined"
            />
            <Chip
              label={`رصيد ختامي: ${numFmt(data.closing_balance)} ${sideLbl(data.closing_side)}`}
              size="small"
              color="primary"
            />
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 100 }}>التاريخ</TableCell>
                  <TableCell sx={{ width: 80 }}>مرجع</TableCell>
                  <TableCell>البيان</TableCell>
                  <TableCell>الطرف</TableCell>
                  <TableCell align="left" sx={{ width: 130 }}>مدين</TableCell>
                  <TableCell align="left" sx={{ width: 130 }}>دائن</TableCell>
                  <TableCell align="left" sx={{ width: 140 }}>الرصيد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Opening balance row */}
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>
                    {data.from}
                  </TableCell>
                  <TableCell />
                  <TableCell sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    رصيد افتتاحي
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell align="left" sx={{ direction: 'ltr', fontWeight: 600 }}>
                    {numFmt(data.opening_balance)}
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                      {sideLbl(data.opening_side)}
                    </Typography>
                  </TableCell>
                </TableRow>

                {/* Data rows */}
                {data.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      لا توجد حركات في هذه الفترة
                    </TableCell>
                  </TableRow>
                )}
                {data.rows.map((row, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/transactions/${row.entry_id}/edit`)}
                  >
                    <TableCell sx={{ direction: 'ltr', textAlign: 'right', color: 'text.secondary' }}>
                      {row.date}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{row.reference || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.entry_description}</Typography>
                      {row.line_description && (
                        <Typography variant="caption" color="text.secondary">
                          {row.line_description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{row.party_name || '—'}</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: Number(row.debit) > 0 ? 'text.primary' : 'text.disabled' }}>
                      {Number(row.debit) > 0 ? numFmt(row.debit) : '—'}
                    </TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: Number(row.credit) > 0 ? 'text.primary' : 'text.disabled' }}>
                      {Number(row.credit) > 0 ? numFmt(row.credit) : '—'}
                    </TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {numFmt(row.balance)}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                        {sideLbl(row.balance_side)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals row */}
                {data.rows.length > 0 && (
                  <TableRow sx={{ bgcolor: 'grey.50', '& td': { fontWeight: 700, borderTop: '2px solid', borderColor: 'divider' } }}>
                    <TableCell colSpan={4} align="center">الإجمالي</TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {numFmt(data.totals.debit)}
                    </TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {numFmt(data.totals.credit)}
                    </TableCell>
                    <TableCell align="left" sx={{ direction: 'ltr', fontWeight: 700, color: 'primary.main' }}>
                      {numFmt(data.closing_balance)}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                        {sideLbl(data.closing_side)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {!loading && !data && !error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10, color: 'text.secondary' }}>
          <Typography>اختر حساباً لعرض الكشف</Typography>
        </Box>
      )}
    </Box>
  )
}
