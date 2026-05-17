import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle,
  IconButton, InputAdornment,
  MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UnpublishedIcon from '@mui/icons-material/Unpublished'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import { journalApi } from '@/api/journal'
import type { JournalEntry, JournalEntryLine } from '@/types/journal'
import FiscalYearSelector from '@/components/FiscalYearSelector'

const fmt = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'

const debitLines  = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.debit)  > 0)
const creditLines = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.credit) > 0)

function AccountLine({
  prefix, name, tag, indent = false, prefixColor,
}: {
  prefix: string; name: string; tag: string; indent?: boolean; prefixColor: string
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', pl: indent ? 3 : 0, gap: 2 }}>
      <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
        {tag}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: indent ? 400 : 600 }}>
        <Box component="span" sx={{ color: prefixColor, fontWeight: 700, ml: 0.5 }}>{prefix}</Box>
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
        <AccountLine key={`d-${i}`} prefix="من ح/" name={l.account?.name ?? '—'} tag="(مدين)" prefixColor="primary.main" />
      ))}
      {credits.map((l, i) => (
        <AccountLine key={`c-${i}`} prefix="إلى ح/" name={l.account?.name ?? '—'} tag="(دائن)" indent prefixColor="success.main" />
      ))}
      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 0.5, fontStyle: 'italic' }}>
        ({entry.description})
      </Typography>
    </Box>
  )
}

