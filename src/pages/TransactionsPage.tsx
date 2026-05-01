import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UnpublishedIcon from '@mui/icons-material/Unpublished'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import { journalApi } from '@/api/journal'
import type { JournalEntry, JournalEntryLine } from '@/types/journal'

const fmt = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'

const debitLines  = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.debit)  > 0)
const creditLines = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.credit) > 0)

/** One line in the البيان: account name on the RIGHT, (مدين)/(دائن) tag on the LEFT */
function AccountLine({
  prefix, name, tag, indent = false, prefixColor,
}: {
  prefix: string
  name: string
  tag: string
  indent?: boolean
  prefixColor: string
}) {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      pl: indent ? 3 : 0,
      gap: 2,
    }}>
      {/* LEFT side — (مدين) / (دائن) */}
      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        {tag}
      </Typography>
      {/* RIGHT side — من ح/ account name */}
      <Typography variant="body2" sx={{ fontWeight: indent ? 400 : 600 }}>
        <Box component="span" sx={{ color: prefixColor, fontWeight: 700, ml: 0.5 }}>
          {prefix}
        </Box>
        {name}
      </Typography>
    </Box>
  )
}

function BayanCell({ entry }: { entry: JournalEntry }) {
  const lines   = entry.lines ?? []
  const debits  = debitLines(lines)
  const credits = creditLines(lines)

  return (
    <Box sx={{ py: 0.75 }}>
      {debits.map((l, i) => (
        <AccountLine
          key={`d-${i}`}
          prefix="من ح/"
          name={l.account?.name ?? '—'}
          tag="(مدين)"
          prefixColor="primary.main"
        />
      ))}
      {credits.map((l, i) => (
        <AccountLine
          key={`c-${i}`}
          prefix="إلى ح/"
          name={l.account?.name ?? '—'}
          tag="(دائن)"
          indent
          prefixColor="success.main"
        />
      ))}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontStyle: 'italic' }}
      >
        ({entry.description})
      </Typography>
    </Box>
  )
}

const CELL_BORDER = { borderLeft: '1px solid', borderColor: 'divider' }
const AMOUNT_CELL = { ...CELL_BORDER, direction: 'rtl', fontVariantNumeric: 'tabular-nums', textAlign: 'center', width: 130 }

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [from,   setFrom]   = useState('')
  const [to,     setTo]     = useState('')
  const [status, setStatus] = useState('all')

  const load = (params?: { search: string; from: string; to: string; status: string }) => {
    setLoading(true)
    const p = params ?? { search, from, to, status }
    journalApi.list({
      search: p.search  || undefined,
      from:   p.from    || undefined,
      to:     p.to      || undefined,
      status: p.status !== 'all' ? p.status : undefined,
    }).then(setEntries).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleReset = () => {
    setSearch(''); setFrom(''); setTo(''); setStatus('all')
    load({ search: '', from: '', to: '', status: 'all' })
  }

  const handleDelete = async (entry: JournalEntry) => {
    if (!confirm(`حذف القيد: ${entry.description}؟`)) return
    await journalApi.remove(entry.id)
    load()
  }

  const handleTogglePost = async (entry: JournalEntry) => {
    await journalApi.togglePost(entry.id)
    load()
  }

  const grandTotal = entries.reduce((s, e) => s + Number(e.lines_sum_debit ?? 0), 0)
  const hasFilters = !!(search || from || to || status !== 'all')

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>القيود اليومية</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/transactions/new')}>
          قيد جديد
        </Button>
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث في البيان أو المرجع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            sx={{ minWidth: 220 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            size="small"
            type="date"
            label="من"
            value={from}
            onChange={e => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="إلى"
            value={to}
            onChange={e => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          <Select
            size="small"
            value={status}
            onChange={e => setStatus(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="posted">مرحَّل</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
          </Select>
          <Button variant="contained" onClick={() => load()}>بحث</Button>
          {hasFilters && (
            <Tooltip title="إلغاء الفلاتر">
              <IconButton onClick={handleReset} color="default">
                <FilterAltOffIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!loading && (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto' }}>
              {entries.length} نتيجة
            </Typography>
          )}
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell align="center" sx={{ ...CELL_BORDER, width: 150 }}>التاريخ</TableCell>
                <TableCell align="center" sx={CELL_BORDER}>البيان</TableCell>
                <TableCell align="center" sx={{ ...CELL_BORDER, width: 130 }}>دائن</TableCell>
                <TableCell align="center" sx={{ ...CELL_BORDER, width: 130 }}>مدين</TableCell>
                <TableCell sx={{ width: 40 }} />
              </TableRow>
            </TableHead>

            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد قيود بعد
                  </TableCell>
                </TableRow>
              )}

              {entries.map(entry => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{ cursor: 'pointer', verticalAlign: 'middle' }}
                  onClick={() => navigate(`/transactions/${entry.id}/edit`)}
                >
                  {/* التاريخ + الحالة */}
                  <TableCell align="center" sx={{ ...CELL_BORDER, py: 1 }}>
                    <Typography variant="body2" sx={{ direction: 'ltr', color: 'text.secondary' }}>
                      {entry.date}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {entry.is_posted
                        ? <Chip label="مرحَّل" color="success" size="small" />
                        : <Chip label="مسودة"  color="default" size="small" />}
                    </Box>
                  </TableCell>

                  {/* البيان */}
                  <TableCell sx={{ ...CELL_BORDER, py: 0 ,direction: 'rtl' }}>
                    <BayanCell entry={entry} />
                  </TableCell>

                  {/* دائن */}
                  <TableCell sx={{ ...AMOUNT_CELL, py: 1 }}>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {fmt(entry.lines_sum_debit)}
                    </Typography>
                  </TableCell>

                  {/* مدين */}
                  <TableCell sx={{ ...AMOUNT_CELL, py: 1 }}>
                    <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {fmt(entry.lines_sum_debit)}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell sx={{ px: 0.5, py: 0 }} onClick={e => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, py: 0.5 }}>
                      <Tooltip title={entry.is_posted ? 'إلغاء الترحيل' : 'ترحيل'}>
                        <IconButton size="small" color={entry.is_posted ? 'warning' : 'success'} onClick={() => handleTogglePost(entry)}>
                          {entry.is_posted ? <UnpublishedIcon sx={{ fontSize: 16 }} /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <span>
                          <IconButton size="small" color="primary" disabled={entry.is_posted} onClick={() => navigate(`/transactions/${entry.id}/edit`)}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <span>
                          <IconButton size="small" color="error" disabled={entry.is_posted} onClick={() => handleDelete(entry)}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals row */}
              {entries.length > 0 && (
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell colSpan={2} align="center" sx={{ ...CELL_BORDER, fontWeight: 700, borderTop: '2px solid', borderTopColor: 'divider' }}>
                    الإجمالي
                  </TableCell>
                  <TableCell sx={{ ...AMOUNT_CELL, fontWeight: 700, borderTop: '2px solid', borderTopColor: 'divider', color: 'success.main' }}>
                    {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ ...AMOUNT_CELL, fontWeight: 700, borderTop: '2px solid', borderTopColor: 'divider', color: 'primary.main' }}>
                    {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ borderTop: '2px solid', borderTopColor: 'divider' }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
