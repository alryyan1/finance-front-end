import { useEffect, useState } from 'react'
import {
  Avatar, Button, Flex, Input, Modal, Select, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useToast } from '@/lib/toast'
import { Eye, EyeOff, Pencil, Plus, Trash2, User as UserIcon } from 'lucide-react'

import { usersApi } from '@/api/users'
import type { UserRecord, UserPayload, RoleRecord } from '@/api/users'
import { useAuth } from '@/context/AuthContext'
import HelpButton from '@/components/common/HelpButton'

const { Title, Text } = Typography

const ROLE_LABELS: Record<string, string> = {
  admin:      'مدير النظام',
  accountant: 'محاسب',
  viewer:     'مشاهد',
}
const ROLE_COLORS: Record<string, string> = {
  admin:      'error',
  accountant: 'blue',
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
  const toast = useToast()
  const [users, setUsers]       = useState<UserRecord[]>([])
  const [roles, setRoles]       = useState<RoleRecord[]>([])
  const [loading, setLoading]   = useState(true)

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
      .catch(() => toast.error('تعذّر تحميل البيانات'))
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
        toast.success('تم تحديث المستخدم بنجاح')
      } else {
        await usersApi.create(form)
        toast.success('تم إنشاء المستخدم بنجاح')
      }
      setOpen(false); load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'فشل حفظ المستخدم')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await usersApi.remove(delTarget.id)
      toast.success('تم حذف المستخدم'); setDelTarget(null); load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'فشل حذف المستخدم'); setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const isFormValid = form.name.trim() && form.username.trim() && form.email.trim() &&
    (!editing ? !!form.password : true)

  const columns: ColumnsType<UserRecord> = [
    {
      title: 'المستخدم',
      dataIndex: 'name',
      render: (_: string, u) => (
        <Flex align="center" gap={12}>
          <Avatar style={{ backgroundColor: avatarColor(u.id), fontSize: 13, fontWeight: 700 }}>
            {initials(u.name)}
          </Avatar>
          <div>
            <Text style={{ fontWeight: 600, display: 'block' }}>{u.name}</Text>
            {u.id === me?.id && <Text type="secondary" style={{ fontSize: 12 }}>أنت</Text>}
          </div>
        </Flex>
      ),
    },
    {
      title: 'اسم المستخدم',
      dataIndex: 'username',
      render: (v: string) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{v}</Text>,
    },
    {
      title: 'البريد الإلكتروني',
      dataIndex: 'email',
      render: (v: string) => <span style={{ direction: 'ltr', display: 'inline-block' }}>{v}</span>,
    },
    {
      title: 'الصلاحيات',
      dataIndex: 'roles',
      render: (rs: string[]) => rs.length === 0
        ? <Text type="secondary" style={{ fontSize: 12 }}>بدون صلاحية</Text>
        : (
          <Flex gap={4} wrap="wrap">
            {rs.map(r => (
              <Tag key={r} color={ROLE_COLORS[r] === 'default' ? undefined : ROLE_COLORS[r]}>
                {ROLE_LABELS[r] ?? r}
              </Tag>
            ))}
          </Flex>
        ),
    },
    {
      title: 'تاريخ الإنشاء',
      dataIndex: 'created_at',
      render: (v: string) => (
        <span style={{ direction: 'ltr', color: 'var(--ant-color-text-secondary)', fontSize: 13 }}>
          {new Date(v).toLocaleDateString('ar-SA')}
        </span>
      ),
    },
    {
      title: 'إجراءات',
      align: 'center',
      render: (_: unknown, u) => (
        <Flex gap={4} justify="center">
          <Tooltip title="تعديل">
            <Button type="text" shape="circle" size="small" color="primary" variant="text" onClick={() => openEdit(u)} icon={<Pencil size={15} />} />
          </Tooltip>
          <Tooltip title={u.id === me?.id ? 'لا يمكنك حذف حسابك' : 'حذف'}>
            <Button type="text" shape="circle" size="small" danger disabled={u.id === me?.id} onClick={() => setDelTarget(u)} icon={<Trash2 size={15} />} />
          </Tooltip>
        </Flex>
      ),
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Flex align="center" gap={12}>
          <UserIcon size={28} color="var(--ant-color-primary)" />
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>إدارة المستخدمين</Title>
            <Text type="secondary">{users.length} مستخدم مسجّل</Text>
          </div>
        </Flex>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام إدارة المستخدمين">
            <Flex vertical gap={16}>
              <div><Title level={5}>إدارة المستخدمين</Title>
                <Text>يمكن للمدير إضافة مستخدمين جدد وتعديل بياناتهم وصلاحياتهم وحذفهم. لا يمكن حذف حسابك الشخصي.</Text></div>
              <div><Title level={5}>الأدوار والصلاحيات</Title>
                <Text>مدير النظام: وصول كامل لجميع الوظائف. محاسب: يمكنه إدخال القيود والتقارير. مشاهد: عرض فقط بدون تعديل.</Text></div>
              <div><Title level={5}>إضافة مستخدم</Title>
                <Text>اضغط "مستخدم جديد"، أدخل الاسم والبريد الإلكتروني وكلمة المرور، ثم حدد الدور المناسب.</Text></div>
              <div><Title level={5}>تغيير كلمة المرور</Title>
                <Text>عند تعديل المستخدم، اترك حقل كلمة المرور فارغاً للاحتفاظ بالكلمة الحالية، أو أدخل كلمة جديدة لتغييرها.</Text></div>
            </Flex>
          </HelpButton>
          <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>مستخدم جديد</Button>
        </Flex>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '80px 0' }}><Spin size="large" /></Flex>
      ) : (
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'لا يوجد مستخدمون بعد' }}
        />
      )}

      {/* ── Add / Edit Dialog ── */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={420}
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button type="primary" onClick={handleSave} disabled={saving || !isFormValid}>
              {saving ? <Spin size="small" /> : editing ? 'حفظ التعديلات' : 'إنشاء المستخدم'}
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap={16} style={{ paddingTop: 8 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الاسم الكامل</Text>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>اسم المستخدم</Text>
            <Input
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>البريد الإلكتروني</Text>
            <Input
              type="email" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={{ direction: 'ltr' }}
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              {editing ? 'كلمة المرور (فارغة = بدون تغيير)' : 'كلمة المرور'}
            </Text>
            <Input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              suffix={
                <Button type="text" size="small" icon={showPwd ? <EyeOff size={16} /> : <Eye size={16} />} onClick={() => setShowPwd(v => !v)} />
              }
            />
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الأدوار والصلاحيات</Text>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={form.roles ?? []}
              onChange={val => setForm(p => ({ ...p, roles: val }))}
              options={roles.map(r => ({ value: r.name, label: ROLE_LABELS[r.name] ?? r.name }))}
            />
          </div>
        </Flex>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal
        open={!!delTarget}
        onCancel={() => setDelTarget(null)}
        width={400}
        title={<span style={{ color: 'var(--ant-color-error)', fontWeight: 700 }}>تأكيد الحذف</span>}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDelTarget(null)} disabled={deleting}>إلغاء</Button>
            <Button type="primary" danger onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spin size="small" /> : 'حذف'}
            </Button>
          </Flex>
        }
      >
        <Text>
          هل أنت متأكد من حذف <strong>{delTarget?.name}</strong>؟ لا يمكن التراجع.
        </Text>
      </Modal>
    </div>
  )
}
