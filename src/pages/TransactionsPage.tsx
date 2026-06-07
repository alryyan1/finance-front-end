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
import FirebaseImportDialog from '@/components/FirebaseImportDialog'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UnpublishedIcon from '@mui/icons-material/Unpublished'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import TableViewIcon from '@mui/icons-material/TableView'
import { journalApi } from '@/api/journal'
import { openPdf } from '@/api/pdf'
import type { JournalEntry, JournalEntryLine } from '@/types/journal'
import FiscalYearSelector from '@/components/FiscalYearSelector'

const fmt = (v: string | null | undefined) =>
  v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'

const debitLines  = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.debit)  > 0)
const creditLines = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.credit) > 0)

function BayanCell({ entry }: { entry: JournalEntry }) {
  const lines       = entry.lines ?? []
  const debits      = debitLines(lines)
  const credits     = creditLines(lines)
  const multiDebit  = debits.length  > 1
  const multiCredit = credits.length > 1
  const debitTotal  = debits.reduce((s, l)  => s + Number(l.debit),  0)
  const creditTotal = credits.reduce((s, l) => s + Number(l.credit), 0)

  const Line = ({ prefix, name, amount, indent, color }: {
    prefix: string; name: string; amount: string; indent: boolean; color: string
  }) => (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, pl: indent ? 1.5 : 0, direction: 'ltr' }}>
      <Typography component="span" variant="caption" sx={{ color, fontWeight: 700, flexShrink: 0 }}>{prefix}</Typography>
      <Typography component="span" variant="caption" sx={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Typography>
      <Typography component="span" variant="caption" sx={{ color, fontWeight: 600, ml: 'auto', pl: 1, direction: 'ltr', flexShrink: 0 }}>{amount}</Typography>
    </Box>
  )

  return (
    <Box sx={{ py: 0.5 }}>
      {multiDebit && (
        <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'block', direction: 'ltr' }}>
          من مذكورين · {debitTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Typography>
      )}
      {debits.map((l, i) => (
        <Line key={`d-${i}`} prefix="من ح/" name={l.account?.name ?? '—'} amount={fmt(l.debit)} indent={multiDebit} color="primary.main" />
      ))}
      {multiCredit && (
        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, display: 'block', direction: 'rtl', mt: 0.25 }}>
          إلى مذكورين · {creditTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Typography>
      )}
      {credits.map((l, i) => (
        <Line key={`c-${i}`} prefix="إلى ح/" name={l.account?.name ?? '—'} amount={fmt(l.credit)} indent={multiCredit || !multiDebit} color="success.main" />
      ))}
      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic', display: 'block', mt: 0.25 }}>
        {entry.description}
      </Typography>
    </Box>
  )
}

