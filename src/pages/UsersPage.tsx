import { useEffect, useState } from 'react'
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem, OutlinedInput, Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'

import { usersApi } from '@/api/users'
import type { UserRecord, UserPayload, RoleRecord } from '@/api/users'
import { useAuth } from '@/context/AuthContext'

const ROLE_LABELS: Record<string, string> = {
  admin:      'مدير النظام',
  accountant: 'محاسب',
  viewer:     'مشاهد',
}
const ROLE_COLORS: Record<string, 'error' | 'primary' | 'default'> = {
  admin:      'error',
  accountant: 'primary',
  viewer:     'default',
}

const EMPTY_FORM: UserPayload = { name: '', username: '', email: '', password: '', roles: [] }

function initials(name: string) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarColor(id: number) {
  const palette = ['#1976d2', '#388e3c', '#7b1fa2', '#c62828', '#00838f', '#e65100', '#4527a0']
  return palette[id % palette.length]
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers]       = useState<UserRecord[]>([])
  const [roles, setRoles]       = useState<RoleRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  const [open, setOpen]         = useState(false)
  const [editing, setEditing]   = useState<UserRecord | null>(null)
  const [form, setForm]         = useState<UserPayload>(EMPTY_FORM)
  const [showPwd, setShowPwd]   = useState(false)
  const [saving, setSaving]     = useState(false)

  const [delTarget, setDelTarget] = useState<UserRecord | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([usersApi.list(), usersApi.listRoles()])
      .then(([u, r]) => { setUsers(u); setRoles(r) })
      .catch(() => setError('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_FORM); setShowPwd(false); setOpen(true)
  }
  const openEdit = (u: UserRecord) => {
    setEditing(u)
    setForm({ name: u.name, username: u.username, email: u.email, password: '', roles: u.roles })
    setShowPwd(false); setOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await usersApi.update(editing.id, form)
        setSuccess('تم تحديث المستخدم بنجاح')
      } else {
        await usersApi.create(form)
        setSuccess('تم إنشاء المستخدم بنجاح')
      }
      setOpen(false); load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'فشل حفظ المستخدم')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await usersApi.remove(delTarget.id)
      setSuccess('تم حذف المستخدم'); setDelTarget(null); load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'فشل حذف المستخدم'); setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const handleRoleChange = (e: SelectChangeEvent<string[]>) => {
    const val = e.target.value
    setForm(p => ({ ...p, roles: typeof val === 'string' ? val.split(',') : val }))
  }

  const isFormValid = form.name.trim() && form.username.trim() && form.email.trim() &&
    (!editing ? !!form.password : true)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonOutlinedIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>إدارة المستخدمين</Typography>
            <Typography variant="body2" color="text.secondary">{users.length} مستخدم مسجّل</Typography>
          </Box>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>مستخدم جديد</Button>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell>المستخدم</TableCell>
                <TableCell>اسم المستخدم</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الصلاحيات</TableCell>
                <TableCell sx={{ direction: 'ltr', color: 'text.secondary' }}>تاريخ الإنشاء</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                    لا يوجد مستخدمون بعد
                  </TableCell>
                </TableRow>
              )}
              {users.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: avatarColor(u.id) }}>
                        {initials(u.name)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.name}</Typography>
                        {u.id === me?.id && (
                          <Typography variant="caption" color="primary.main">أنت</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                      {u.username}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ direction: 'ltr', display: 'inline-block' }}>
                      {u.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {u.roles.length === 0
                        ? <Typography variant="caption" color="text.disabled">بدون صلاحية</Typography>
                        : u.roles.map(r => (
                          <Chip
                            key={r}
                            label={ROLE_LABELS[r] ?? r}
                            color={ROLE_COLORS[r] ?? 'default'}
                            size="small"
                          />
                        ))
                      }
                    </Box>
                  </TableCell>
                  <TableCell sx={{ direction: 'ltr', color: 'text.secondary', fontSize: 13 }}>
                    {new Date(u.created_at).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => openEdit(u)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.id === me?.id ? 'لا يمكنك حذف حسابك' : 'حذف'}>
                        <span>
                          <IconButton size="small" color="error" onClick={() => setDelTarget(u)} disabled={u.id === me?.id}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="الاسم الكامل" size="small" fullWidth value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <TextField
              label="اسم المستخدم" size="small" fullWidth value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
            />
            <TextField
              label="البريد الإلكتروني" type="email" size="small" fullWidth value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              slotProps={{ htmlInput: { style: { direction: 'ltr' } } }}
            />
            <TextField
              label={editing ? 'كلمة المرور (فارغة = بدون تغيير)' : 'كلمة المرور'}
              size="small" fullWidth type={showPwd ? 'text' : 'password'} value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPwd(v => !v)} edge="end">
                        {showPwd
                          ? <VisibilityOffOutlinedIcon fontSize="small" />
                          : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {/* Roles multi-select */}
            <FormControl size="small" fullWidth>
              <InputLabel>الأدوار والصلاحيات</InputLabel>
              <Select
                multiple
                value={form.roles ?? []}
                onChange={handleRoleChange}
                input={<OutlinedInput label="الأدوار والصلاحيات" />}
                renderValue={selected => (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {(selected as string[]).map(r => (
                      <Chip key={r} label={ROLE_LABELS[r] ?? r} size="small" color={ROLE_COLORS[r] ?? 'default'} />
                    ))}
                  </Box>
                )}
              >
                {roles.map(r => (
                  <MenuItem key={r.id} value={r.name}>
                    {ROLE_LABELS[r.name] ?? r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !isFormValid}>
            {saving ? <CircularProgress size={18} /> : editing ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!delTarget} onClose={() => setDelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت متأكد من حذف <strong>{delTarget?.name}</strong>؟ لا يمكن التراجع.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelTarget(null)} disabled={deleting}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={18} /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
