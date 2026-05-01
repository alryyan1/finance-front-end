import { useEffect, useState } from 'react'
import {
  Alert, Box, Button, CircularProgress, Divider, Paper,
  Snackbar, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import api from '@/lib/axios'

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
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']

const numFmt = (v: string | number) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function OpeningBalancesPage() {
  const [rows, setRows]       = useState<EditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    api.get<OBRow[]>('/api/opening-balances')
      .then(r => setRows(r.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      }))))
      .finally(() => setLoading(false))
  }, [])

  const setDebit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _debit: val, _credit: val ? '' : r._credit }
      : r))

  const setCredit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _credit: val, _debit: val ? '' : r._debit }
      : r))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = rows.map(r => ({
        account_id: r.account_id,
        debit:  parseFloat(r._debit)  || 0,
        credit: parseFloat(r._credit) || 0,
      }))
      const res = await api.put<OBRow[]>('/api/opening-balances', payload)
      setRows(res.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      })))
      setSuccess(true)
    } catch {
      setError('تعذّر الحفظ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>الأرصدة الافتتاحية</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            أدخل الأرصدة الابتدائية للحسابات قبل بدء استخدام النظام
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          حفظ الأرصدة
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ width: 90 }}>الرمز</TableCell>
              <TableCell>اسم الحساب</TableCell>
              <TableCell align="center" sx={{ width: 160 }}>مدين</TableCell>
              <TableCell align="center" sx={{ width: 160 }}>دائن</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grouped.map(({ type, label, rows: groupRows }) => (
              <>
                <TableRow key={`hdr-${type}`} sx={{ bgcolor: 'grey.100' }}>
                  <TableCell colSpan={4} sx={{ py: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      {label}
                    </Typography>
                  </TableCell>
                </TableRow>
                {groupRows.map(row => (
                  <TableRow key={row.account_id} hover>
                    <TableCell sx={{ color: 'text.secondary' }}>{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row._debit}
                        onChange={e => setDebit(row.account_id, e.target.value)}
                        inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                        sx={{ width: 140 }}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row._credit}
                        onChange={e => setCredit(row.account_id, e.target.value)}
                        inputProps={{ min: 0, step: '0.01', style: { direction: 'ltr', textAlign: 'right' } }}
                        sx={{ width: 140 }}
                        placeholder="0.00"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Balance summary */}
      <Paper sx={{ p: 2.5 }}>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
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
            <Typography sx={{ fontWeight: 700, direction: 'ltr', color: isBalanced ? 'success.main' : 'error.main' }}>
              {numFmt(diff)}
            </Typography>
          </Box>
          <Box sx={{
            px: 2, py: 0.75, borderRadius: 1,
            bgcolor: isBalanced ? 'success.light' : 'error.light',
            color:   isBalanced ? 'success.dark'  : 'error.dark',
            fontWeight: 700,
          }}>
            <Typography sx={{ fontWeight: 700 }}>
              {isBalanced ? 'متوازن' : 'غير متوازن'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSuccess(false)}>تم حفظ الأرصدة الافتتاحية بنجاح</Alert>
      </Snackbar>
    </Box>
  )
}