const CELL_BORDER  = { borderLeft: '1px solid', borderColor: 'divider' }
const AMOUNT_CELL  = { ...CELL_BORDER, direction: 'rtl', fontVariantNumeric: 'tabular-nums', textAlign: 'center', width: 130 }
const DRAFT_BG     = 'rgba(237, 108, 2, 0.05)'   // subtle amber tint for unposted rows

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [entries, setEntries]         = useState<JournalEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [reversing, setReversing]     = useState<number | null>(null)
  const [confirmEntry, setConfirmEntry] = useState<JournalEntry | null>(null)

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

  const handlePeriodChange = (_fyId: number | null, f: string, t: string) => {
    setFrom(f); setTo(t)
    load({ search, from: f, to: t, status })
  }

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

  const handleReverse = async () => {
    if (!confirmEntry) return
    setReversing(confirmEntry.id)
    setConfirmEntry(null)
    try {
      await journalApi.reverse(confirmEntry.id)
      load()
    } finally {
      setReversing(null)
    }
  }

  const grandTotal   = entries.reduce((s, e) => s + Number(e.lines_sum_debit ?? 0), 0)
  const postedCount  = entries.filter(e => e.is_posted).length
  const draftCount   = entries.filter(e => !e.is_posted).length
  const hasFilters   = !!(search || from || to || status !== 'all')

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>القيود المحاسبية</Typography>
          <Typography variant="body2" color="text.secondary">
            {postedCount} مرحّل · {draftCount} مسودة
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <HelpButton title="دليل استخدام القيود المحاسبية">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هو القيد المحاسبي؟</Typography>
                <Typography variant="body2">القيد المحاسبي هو تسجيل عملية مالية وفق مبدأ القيد المزدوج: كل مبلغ يُدان في حساب يُقابله دائن في حساب آخر. مجموع المدين = مجموع الدائن دائماً.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>إنشاء قيد جديد</Typography>
                <Typography variant="body2">اضغط "قيد جديد"، أدخل التاريخ والبيان، ثم أضف الأسطر (حساب + مبلغ مدين أو دائن). لا يُحفظ القيد إلا عند التوازن التام.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>الترحيل والمسودة</Typography>
                <Typography variant="body2">القيد المسودة لا يؤثر على الأرصدة. اضغط أيقونة الترحيل لتأكيد القيد وتحديث الأرصدة. لا يمكن تعديل القيد بعد الترحيل.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>القيد العكسي</Typography>
                <Typography variant="body2">لإلغاء تأثير قيد مرحّل، استخدم "قيد عكسي" بدلاً من حذفه. يُنشئ النظام قيداً جديداً بنفس المبالغ لكن معكوسة.</Typography></Box>
            </Box>
          </HelpButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/journal/new')}>
            قيد جديد
          </Button>
        </Box>
      </Box>

      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Fiscal year selector */}
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={from} defaultTo={to} />

          <TextField
            size="small"
            placeholder="بحث في البيان أو المرجع..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            sx={{ minWidth: 200 }}
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
            size="small" type="date" label="من" value={from}
            onChange={e => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 145 }}
          />
          <TextField
            size="small" type="date" label="إلى" value={to}
            onChange={e => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 145 }}
          />
          <Select size="small" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 110 }}>
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
             {/* Count summary */}
        {!loading && entries.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">النتائج:</Typography>
            <Chip label={`${entries.length} قيد`} size="small" variant="outlined" />
            {postedCount > 0 && (
              <Chip label={`${postedCount} مرحَّل`} size="small" color="success" variant="outlined" />
            )}
            {draftCount > 0 && (
              <Chip label={`${draftCount} مسودة`} size="small" color="warning" variant="outlined" />
            )}
          </Box>
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
                <TableCell align="center" sx={{ ...CELL_BORDER, width: 155 }}>الإجراءات</TableCell>
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
                  sx={{
                    cursor: 'pointer',
                    verticalAlign: 'middle',
                    bgcolor: entry.is_posted ? undefined : DRAFT_BG,
                    '&:hover': {
                      bgcolor: entry.is_posted ? undefined : 'rgba(237, 108, 2, 0.10)',
                    },
                  }}
                  onClick={() => navigate(`/transactions/${entry.id}/edit`)}
                >
                  {/* التاريخ + الحالة */}
                  <TableCell align="center" sx={{ ...CELL_BORDER, py: 1 }}>
                    <Typography variant="body2" sx={{ direction: 'ltr', color: 'text.secondary' }}>
                      {entry.date}
                    </Typography>
                    <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 }}>
                      {entry.is_posted
                        ? <Chip label="مرحَّل"   color="success" size="small" />
                        : <Chip label="مسودة"    color="warning" size="small" />}
                      {entry.reversal_of && (
                        <Chip label="قيد عكسي" color="warning" size="small" variant="outlined" />
                      )}
                      {entry.reversed_by && (
                        <Chip label="معكوس"    color="error"   size="small" variant="outlined" />
                      )}
                    </Box>
                  </TableCell>

                  {/* البيان */}
                  <TableCell sx={{ ...CELL_BORDER, py: 0, direction: 'rtl' }}>
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

                  {/* Actions — horizontal */}
                  <TableCell sx={{ ...CELL_BORDER, px: 0.5, py: 0 }} onClick={e => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                      <Tooltip title={entry.is_posted ? 'إلغاء الترحيل' : 'ترحيل'}>
                        <IconButton size="small" color={entry.is_posted ? 'warning' : 'success'} onClick={() => handleTogglePost(entry)}>
                          {entry.is_posted ? <UnpublishedIcon sx={{ fontSize: 18 }} /> : <CheckCircleIcon sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={entry.reversed_by ? 'تم العكس مسبقاً' : 'عكس القيد'}>
                        <span>
                          <IconButton
                            size="small" color="secondary"
                            disabled={!entry.is_posted || !!entry.reversed_by || reversing === entry.id}
                            onClick={() => setConfirmEntry(entry)}
                          >
                            {reversing === entry.id
                              ? <CircularProgress size={14} />
                              : <SwapVertIcon sx={{ fontSize: 18 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="تعديل">
                        <span>
                          <IconButton size="small" color="primary" disabled={entry.is_posted} onClick={() => navigate(`/transactions/${entry.id}/edit`)}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="حذف">
                        <span>
                          <IconButton size="small" color="error" disabled={entry.is_posted} onClick={() => handleDelete(entry)}>
                            <DeleteIcon sx={{ fontSize: 18 }} />
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
                  <TableCell sx={{ borderTop: '2px solid', borderTopColor: 'divider', ...CELL_BORDER }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Reverse confirmation dialog */}
      <Dialog open={!!confirmEntry} onClose={() => setConfirmEntry(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تأكيد عكس القيد</DialogTitle>
        <DialogContent>
          <DialogContentText>سيتم إنشاء قيد عكسي يلغي أثر هذا القيد:</DialogContentText>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, direction: 'rtl' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmEntry?.description}</Typography>
            <Typography variant="caption" color="text.secondary">{confirmEntry?.date}</Typography>
          </Box>
          <DialogContentText sx={{ mt: 1.5, fontSize: 13 }}>
            القيد العكسي سيُرحَّل تلقائياً بتاريخ اليوم ولا يمكن التراجع عن هذا الإجراء.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEntry(null)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleReverse} startIcon={<SwapVertIcon />}>
            تأكيد العكس
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
