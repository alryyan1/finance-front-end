import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Autocomplete, Box, Button, CircularProgress,
  Divider, IconButton, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { journalApi } from '@/api/journal'
import { accountsApi } from '@/api/accounts'
import { partiesApi } from '@/api/parties'
import type { JournalEntryLinePayload } from '@/types/journal'
import type { Account } from '@/types/account'
import type { Party } from '@/types/party'

interface LineForm {
  account: Account | null
  party: Party | null
  description: string
  debit: string
  credit: string
}

const emptyLine = (): LineForm => ({
  account: null,
  party: null,
  description: '',
  debit: '',
  credit: '',
})

const today = () => new Date().toISOString().slice(0, 10)

export default function JournalEntryFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(today())
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])

  const firstAccountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([accountsApi.list(), partiesApi.list()])
      .then(([accs, parts]) => {
        setAccounts(accs)
        setParties(parts)
      })
      .finally(() => setLoadingMeta(false))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    journalApi.get(Number(id)).then(entry => {
      setDate(entry.date)
      setReference(entry.reference ?? '')
      setDescription(entry.description)
      // lines populated after accounts loaded — handled below
      setLines(
        (entry.lines ?? []).map(l => ({
          account: l.account ? ({ id: l.account.id, code: l.account.code, name: l.account.name } as Account) : null,
          party: l.party ? ({ id: l.party.id, name: l.party.name } as Party) : null,
          description: l.description ?? '',
          debit: l.debit === '0.00' ? '' : String(Number(l.debit)),
          credit: l.credit === '0.00' ? '' : String(Number(l.credit)),
        }))
      )
    }).finally(() => setLoadingEntry(false))
  }, [id, isEdit])

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0

  const updateLine = (i: number, patch: Partial<LineForm>) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  const handleDebitChange = (i: number, val: string) => {
    updateLine(i, { debit: val, credit: val ? '' : lines[i].credit })
  }

  const handleCreditChange = (i: number, val: string) => {
    updateLine(i, { credit: val, debit: val ? '' : lines[i].debit })
  }

  const addLine = () => setLines(prev => [...prev, emptyLine()])

  const removeLine = (i: number) => {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError(null)

    if (!description.trim()) { setError('الوصف مطلوب'); return }
    if (!isBalanced) { setError('مجموع المدين يجب أن يساوي مجموع الدائن'); return }
    if (lines.some(l => !l.account)) { setError('يجب اختيار الحساب لكل سطر'); return }

    const payload = {
      date,
      reference: reference.trim() || null,
      description: description.trim(),
      lines: lines.map(l => ({
        account_id: l.account!.id,
        party_id: l.party?.id ?? null,
        description: l.description.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })) as JournalEntryLinePayload[],
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await journalApi.update(Number(id), payload)
      } else {
        await journalApi.create(payload)
      }
      navigate('/transactions')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta || loadingEntry) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  const numFmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Tooltip title="رجوع">
          <IconButton onClick={() => navigate('/transactions')}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" sx={{ fontWeight: 700, flexGrow: 1 }}>
          {isEdit ? 'تعديل القيد' : 'قيد جديد'}
        </Typography>
        <Button
          type="submit"
          variant="contained"
          disabled={saving || !isBalanced}
          sx={{ minWidth: 120 }}
        >
          {saving ? <CircularProgress size={20} /> : 'حفظ القيد'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Entry header fields */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 2fr' }, gap: 2 }}>
          <TextField
            label="التاريخ"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="المرجع"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="اختياري"
          />
          <TextField
            label="الوصف"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
          />
        </Box>
      </Paper>

      {/* Lines table */}
      <Paper sx={{ mb: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '28%' }}>الحساب</TableCell>
                <TableCell sx={{ width: '16%' }}>الجهة</TableCell>
                <TableCell>البيان</TableCell>
                <TableCell align="left" sx={{ width: '12%' }}>مدين</TableCell>
                <TableCell align="left" sx={{ width: '12%' }}>دائن</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Autocomplete
                      options={accounts}
                      value={line.account}
                      onChange={(_, v) => updateLine(i, { account: v })}
                      getOptionLabel={a => `${a.code} — ${a.name}`}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      renderInput={params => (
                        <TextField
                          {...params}
                          placeholder="اختر حساباً"
                          size="small"
                          inputRef={i === 0 ? firstAccountRef : undefined}
                        />
                      )}
                      size="small"
                      disableClearable={false}
                      noOptionsText="لا توجد نتائج"
                    />
                  </TableCell>
                  <TableCell>
                    <Autocomplete
                      options={parties}
                      value={line.party}
                      onChange={(_, v) => updateLine(i, { party: v })}
                      getOptionLabel={p => p.name}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      renderInput={params => (
                        <TextField {...params} placeholder="اختياري" size="small" />
                      )}
                      size="small"
                      disableClearable={false}
                      noOptionsText="لا توجد نتائج"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={line.description}
                      onChange={e => updateLine(i, { description: e.target.value })}
                      placeholder="بيان السطر"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={line.debit}
                      onChange={e => handleDebitChange(i, e.target.value)}
                      inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={line.credit}
                      onChange={e => handleCreditChange(i, e.target.value)}
                      inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="حذف السطر">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeLine(i)}
                          disabled={lines.length <= 2}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ px: 2, py: 1.5 }}>
          <Button startIcon={<AddIcon />} onClick={addLine} size="small">
            إضافة سطر
          </Button>
        </Box>
      </Paper>

      {/* Balance summary */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, alignItems: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">إجمالي المدين</Typography>
            <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalDebit)}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">إجمالي الدائن</Typography>
            <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalCredit)}</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">الفرق</Typography>
            <Typography
              sx={{
                fontWeight: 700,
                direction: 'ltr',
                color: isBalanced ? 'success.main' : 'error.main',
              }}
            >
              {numFmt(Math.abs(totalDebit - totalCredit))}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                px: 2,
                py: 0.5,
                borderRadius: 1,
                bgcolor: isBalanced ? 'success.light' : 'error.light',
                color: isBalanced ? 'success.dark' : 'error.dark',
              }}
            >
              {isBalanced ? 'متوازن' : 'غير متوازن'}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
