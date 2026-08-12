import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import rtlPlugin from 'stylis-plugin-rtl'
import {
  Alert, Autocomplete, Box, Button, CircularProgress, createFilterOptions, Divider,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, createTheme, ThemeProvider,
} from '@mui/material'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useThemeMode } from '@/context/ThemeModeContext'
import { useToast } from '@/lib/toast'
import api from '@/lib/axios'
import { journalApi } from '@/api/journal'
import { accountsApi } from '@/api/accounts'
import { partiesApi } from '@/api/parties'
import { fiscalYearsApi } from '@/api/fiscalYears'
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

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined | null>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') ref(node)
      else (ref as React.MutableRefObject<T | null>).current = node
    }
  }
}

const emptyLine = (): LineForm => ({
  account: null,
  party: null,
  description: '',
  debit: '',
  credit: '',
})

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

interface TrialBalanceRow {
  account_id: number
  balance: string
  balance_side: 'debit' | 'credit'
}

interface AccountOption {
  value: number
  label: string
  isRoot: boolean
  isParent: boolean
  balanceLabel: string | null
}

interface PartyOption {
  value: number
  label: string
}

const accountFilterOptions = createFilterOptions<AccountOption>({ stringify: o => o.label, matchFrom: 'any' })
const partyFilterOptions = createFilterOptions<PartyOption>({ stringify: o => o.label, matchFrom: 'any' })

const rtlCache = createCache({ key: 'mui-jef-rtl', stylisPlugins: [rtlPlugin] })

