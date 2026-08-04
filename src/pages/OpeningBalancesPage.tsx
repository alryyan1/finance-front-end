import { Fragment, useMemo, useState } from 'react'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import rtlPlugin from 'stylis-plugin-rtl'
import {
  Alert, Box, Button, CircularProgress, createTheme, Divider, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  ThemeProvider, Typography,
} from '@mui/material'
import HelpButton from '@/components/common/HelpButton'
import { Save } from 'lucide-react'
import api from '@/lib/axios'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'
import { useThemeMode } from '@/context/ThemeModeContext'

interface OBRow {
  account_id: number
  code: string
  name: string
  type: string
  debit: string
  credit: string
}

type EditRow = OBRow & { _debit: string; _credit: string }

const TYPE_LABELS: Record<string, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
}
const TYPE_ORDER = ['asset', 'liability', 'equity']

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

const rtlCache = createCache({ key: 'mui-ob-rtl', stylisPlugins: [rtlPlugin] })

export default function OpeningBalancesPage() {
  const toast = useToast()
  const { mode } = useThemeMode()
  const [rows, setRows]             = useState<EditRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [periodLabel, setPeriodLabel]   = useState<string>('')

  const theme = useMemo(() => createTheme({
    direction: 'rtl',
    palette: {
      mode,
      primary: { main: '#173A66' },
      success: { main: '#16a34a' },
      error: { main: '#dc2626' },
    },
    typography: { fontFamily: '"Tajawal", sans-serif' },
    shape: { borderRadius: 10 },
  }), [mode])

  const load = (fyId: number | null) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : {}
    api.get<OBRow[]>('/api/opening-balances', { params })
      .then(r => setRows(r.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      }))))
      .catch(() => toast.error('تعذّر تحميل الأرصدة'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, from: string, to: string) => {
    setFiscalYearId(fyId)
    setPeriodLabel(fyId ? `${from} — ${to}` : 'أرصدة عامة')
    load(fyId)
  }

  const setDebit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _debit: val, _credit: val ? '' : r._credit } : r))

  const setCredit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _credit: val, _debit: val ? '' : r._debit } : r))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        fiscal_year_id: fiscalYearId,
        rows: rows.map(r => ({
          account_id: r.account_id,
          debit:  parseInt(r._debit, 10)  || 0,
          credit: parseInt(r._credit, 10) || 0,
        })),
      }
      const res = await api.put<OBRow[]>('/api/opening-balances', payload)
      setRows(res.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      })))
      toast.success('تم حفظ الأرصدة الافتتاحية بنجاح')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'تعذّر الحفظ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(r._debit)  || 0), 0)
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(r._credit) || 0), 0)
  const diff        = Math.abs(totalDebit - totalCredit)
  const isBalanced  = diff < 0.005

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    rows:  rows.filter(r => r.type === type),
  })).filter(g => g.rows.length > 0)

  return (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={theme}>
        <Box>
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ minWidth: 160 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>الأرصدة الافتتاحية</Typography>
                <Typography variant="caption" color="text.secondary">
                  {periodLabel || 'اختر الفترة المحاسبية'}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />

              <FiscalYearSelector
                size="small"
                onChange={handlePeriodChange}
                defaultFrom={`${new Date().getFullYear()}-01-01`}
                defaultTo={today()}
              />

              <Box sx={{ flexGrow: 1 }} />

              <HelpButton title="دليل استخدام الأرصدة الافتتاحية">
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>ما هي الأرصدة الافتتاحية؟</Typography>
                    <Typography variant="body2">الأرصدة الافتتاحية هي أرصدة الحسابات في بداية الفترة المالية. تُسجَّل عند بدء استخدام النظام لنقل الأرصدة من النظام القديم.</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>كيفية الإدخال</Typography>
                    <Typography variant="body2">اختر الفترة المالية من منتقي السنة، ثم أدخل الرصيد الافتتاحي لكل حساب مع تحديد الجهة (مدين/دائن). اضغط "حفظ الأرصدة" عند الانتهاء.</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>تنبيه مهم</Typography>
                    <Typography variant="body2">تأكد أن مجموع أرصدة المدين يساوي مجموع أرصدة الدائن قبل الحفظ. الأرصدة الافتتاحية غير المتوازنة ستؤثر على دقة جميع التقارير.</Typography>
                  </Box>
                </Stack>
              </HelpButton>
              <Button
                variant="contained"
                size="small"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                onClick={handleSave}
                disabled={saving || loading || rows.length === 0}
              >
                حفظ الأرصدة
              </Button>
            </Stack>
          </Paper>

          {loading && (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Stack>
          )}

          {!loading && rows.length === 0 && (
            <Alert severity="info">اختر فترة محاسبية لعرض الأرصدة الافتتاحية</Alert>
          )}

          {!loading && rows.length > 0 && (
            <>
              <Paper variant="outlined" sx={{ mb: 1.5, overflow: 'hidden' }}>
                <TableContainer>
                  <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: 90 }}>الرمز</TableCell>
                        <TableCell>اسم الحساب</TableCell>
                        <TableCell align="center" sx={{ width: 130 }}>مدين</TableCell>
                        <TableCell align="center" sx={{ width: 130 }}>دائن</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grouped.map(({ type, label, rows: groupRows }) => (
                        <Fragment key={type}>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell colSpan={4} sx={{ py: '4px !important' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                {label}
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {groupRows.map(row => (
                            <TableRow key={row.account_id}>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">{row.code}</Typography>
                              </TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell align="center">
                                <TextField
                                  size="small" type="number"
                                  slotProps={{ htmlInput: { step: 1, min: 0 } }}
                                  sx={{ width: 150, '& input': { direction: 'ltr', textAlign: 'center', py: 0.5 } }}
                                  value={row._debit}
                                  onChange={e => setDebit(row.account_id, e.target.value)}
                                  placeholder="0"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <TextField
                                  size="small" type="number"
                                  slotProps={{ htmlInput: { step: 1, min: 0 } }}
                                  sx={{ width: 150, '& input': { direction: 'ltr', textAlign: 'center', py: 0.5 } }}
                                  value={row._credit}
                                  onChange={e => setCredit(row.account_id, e.target.value)}
                                  placeholder="0"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={3} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Stack sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">إجمالي المدين</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalDebit)}</Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem />
                  <Stack sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">إجمالي الدائن</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalCredit)}</Typography>
                  </Stack>
                  <Divider orientation="vertical" flexItem />
                  <Stack sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">الفرق</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, direction: 'ltr' }} color={isBalanced ? 'success.main' : 'error.main'}>
                      {numFmt(diff)}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      fontWeight: 700, fontSize: 13, px: 1.5, py: 0.5, borderRadius: 1.5,
                      bgcolor: isBalanced ? '#dcfce7' : '#fee2e2',
                      color:   isBalanced ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {isBalanced ? 'متوازن' : 'غير متوازن'}
                  </Box>
                </Stack>
              </Paper>
            </>
          )}
        </Box>
      </ThemeProvider>
    </CacheProvider>
  )
}