const CB  = { borderLeft: '1px solid', borderColor: 'divider' }
const AMT = { ...CB, fontVariantNumeric: 'tabular-nums', textAlign: 'center', width: 115 } as const

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [entries,      setEntries]      = useState<JournalEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [reversing,    setReversing]    = useState<number | null>(null)
  const [togglingId,   setTogglingId]   = useState<number | null>(null)
  const [confirmEntry, setConfirmEntry] = useState<JournalEntry | null>(null)
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)

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
    setEntries(prev => prev.filter(e => e.id !== entry.id))
  }

  const handleTogglePost = async (entry: JournalEntry) => {
    setTogglingId(entry.id)
    try {
      const updated = await journalApi.togglePost(entry.id)
      setEntries(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    } finally {
      setTogglingId(null)
    }
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

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await openPdf('/api/journal-entries/pdf', {
        from:   from   || undefined,
        to:     to     || undefined,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const grandTotal  = entries.reduce((s, e) => s + Number(e.lines_sum_debit ?? 0), 0)
  const postedCount = entries.filter(e =>  e.is_posted).length
  const draftCount  = entries.filter(e => !e.is_posted).length
  const hasFilters  = !!(search || from || to || status !== 'all')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>القيود المحاسبية</Typography>
          {!loading && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.25 }}>
              <Typography variant="caption" color="text.secondary">{entries.length} قيد</Typography>
              {postedCount > 0 && <Typography variant="caption" sx={{ color: 'success.main' }}>· {postedCount} مرحَّل</Typography>}
              {draftCount  > 0 && <Typography variant="caption" sx={{ color: 'warning.main' }}>· {draftCount} مسودة</Typography>}
            </Box>
          )}
        </Box>
        <HelpButton title="دليل استخدام القيود المحاسبية">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>ما هو القيد المحاسبي؟</Typography>
              <Typography variant="body2">القيد المحاسبي هو تسجيل عملية مالية وفق مبدأ القيد المزدوج: مجموع المدين = مجموع الدائن دائماً.</Typography></Box>
            <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>الترحيل والمسودة</Typography>
              <Typography variant="body2">القيد المسودة لا يؤثر على الأرصدة. اضغط أيقونة الترحيل لتأكيد القيد. لا يمكن تعديل القيد بعد الترحيل.</Typography></Box>
            <Box><Typography variant="subtitle2" sx={{ fontWeight: 700 }} gutterBottom>القيد العكسي</Typography>
              <Typography variant="body2">لإلغاء تأثير قيد مرحّل، استخدم "قيد عكسي" — يُنشئ النظام قيداً جديداً بمبالغ معكوسة.</Typography></Box>
          </Box>
        </HelpButton>
        <Button
          variant="outlined" size="small"
          startIcon={<CloudDownloadIcon sx={{ fontSize: 16 }} />}
          onClick={() => setImportOpen(true)}
          sx={{ fontSize: 12 }}
        >
          Firebase
        </Button>
      </Box>

      {/* ── Filters ── */}
      <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={from} defaultTo={to} />
          <TextField
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            sx={{ width: 180, '& .MuiInputBase-input': { py: '5px', fontSize: 13 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            size="small" type="date" label="من" value={from}
            onChange={e => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 135, '& .MuiInputBase-input': { py: '5px', fontSize: 13 } }}
          />
          <TextField
            size="small" type="date" label="إلى" value={to}
            onChange={e => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 135, '& .MuiInputBase-input': { py: '5px', fontSize: 13 } }}
          />
          <Select
            size="small" value={status} onChange={e => setStatus(e.target.value)}
            sx={{ minWidth: 95, fontSize: 13, '& .MuiSelect-select': { py: '5px' } }}
          >
            <MenuItem value="all" sx={{ fontSize: 13 }}>الكل</MenuItem>
            <MenuItem value="posted" sx={{ fontSize: 13 }}>مرحَّل</MenuItem>
            <MenuItem value="draft" sx={{ fontSize: 13 }}>مسودة</MenuItem>
          </Select>
          <Button variant="contained" size="small" sx={{ fontSize: 12 }} onClick={() => load()}>بحث</Button>
          {hasFilters && (
            <Tooltip title="إلغاء الفلاتر">
              <IconButton size="small" onClick={handleReset}>
                <FilterAltOffIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="طباعة PDF">
            <span>
              <IconButton size="small" color="error" onClick={handlePdf} disabled={pdfLoading || entries.length === 0}>
                {pdfLoading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon sx={{ fontSize: 18 }} />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="تصدير Excel">
            <span>
              <IconButton
                size="small" color="success" disabled={entries.length === 0}
                onClick={() => {
                  const p = new URLSearchParams()
                  if (from)             p.set('from',   from)
                  if (to)               p.set('to',     to)
                  if (search)           p.set('search', search)
                  if (status !== 'all') p.set('status', status)
                  const qs = p.toString()
                  navigate(`/journal-spreadsheet${qs ? `?${qs}` : ''}`)
                }}
              >
                <TableViewIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>

      {/* ── Table ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell align="center" sx={{ ...CB, width: 110, py: 0.75, fontSize: 12, fontWeight: 700 }}>#</TableCell>
                <TableCell align="center" sx={{ ...CB, width: 105, py: 0.75, fontSize: 12, fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ ...CB, py: 0.75, fontSize: 12, fontWeight: 700 }}>البيان</TableCell>
                <TableCell align="center" sx={{ ...CB, width: 115, py: 0.75, fontSize: 12, fontWeight: 700, color: 'success.main' }}>دائن</TableCell>
                <TableCell align="center" sx={{ ...CB, width: 115, py: 0.75, fontSize: 12, fontWeight: 700, color: 'primary.main' }}>مدين</TableCell>
                <TableCell align="center" sx={{ ...CB, width: 130, py: 0.75, fontSize: 12, fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary', fontSize: 13 }}>
                    لا توجد قيود
                  </TableCell>
                </TableRow>
              )}

              {entries.map(entry => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    verticalAlign: 'top',
                    bgcolor: entry.is_posted ? undefined : 'rgba(237,108,2,0.04)',
                    borderLeft: '3px solid',
                    borderLeftColor: entry.is_posted ? 'success.main' : 'warning.main',
                    '&:hover': { bgcolor: entry.is_posted ? 'action.hover' : 'rgba(237,108,2,0.08)' },
                  }}
                  onClick={() => navigate(`/transactions/${entry.id}/edit`)}
                >
                  {/* # */}
                  <TableCell align="center" sx={{ ...CB, py: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', direction: 'ltr', display: 'block' }}>
                      #{entry.id}
                    </Typography>
                    {entry.reference && (
                      <Typography variant="caption" color="text.disabled" sx={{ direction: 'ltr', display: 'block' }}>
                        {entry.reference}
                      </Typography>
                    )}
                    {entry.reversal_of && (
                      <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block' }}>↩ عكسي</Typography>
                    )}
                    {entry.reversed_by && (
                      <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>↩ معكوس</Typography>
                    )}
                  </TableCell>

                  {/* Date + status */}
                  <TableCell align="center" sx={{ ...CB, py: 0.75 }}>
                    <Typography variant="caption" sx={{ direction: 'ltr', display: 'block', color: 'text.primary', fontWeight: 500 }}>
                      {entry.date}
                    </Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.25 }}>
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%',
                        bgcolor: entry.is_posted ? 'success.main' : 'warning.main',
                        flexShrink: 0,
                      }} />
                      <Typography variant="caption" sx={{
                        color: entry.is_posted ? 'success.main' : 'warning.main',
                        fontWeight: 600, lineHeight: 1,
                      }}>
                        {entry.is_posted ? 'مرحَّل' : 'مسودة'}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* بيان */}
                  <TableCell sx={{ ...CB, py: 0 }}>
                    <BayanCell entry={entry} />
                  </TableCell>

                  {/* دائن */}
                  <TableCell sx={{ ...AMT, py: 0.75 }}>
                    <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {fmt(entry.lines_sum_debit)}
                    </Typography>
                  </TableCell>

                  {/* مدين */}
                  <TableCell sx={{ ...AMT, py: 0.75 }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {fmt(entry.lines_sum_debit)}
                    </Typography>
                  </TableCell>

                  {/* Actions */}
                  <TableCell sx={{ ...CB, px: 0.5, py: 0.5 }} onClick={e => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
                      <Tooltip title={entry.is_posted ? 'إلغاء الترحيل' : 'ترحيل'}>
                        <IconButton
                          size="small"
                          color={entry.is_posted ? 'warning' : 'success'}
                          disabled={togglingId === entry.id}
                          onClick={() => handleTogglePost(entry)}
                          sx={{ p: '4px' }}
                        >
                          {togglingId === entry.id
                            ? <CircularProgress size={14} color="inherit" />
                            : entry.is_posted
                              ? <UnpublishedIcon sx={{ fontSize: 16 }} />
                              : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={entry.reversed_by ? 'تم العكس مسبقاً' : 'عكس القيد'}>
                        <span>
                          <IconButton
                            size="small" color="secondary"
                            disabled={!entry.is_posted || !!entry.reversed_by || reversing === entry.id}
                            onClick={() => setConfirmEntry(entry)}
                            sx={{ p: '4px' }}
                          >
                            {reversing === entry.id
                              ? <CircularProgress size={14} />
                              : <SwapVertIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="تعديل">
                        <span>
                          <IconButton
                            size="small" color="primary"
                            disabled={entry.is_posted}
                            onClick={() => navigate(`/transactions/${entry.id}/edit`)}
                            sx={{ p: '4px' }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="حذف">
                        <span>
                          <IconButton
                            size="small" color="error"
                            disabled={entry.is_posted}
                            onClick={() => handleDelete(entry)}
                            sx={{ p: '4px' }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {entries.length > 0 && (
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell colSpan={3} sx={{ ...CB, py: 0.75, fontWeight: 700, fontSize: 12, borderTop: '2px solid', borderTopColor: 'divider' }}>
                    الإجمالي
                  </TableCell>
                  <TableCell sx={{ ...AMT, fontWeight: 700, fontSize: 12, borderTop: '2px solid', borderTopColor: 'divider', color: 'success.main', py: 0.75 }}>
                    {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ ...AMT, fontWeight: 700, fontSize: 12, borderTop: '2px solid', borderTopColor: 'divider', color: 'primary.main', py: 0.75 }}>
                    {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell sx={{ ...CB, borderTop: '2px solid', borderTopColor: 'divider' }} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Reverse confirmation ── */}
      <Dialog open={!!confirmEntry} onClose={() => setConfirmEntry(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1, fontSize: 16 }}>تأكيد عكس القيد</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13 }}>سيتم إنشاء قيد عكسي يلغي أثر:</DialogContentText>
          <Box sx={{ mt: 1, p: 1.25, bgcolor: 'grey.50', borderRadius: 1, direction: 'rtl' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{confirmEntry?.description}</Typography>
            <Typography variant="caption" color="text.secondary">{confirmEntry?.date}</Typography>
          </Box>
          <DialogContentText sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
            يُرحَّل تلقائياً بتاريخ اليوم — لا يمكن التراجع.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setConfirmEntry(null)}>إلغاء</Button>
          <Button size="small" variant="contained" color="warning" onClick={handleReverse} startIcon={<SwapVertIcon sx={{ fontSize: 16 }} />}>
            تأكيد العكس
          </Button>
        </DialogActions>
      </Dialog>

      <FirebaseImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); load() }}
      />
    </Box>
  )
}
