import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import { partiesApi } from '@/api/parties'
import { openPdf } from '@/api/pdf'
import type { Account } from '@/types/account'
import type { Party } from '@/types/party'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import TableRowsIcon from '@mui/icons-material/TableRows'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import FiscalYearSelector from '@/components/FiscalYearSelector'

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

const sideLbl  = (s: 'debit' | 'credit') => (s === 'debit' ? 'م' : 'د')
const sideEn   = (s: 'debit' | 'credit') => (s === 'debit' ? 'Dr' : 'Cr')

// ── General Ledger View ───────────────────────────────────────────────────────

const GL_BLUE   = '#0d2b6e'
const GL_RED    = '#c0001a'
const GL_HEADER = '#1a3a8f'

function GeneralLedgerView({ data, onRowClick }: { data: LedgerData; onRowClick: (id: number) => void }) {
  return (
    <Box sx={{ fontFamily: '"Times New Roman", serif', maxWidth: 900, mx: 'auto' }}>

      {/* Title bar */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'stretch',
        border: `2px solid ${GL_BLUE}`, borderRadius: '6px 6px 0 0', overflow: 'hidden',
      }}>
        <Box sx={{
          flex: 1, textAlign: 'center', py: 1.25,
          background: `linear-gradient(135deg, ${GL_HEADER} 0%, #2756c5 100%)`,
          borderRight: `2px solid ${GL_BLUE}`,
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 1, fontFamily: 'inherit' }}>
            General Ledger
          </Typography>
        </Box>
        <Box sx={{
          flex: 1, textAlign: 'center', py: 1.25,
          background: 'linear-gradient(135deg, #2756c5 0%, #1a3a8f 100%)',
        }}>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'inherit' }}>
            دفتر الأستاذ العام
          </Typography>
        </Box>
      </Box>

      {/* Account info */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: `2px solid ${GL_BLUE}`, borderTop: 'none',
        px: 3, py: 1.25, bgcolor: '#f5f8ff',
      }}>
        <Typography sx={{ color: GL_RED, fontWeight: 700, fontSize: 15, fontFamily: 'inherit', direction: 'ltr' }}>
          Account No. :&nbsp;
          <Box component="span" sx={{ letterSpacing: 2 }}>{data.account.code}</Box>
        </Typography>
        <Typography sx={{ color: GL_RED, fontWeight: 700, fontSize: 15, fontFamily: 'inherit', direction: 'ltr' }}>
          Account Name :&nbsp;{data.account.name}
        </Typography>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: `2px solid ${GL_BLUE}`, borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {['Date', 'Trx. No.', 'Description', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                <TableCell
                  key={h}
                  align={i >= 3 ? 'right' : 'center'}
                  sx={{
                    bgcolor: GL_HEADER, color: '#fff', fontWeight: 700,
                    fontFamily: 'inherit', fontSize: 14,
                    border: `1px solid #2756c5`,
                    width: i === 2 ? 'auto' : i === 0 ? 95 : i === 1 ? 80 : 110,
                    py: 1,
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Opening Balance */}
            <TableRow sx={{ bgcolor: '#f0f4ff' }}>
              <TableCell align="center" sx={{ fontFamily: 'inherit', border: '1px solid #cdd6f0', color: '#555', fontSize: 13 }}>
                {data.from}
              </TableCell>
              <TableCell sx={{ border: '1px solid #cdd6f0' }} />
              <TableCell align="center" sx={{ fontWeight: 700, fontFamily: 'inherit', fontSize: 14, border: '1px solid #cdd6f0' }}>
                Opening Balance
              </TableCell>
              <TableCell sx={{ border: '1px solid #cdd6f0' }} />
              <TableCell sx={{ border: '1px solid #cdd6f0' }} />
              <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', fontSize: 14, border: '1px solid #cdd6f0', pr: 1.5 }}>
                {numFmt(data.opening_balance)}
                <Box component="span" sx={{ ml: 0.5, fontSize: 11, color: '#666' }}>{sideEn(data.opening_side)}</Box>
              </TableCell>
            </TableRow>

            {/* No movement */}
            {data.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#888', fontFamily: 'inherit', border: '1px solid #cdd6f0' }}>
                  No transactions in this period
                </TableCell>
              </TableRow>
            )}

            {/* Data rows */}
            {data.rows.map((row, i) => (
              <TableRow
                key={i}
                hover
                onClick={() => onRowClick(row.entry_id)}
                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#eef2ff' } }}
              >
                <TableCell align="center" sx={{ fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', color: '#333' }}>
                  {row.date}
                </TableCell>
                <TableCell align="center" sx={{ fontFamily: 'inherit', fontSize: 13, border: '1px solid #cdd6f0', color: '#555' }}>
                  {row.reference || '—'}
                </TableCell>
                <TableCell sx={{ fontFamily: 'inherit', fontSize: 13, border: '1px solid #cdd6f0', pl: 1.5 }}>
                  <Box sx={{ fontWeight: 600 }}>{row.entry_description}</Box>
                  {row.line_description && (
                    <Box sx={{ fontSize: 11, color: '#888' }}>{row.line_description}</Box>
                  )}
                  {row.party_name && (
                    <Box sx={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>{row.party_name}</Box>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', pr: 1.5, color: Number(row.debit) > 0 ? '#0d2b6e' : '#bbb' }}>
                  {Number(row.debit) > 0 ? numFmt(row.debit) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', pr: 1.5, color: Number(row.credit) > 0 ? '#0d2b6e' : '#bbb' }}>
                  {Number(row.credit) > 0 ? numFmt(row.credit) : '—'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, direction: 'ltr', border: '1px solid #cdd6f0', pr: 1.5 }}>
                  {numFmt(row.balance)}
                  <Box component="span" sx={{ ml: 0.5, fontSize: 11, color: '#666' }}>{sideEn(row.balance_side)}</Box>
                </TableCell>
              </TableRow>
            ))}

            {/* Totals */}
            {data.rows.length > 0 && (
              <TableRow sx={{ bgcolor: '#e8eeff' }}>
                <TableCell colSpan={3} align="center" sx={{ fontWeight: 700, fontFamily: 'inherit', fontSize: 14, border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}` }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, pr: 1.5 }}>
                  {numFmt(data.totals.debit)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, pr: 1.5 }}>
                  {numFmt(data.totals.credit)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontFamily: 'inherit', color: GL_RED, direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, pr: 1.5, fontSize: 15 }}>
                  {numFmt(data.closing_balance)}
                  <Box component="span" sx={{ ml: 0.5, fontSize: 11 }}>{sideEn(data.closing_side)}</Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function LedgerPage() {
  const navigate = useNavigate()
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [parties, setParties]         = useState<Party[]>([])
  const [account, setAccount]         = useState<Account | null>(null)
  const [party, setParty]             = useState<Party | null>(null)
  const [from, setFrom]               = useState(yearStart())
  const [to, setTo]                   = useState(today())
  const [data, setData]               = useState<LedgerData | null>(null)
  const [loading, setLoading]         = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [view, setView]               = useState<'arabic' | 'gl'>('arabic')

  const handlePeriodChange = (_fyId: number | null, f: string, t: string) => {
    setFrom(f); setTo(t); setData(null)
  }

  const handlePdf = async () => {
    if (!account) return
    setPdfLoading(true)
    try {
      await openPdf('/api/reports/ledger/pdf', {
        account_id: account.id,
        from,
        to,
        ...(party ? { party_id: party.id } : {}),
      })
    } finally { setPdfLoading(false) }
  }

  useEffect(() => {
    Promise.all([accountsApi.list(), partiesApi.list()])
      .then(([accs, parts]) => { setAccounts(accs); setParties(parts) })
      .finally(() => setLoadingAccounts(false))
  }, [])

  const load = () => {
    if (!account) return
    setLoading(true)
    setError(null)
    api.get<LedgerData>('/api/reports/ledger', {
      params: {
        account_id: account.id,
        from,
        to,
        ...(party ? { party_id: party.id } : {}),
      },
    })
      .then(r => setData(r.data))
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>كشف حساب</Typography>
        <HelpButton title="دليل استخدام كشف الحساب">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هو كشف الحساب؟</Typography>
              <Typography variant="body2">كشف الحساب يُظهر جميع الحركات (مدين/دائن) لحساب محدد خلال فترة زمنية، مع الرصيد التراكمي بعد كل حركة.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>اختيار الحساب</Typography>
              <Typography variant="body2">اختر الحساب من القائمة المنسدلة (يمكن البحث بالاسم أو الرمز). حدد الفترة الزمنية ثم اضغط "عرض" لتحميل البيانات.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>التصفية بالطرف</Typography>
              <Typography variant="body2">يمكن تصفية الحركات بطرف محدد (عميل/مورد) لعرض كشف حساب مفصّل للتعاملات مع تلك الجهة فقط.</Typography></Box>
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>الرصيد الافتتاحي والختامي</Typography>
              <Typography variant="body2">يُعرض الرصيد الافتتاحي في بداية الفترة والرصيد الختامي في نهايتها. يمكن تصدير الكشف كـ PDF.</Typography></Box>
          </Box>
        </HelpButton>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={yearStart()} defaultTo={today()} />
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
          <Autocomplete
            options={parties}
            value={party}
            onChange={(_, v) => { setParty(v); setData(null) }}
            getOptionLabel={p => p.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            noOptionsText="لا توجد نتائج"
            renderInput={params => (
              <TextField {...params} label="الطرف (اختياري)" size="small" sx={{ minWidth: 200 }} />
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
          <Button
            variant="outlined"
            color="error"
            startIcon={pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
            onClick={handlePdf}
            disabled={pdfLoading || !data}
          >
            طباعة PDF
          </Button>

          {data && (
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, v) => v && setView(v)}
              size="small"
            >
              <ToggleButton value="arabic">
                <TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} /> عربي
              </ToggleButton>
              <ToggleButton value="gl">
                <MenuBookIcon fontSize="small" sx={{ mr: 0.5 }} /> General Ledger
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && view === 'gl' && (
        <GeneralLedgerView data={data} onRowClick={id => navigate(`/transactions/${id}/edit`)} />
      )}

      {!loading && data && view === 'arabic' && (
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
                  <TableCell sx={{ width: 180 ,textAlign:'center' }}>التاريخ</TableCell>
                  <TableCell sx={{ width: 80 , textAlign:'center' }}>مرجع</TableCell>
                  <TableCell sx={{ textAlign:'center' }}>البيان</TableCell>
                  <TableCell sx={{ textAlign:'center' }}>الطرف</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>مدين</TableCell>
                  <TableCell align="center" sx={{ width: 130 }}>دائن</TableCell>
                  <TableCell align="center" sx={{ width: 140 }}>الرصيد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Opening balance row */}
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ color: 'text.secondary', direction: 'ltr', textAlign: 'center' }}>
                    {data.from}
                  </TableCell>
                  <TableCell />
                  <TableCell align="center" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                    رصيد افتتاحي
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                  <TableCell align="center" sx={{ direction: 'ltr', fontWeight: 600 }}>
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
                    <TableCell sx={{ direction: 'ltr', textAlign: 'center', color: 'text.secondary' }}>
                      {row.date}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      {row.reference || '—'}
                    </TableCell>
                    <TableCell align='center' sx={{ textAlign: 'center' }}>
                      <Typography variant="body2">{row.entry_description}</Typography>
                      {row.line_description && (
                        <Typography variant="caption" color="text.secondary">
                          {row.line_description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', color: 'text.secondary' }}>
                      {row.party_name || '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: Number(row.debit) > 0 ? 'text.primary' : 'text.disabled' }}>
                      {Number(row.debit) > 0 ? numFmt(row.debit) : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: Number(row.credit) > 0 ? 'text.primary' : 'text.disabled' }}>
                      {Number(row.credit) > 0 ? numFmt(row.credit) : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
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
                    <TableCell align="center" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {numFmt(data.totals.debit)}
                    </TableCell>
                    <TableCell align="center" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {numFmt(data.totals.credit)}
                    </TableCell>
                    <TableCell align="center" sx={{ direction: 'ltr', fontWeight: 700, color: 'primary.main' }}>
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