export default function JournalEntryFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const { mode } = useThemeMode()

  const theme = useMemo(() => createTheme({
    direction: 'rtl',
    palette: {
      mode,
      primary: { main: '#173A66' },
      success: { main: '#16a34a' },
      warning: { main: '#d97706' },
      error: { main: '#dc2626' },
    },
    typography: { fontFamily: '"Tajawal", sans-serif' },
    shape: { borderRadius: 10 },
  }), [mode])

  const [accounts, setAccounts] = useState<Account[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [balances, setBalances] = useState<Record<number, { amount: number; side: 'debit' | 'credit' }>>({})
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(today())
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [dateWarning, setDateWarning] = useState<string | null>(null)

  const accountRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const entryDescriptionRef = useRef<HTMLInputElement | null>(null)
  const debitRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const creditRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const parentIds = new Set(accounts.map(a => a.parent_id).filter(id => id !== null))

  useEffect(() => {
    Promise.all([
      accountsApi.list(),
      partiesApi.list(),
      api.get<{ rows: TrialBalanceRow[] }>('/api/reports/trial-balance', { params: { from: yearStart(), to: today() } }),
    ])
      .then(([accs, parts, trialBalance]) => {
        setAccounts(accs)
        setParties(parts)
        const map: Record<number, { amount: number; side: 'debit' | 'credit' }> = {}
        trialBalance.data.rows.forEach(r => { map[r.account_id] = { amount: Number(r.balance), side: r.balance_side } })
        setBalances(map)
      })
      .finally(() => setLoadingMeta(false))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    journalApi.get(Number(id)).then(entry => {
      setDate(entry.date)
      setReference(entry.reference ?? '')
      setDescription(entry.description)
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

  useEffect(() => {
    if (!date) return
    fiscalYearsApi.checkDate(date).then(res => {
      setDateWarning(res.covered ? null : 'لا توجد فترة محاسبية مفتوحة تغطي هذا التاريخ — سيُحفظ القيد لكن تأكد من صحة التاريخ')
    }).catch(() => setDateWarning(null))
  }, [date])

  useEffect(() => {
    if (loadingMeta || loadingEntry) return
    setTimeout(() => accountRefs.current[0]?.focus(), 0)
  }, [loadingMeta, loadingEntry])

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

    if (!description.trim()) { toast.error('الوصف مطلوب'); return }
    if (!isBalanced) { toast.error('مجموع المدين يجب أن يساوي مجموع الدائن'); return }
    if (lines.some(l => !l.account)) { toast.error('يجب اختيار الحساب لكل سطر'); return }

    const usedAccountIds = lines.map(l => l.account!.id)
    if (new Set(usedAccountIds).size !== usedAccountIds.length) {
      toast.error('لا يمكن اختيار نفس الحساب أكثر من مرة في القيد')
      return
    }

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
        toast.success('تم تحديث القيد')
      } else {
        await journalApi.create(payload)
        toast.success('تم إنشاء القيد')
      }
      navigate('/transactions')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta || loadingEntry) {
    return (
      <CacheProvider value={rtlCache}>
        <ThemeProvider theme={theme}>
          <Stack sx={{ alignItems: 'center', py: 10 }}>
            <CircularProgress size={40} />
          </Stack>
        </ThemeProvider>
      </CacheProvider>
    )
  }

  const numFmt = (n: number) => Math.round(n).toLocaleString('en-US')

  const accountOptions: AccountOption[] = accounts.map(a => {
    const isRoot = a.parent_id === null
    const isParent = parentIds.has(a.id)
    const bal = balances[a.id]
    const balanceLabel = bal && bal.amount > 0 ? `${numFmt(bal.amount)} ${bal.side === 'debit' ? 'م' : 'د'}` : null
    return { value: a.id, label: `${a.code} — ${a.name}`, isRoot, isParent, balanceLabel }
  })

  const partyOptions: PartyOption[] = parties.map(p => ({ value: p.id, label: p.name }))

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <Box component="form" sx={{ userSelect: 'none' }} onSubmit={handleSubmit}>
          {/* Header */}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
            <Tooltip title="رجوع">
              <IconButton onClick={() => navigate('/transactions')}>
                <ArrowLeft size={18} />
              </IconButton>
            </Tooltip>
            <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700 }}>
              {isEdit ? 'تعديل القيد' : 'قيد جديد'}
            </Typography>
            <Button
              type="submit"
              variant="contained"
              disabled={saving || !isBalanced}
              sx={{ minWidth: 120 }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'حفظ القيد'}
            </Button>
          </Stack>

          {dateWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>{dateWarning}</Alert>
          )}

          {/* Entry header fields */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <TextField
                label="التاريخ"
                type="date"
                size="small"
                value={date}
                onChange={e => setDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ width: 180 }}
              />
              <TextField
                label="المرجع"
                size="small"
                placeholder="اختياري"
                value={reference}
                onChange={e => setReference(e.target.value)}
                sx={{ width: 200 }}
              />
              <TextField
                label="الوصف"
                size="small"
                fullWidth
                value={description}
                onChange={e => setDescription(e.target.value)}
                slotProps={{ htmlInput: { ref: entryDescriptionRef } }}
                sx={{ flex: 1, minWidth: 240 }}
              />
            </Stack>
          </Paper>

          {/* Lines table */}
          <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '38%' }}>الحساب</TableCell>
                    <TableCell sx={{ width: '32%' }}>الجهة</TableCell>
                    <TableCell align="left" sx={{ width: '12%' }}>مدين</TableCell>
                    <TableCell align="left" sx={{ width: '12%' }}>دائن</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, i) => {
                    const selectedAccount = line.account
                      ? accountOptions.find(o => o.value === line.account!.id) ?? null
                      : null
                    const selectedParty = line.party
                      ? partyOptions.find(o => o.value === line.party!.id) ?? null
                      : null
                    const lineBalance = line.account ? balances[line.account.id] : undefined
                    const usedAccountIdsElsewhere = new Set(
                      lines.filter((l, idx) => idx !== i && l.account).map(l => l.account!.id)
                    )

                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={accountOptions}
                            value={selectedAccount}
                            filterOptions={accountFilterOptions}
                            getOptionLabel={o => o.label}
                            isOptionEqualToValue={(o, v) => o.value === v.value}
                            getOptionDisabled={o => o.isParent || usedAccountIdsElsewhere.has(o.value)}
                            noOptionsText="لا توجد نتائج"
                            onChange={(_, v) => {
                              const account = v ? accounts.find(a => a.id === v.value) ?? null : null
                              if (account && usedAccountIdsElsewhere.has(account.id)) {
                                toast.error('لا يمكن اختيار نفس الحساب أكثر من مرة في القيد')
                                return
                              }
                              updateLine(i, { account })
                              if (account) {
                                const target = i === 0 ? debitRefs : creditRefs
                                setTimeout(() => target.current[i]?.focus(), 0)
                              }
                            }}
                            renderOption={(props, option) => {
                              const { key, ...rest } = props
                              return (
                                <Box component="li" key={key} {...rest}>
                                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <Typography
                                      sx={{
                                        fontWeight: option.isRoot ? 700 : option.isParent ? 600 : 400,
                                        color: option.isRoot ? '#1565c0' : option.isParent ? '#2e7d32' : 'inherit',
                                        pr: option.isRoot ? 0 : option.isParent ? 1.5 : 3,
                                        fontSize: 13,
                                      }}
                                    >
                                      {option.label}
                                    </Typography>
                                    {option.balanceLabel && (
                                      <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr' }}>
                                        {option.balanceLabel}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                              )
                            }}
                            renderInput={params => (
                              <TextField
                                {...params}
                                placeholder="اختر حساباً"
                                slotProps={{
                                  ...params.slotProps,
                                  htmlInput: {
                                    ...params.slotProps.htmlInput,
                                    autoComplete: 'off',
                                    ref: mergeRefs(params.slotProps.htmlInput.ref, (el: HTMLInputElement | null) => { accountRefs.current[i] = el }),
                                  },
                                }}
                              />
                            )}
                          />
                          {line.account && lineBalance && lineBalance.amount > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, direction: 'ltr' }}>
                              الرصيد: {numFmt(lineBalance.amount)} {lineBalance.side === 'debit' ? 'مدين' : 'دائن'}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={partyOptions}
                            value={selectedParty}
                            filterOptions={partyFilterOptions}
                            getOptionLabel={o => o.label}
                            isOptionEqualToValue={(o, v) => o.value === v.value}
                            noOptionsText="لا توجد نتائج"
                            onChange={(_, v) => {
                              const party = v ? parties.find(p => p.id === v.value) ?? null : null
                              const update: Partial<LineForm> = { party }
                              if (party?.account && !line.account) {
                                const full = accounts.find(a => a.id === party.account!.id)
                                if (full) update.account = full
                              }
                              updateLine(i, update)
                            }}
                            renderInput={params => (
                              <TextField
                                {...params}
                                placeholder="اختياري"
                                slotProps={{
                                  ...params.slotProps,
                                  htmlInput: { ...params.slotProps.htmlInput, autoComplete: 'off' },
                                }}
                              />
                            )}
                          />
                        </TableCell>

                        <TableCell align="left">
                          <TextField
                            size="small"
                            type="number"
                            value={line.debit}
                            onChange={e => handleDebitChange(i, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                accountRefs.current[i + 1]?.focus()
                              }
                            }}
                            slotProps={{ htmlInput: { min: 0, step: 0.01, autoComplete: 'off', ref: (el: HTMLInputElement | null) => { debitRefs.current[i] = el } } }}
                            sx={{ width: 110, direction: 'ltr' }}
                          />
                        </TableCell>

                        <TableCell align="left">
                          <TextField
                            size="small"
                            type="number"
                            value={line.credit}
                            onChange={e => handleCreditChange(i, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                entryDescriptionRef.current?.focus()
                              }
                            }}
                            slotProps={{ htmlInput: { min: 0, step: 0.01, autoComplete: 'off', ref: (el: HTMLInputElement | null) => { creditRefs.current[i] = el } } }}
                            sx={{ width: 110, direction: 'ltr' }}
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
                                <Trash2 size={15} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ p: 2 }}>
              <Button startIcon={<Plus size={14} />} onClick={addLine} size="small">
                إضافة سطر
              </Button>
            </Box>
          </Paper>

          {/* Balance summary */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={4} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
              <Stack sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي المدين</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalDebit)}</Typography>
              </Stack>
              <Divider orientation="vertical" flexItem />
              <Stack sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">إجمالي الدائن</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalCredit)}</Typography>
              </Stack>
              <Divider orientation="vertical" flexItem />
              <Stack sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">الفرق</Typography>
                <Typography sx={{ fontWeight: 700, direction: 'ltr' }} color={isBalanced ? 'success.main' : 'error.main'}>
                  {numFmt(Math.abs(totalDebit - totalCredit))}
                </Typography>
              </Stack>
              <Box
                sx={{
                  fontWeight: 700, px: 2, py: 0.5, borderRadius: 1.5,
                  bgcolor: isBalanced ? '#dcfce7' : '#fee2e2',
                  color: isBalanced ? '#16a34a' : '#dc2626',
                }}
              >
                {isBalanced ? 'متوازن' : 'غير متوازن'}
              </Box>
            </Stack>
          </Paper>
        </Box>
      </ThemeProvider>
    </CacheProvider>
  )
}
