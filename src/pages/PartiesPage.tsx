import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import type { SelectChangeEvent } from '@mui/material/Select'
import { partiesApi } from '@/api/parties'
import { accountsApi } from '@/api/accounts'
import type { Party, PartyType } from '@/types/party'
import type { Account } from '@/types/account'

const TYPE_LABELS: Record<PartyType, string> = {
  customer: 'عميل',
  supplier: 'مورد',
  employee: 'موظف',
  other:    'أخرى',
}

const TYPE_COLOR: Record<PartyType, 'success' | 'warning' | 'primary' | 'default'> = {
  customer: 'success',
  supplier: 'warning',
  employee: 'primary',
  other:    'default',
}

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}

const emptyForm = {
  name:       '',
  type:       'customer' as PartyType,
  phone:      '',
  email:      '',
  address:    '',
  account_id: null as number | null,
  is_active:  true,
}

export default function PartiesPage() {
  const [parties, setParties]   = useState<Party[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<Party | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [p, a] = await Promise.all([partiesApi.list(), accountsApi.list()])
      setParties(p)
      setAccounts(a)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setFormError(null); setDialogOpen(true)
  }

  function openEdit(p: Party) {
    setEditing(p)
    setForm({
      name:       p.name,
      type:       p.type,
      phone:      p.phone ?? '',
      email:      p.email ?? '',
      address:    p.address ?? '',
      account_id: p.account_id,
      is_active:  p.is_active,
    })
    setFormError(null); setDialogOpen(true)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true); setFormError(null)
    const payload = {
      ...form,
      phone:   form.phone   || null,
      email:   form.email   || null,
      address: form.address || null,
    }
    try {
      if (editing) await partiesApi.update(editing.id, payload)
      else         await partiesApi.create(payload)
      await load(); setDialogOpen(false)
    } catch (err) {
      setFormError(extractError(err))
    } finally { setSaving(false) }
  }

  function confirmDelete(p: Party) {
    setDeleteTarget(p); setDeleteError(null); setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try {
      await partiesApi.remove(deleteTarget.id)
      await load(); setDeleteOpen(false)
    } catch (err) {
      setDeleteError(extractError(err))
    } finally { setDeleting(false) }
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>الأطراف</Typography>
          <Typography variant="body2" color="text.secondary">العملاء والموردون والموظفون</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
          إضافة طرف
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell sx={{ width: 110 }}>النوع</TableCell>
              <TableCell sx={{ width: 140 }}>الهاتف</TableCell>
              <TableCell>الحساب المرتبط</TableCell>
              <TableCell sx={{ width: 80 }}>الحالة</TableCell>
              <TableCell sx={{ width: 80 }} align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : parties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  لا توجد أطراف. أضف طرفاً للبدء.
                </TableCell>
              </TableRow>
            ) : parties.map(party => (
              <TableRow
                key={party.id}
                sx={{ opacity: party.is_active ? 1 : 0.45, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{party.name}</Typography>
                  {party.email && (
                    <Typography variant="caption" color="text.secondary">{party.email}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={TYPE_LABELS[party.type]}
                    color={TYPE_COLOR[party.type]}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11 }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" dir="ltr" sx={{ textAlign: 'right' }}>
                    {party.phone ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {party.account ? (
                    <Typography variant="caption" color="text.secondary">
                      {party.account.code} — {party.account.name}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: party.is_active ? 'success.main' : 'text.disabled', fontWeight: 500 }}>
                    {party.is_active ? 'نشط' : 'موقوف'}
                  </Typography>
                </TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  <IconButton size="small" onClick={() => openEdit(party)} sx={{ color: 'text.secondary' }}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => confirmDelete(party)} sx={{ color: 'error.main' }}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'تعديل الطرف' : 'إضافة طرف جديد'}</DialogTitle>
        <Divider />
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="الاسم" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                required fullWidth size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type} label="النوع"
                  onChange={(e: SelectChangeEvent) => setForm(p => ({ ...p, type: e.target.value as PartyType }))}
                >
                  {(Object.entries(TYPE_LABELS) as [PartyType, string][]).map(([v, label]) => (
                    <MenuItem key={v} value={v}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="الهاتف" value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                inputProps={{ dir: 'ltr' }} fullWidth size="small"
              />
              <TextField
                label="البريد الإلكتروني" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                type="email" inputProps={{ dir: 'ltr' }} fullWidth size="small"
              />
            </Box>

            <FormControl size="small" fullWidth>
              <InputLabel>الحساب المرتبط</InputLabel>
              <Select
                value={form.account_id?.toString() ?? ''}
                label="الحساب المرتبط"
                onChange={(e: SelectChangeEvent) =>
                  setForm(p => ({ ...p, account_id: e.target.value === '' ? null : Number(e.target.value) }))
                }
              >
                <MenuItem value="">— بدون حساب —</MenuItem>
                {accounts.map(a => (
                  <MenuItem key={a.id} value={a.id.toString()}>{a.code} — {a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="العنوان" value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
              multiline rows={2} fullWidth size="small"
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 2, py: 1 }}>
              <Typography variant="body2">الطرف نشط</Typography>
              <Switch
                checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                size="small"
              />
            </Box>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button variant="outlined" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button variant="contained" type="submit" disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteError(null) }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            هل أنت متأكد من حذف الطرف{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {deleteTarget?.name}
            </Box>؟
          </Typography>
          {deleteError && <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => { setDeleteOpen(false); setDeleteError(null) }}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'جارٍ الحذف…' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
