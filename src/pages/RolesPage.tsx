import { useEffect, useMemo, useState } from 'react'
import {
  Button, Checkbox, Flex, Input, Modal, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useToast } from '@/lib/toast'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { rolesApi } from '@/api/roles'
import type { RoleDetail, RolePayload } from '@/api/roles'
import HelpButton from '@/components/common/HelpButton'

const { Title, Text } = Typography

const MODULE_LABELS: Record<string, string> = {
  accounts:          'الحسابات',
  transactions:      'القيود المحاسبية',
  'petty-cash':      'العهدة النثرية',
  parties:           'الأطراف',
  reports:           'التقارير',
  settings:          'الإعدادات',
  'opening-balances': 'الأرصدة الافتتاحية',
  'fiscal-years':    'السنوات المالية',
  users:             'المستخدمون',
  backup:            'النسخ الاحتياطي',
  tokens:            'رموز الوصول (API)',
  whatsapp:          'تكامل واتساب',
  ai:                'المساعد الذكي',
  dashboard:         'لوحة التحكم',
  roles:             'الأدوار والصلاحيات',
}

const PERMISSION_LABELS: Record<string, string> = {
  'accounts.view': 'عرض', 'accounts.create': 'إنشاء', 'accounts.edit': 'تعديل', 'accounts.delete': 'حذف',
  'transactions.view': 'عرض', 'transactions.create': 'إنشاء', 'transactions.edit': 'تعديل',
  'transactions.delete': 'حذف', 'transactions.post': 'ترحيل', 'transactions.reverse': 'عكس القيد',
  'transactions.export': 'تصدير',
  'petty-cash.view': 'عرض', 'petty-cash.create': 'إنشاء', 'petty-cash.edit': 'تعديل', 'petty-cash.delete': 'حذف',
  'petty-cash.approve': 'موافقة المدير', 'petty-cash.reconcile': 'تسوية',
  'petty-cash.import-whatsapp': 'استيراد من واتساب', 'petty-cash.document.upload': 'رفع مستند',
  'petty-cash.document.delete': 'حذف مستند', 'petty-cash.export': 'تصدير',
  'parties.view': 'عرض', 'parties.create': 'إنشاء', 'parties.edit': 'تعديل', 'parties.delete': 'حذف',
  'parties.link-external': 'ربط طرف خارجي',
  'reports.view': 'عرض', 'reports.export': 'تصدير',
  'settings.view': 'عرض', 'settings.edit': 'تعديل', 'settings.logo.manage': 'إدارة الشعار',
  'opening-balances.view': 'عرض', 'opening-balances.edit': 'تعديل',
  'fiscal-years.view': 'عرض', 'fiscal-years.create': 'إنشاء', 'fiscal-years.close': 'إقفال',
  'fiscal-years.reopen': 'إعادة فتح', 'fiscal-years.carry-forward': 'ترحيل الأرصدة',
  'users.view': 'عرض', 'users.create': 'إنشاء', 'users.edit': 'تعديل', 'users.delete': 'حذف',
  'users.assign-roles': 'تعيين الأدوار',
  'backup.view': 'عرض', 'backup.run': 'تشغيل', 'backup.download': 'تنزيل', 'backup.delete': 'حذف',
  'tokens.view': 'عرض', 'tokens.create': 'إصدار', 'tokens.revoke': 'إلغاء',
  'whatsapp.view': 'عرض', 'whatsapp.manage': 'إدارة الإعدادات',
  'ai.use': 'استخدام',
  'dashboard.view': 'عرض',
  'roles.view': 'عرض', 'roles.manage': 'إدارة (إنشاء/تعديل/حذف)',
}

function moduleOf(permission: string) {
  return permission.split('.')[0]
}

function groupPermissions(all: string[]) {
  const groups = new Map<string, string[]>()
  for (const p of all) {
    const key = moduleOf(p)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }
  return Array.from(groups.entries())
}

const EMPTY_FORM: RolePayload = { name: '', permissions: [] }

export default function RolesPage() {
  const toast = useToast()
  const [roles, setRoles]             = useState<RoleDetail[]>([])
  const [allPermissions, setAllPermissions] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)

  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<RoleDetail | null>(null)
  const [form, setForm]       = useState<RolePayload>(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)

  const [delTarget, setDelTarget] = useState<RoleDetail | null>(null)
  const [deleting, setDeleting]   = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([rolesApi.list(), rolesApi.listPermissions()])
      .then(([r, p]) => { setRoles(r); setAllPermissions(p) })
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const grouped = useMemo(() => groupPermissions(allPermissions), [allPermissions])

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (r: RoleDetail) => {
    setEditing(r)
    setForm({ name: r.name, permissions: r.permissions })
    setOpen(true)
  }

  const togglePermission = (perm: string, checked: boolean) => {
    setForm(p => ({
      ...p,
      permissions: checked ? [...p.permissions, perm] : p.permissions.filter(x => x !== perm),
    }))
  }

  const toggleModule = (perms: string[], checked: boolean) => {
    setForm(p => ({
      ...p,
      permissions: checked
        ? Array.from(new Set([...p.permissions, ...perms]))
        : p.permissions.filter(x => !perms.includes(x)),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await rolesApi.update(editing.id, form)
        toast.success('تم تحديث الدور بنجاح')
      } else {
        await rolesApi.create(form)
        toast.success('تم إنشاء الدور بنجاح')
      }
      setOpen(false); load()
    } catch (e: unknown) {
      const res = (e as { response?: { status?: number; data?: { message?: string } } })?.response
      if (res?.status !== 403) toast.error(res?.data?.message ?? 'فشل حفظ الدور')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDeleting(true)
    try {
      await rolesApi.remove(delTarget.id)
      toast.success('تم حذف الدور'); setDelTarget(null); load()
    } catch (e: unknown) {
      const res = (e as { response?: { status?: number; data?: { message?: string } } })?.response
      if (res?.status !== 403) toast.error(res?.data?.message ?? 'فشل حذف الدور')
      setDelTarget(null)
    } finally { setDeleting(false) }
  }

  const isFormValid = form.name.trim().length > 0

  const columns: ColumnsType<RoleDetail> = [
    {
      title: 'الدور',
      dataIndex: 'name',
      render: (_: string, r) => (
        <Flex align="center" gap={8}>
          <Text style={{ fontWeight: 600 }}>{r.name}</Text>
          {r.name === 'admin' && <Tag color="error">دور النظام الأساسي</Tag>}
        </Flex>
      ),
    },
    {
      title: 'الصلاحيات',
      dataIndex: 'permissions',
      render: (ps: string[]) => <Tag>{ps.length} صلاحية</Tag>,
    },
    {
      title: 'المستخدمون',
      dataIndex: 'users_count',
      render: (v: number) => <Text type="secondary">{v}</Text>,
    },
    {
      title: 'إجراءات',
      align: 'center',
      render: (_: unknown, r) => (
        <Flex gap={4} justify="center">
          <Tooltip title={r.name === 'admin' ? 'دور النظام لا يمكن تعديله' : 'تعديل'}>
            <Button
              type="text" shape="circle" size="small" color="primary" variant="text"
              disabled={r.name === 'admin'}
              onClick={() => openEdit(r)} icon={<Pencil size={15} />}
            />
          </Tooltip>
          <Tooltip title={r.name === 'admin' ? 'دور النظام لا يمكن حذفه' : r.users_count > 0 ? 'أزل الدور من المستخدمين أولاً' : 'حذف'}>
            <Button
              type="text" shape="circle" size="small" danger
              disabled={r.name === 'admin' || r.users_count > 0}
              onClick={() => setDelTarget(r)} icon={<Trash2 size={15} />}
            />
          </Tooltip>
        </Flex>
      ),
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Flex align="center" gap={12}>
          <ShieldCheck size={28} color="var(--ant-color-primary)" />
          <div>
            <Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>الأدوار والصلاحيات</Title>
            <Text type="secondary">{roles.length} دور معرّف</Text>
          </div>
        </Flex>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام الأدوار والصلاحيات">
            <Flex vertical gap={16}>
              <div><Title level={5}>الأدوار والصلاحيات</Title>
                <Text>كل دور هو مجموعة من الصلاحيات. عيّن للمستخدمين دوراً من صفحة المستخدمين، وحدد هنا ما الذي يسمح به كل دور بالضبط.</Text></div>
              <div><Title level={5}>دور مدير النظام</Title>
                <Text>دور ثابت يملك كل الصلاحيات دائماً، ولا يمكن تعديله أو حذفه لضمان عدم إقفال النظام على المدراء.</Text></div>
              <div><Title level={5}>إنشاء دور مخصص</Title>
                <Text>اضغط "دور جديد"، أدخل اسماً، ثم حدد الصلاحيات المطلوبة من كل قسم.</Text></div>
              <div><Title level={5}>حذف دور</Title>
                <Text>لا يمكن حذف دور مُستخدَم من قبل مستخدمين — أزل الدور منهم أولاً من صفحة المستخدمين.</Text></div>
            </Flex>
          </HelpButton>
          <Button type="primary" icon={<Plus size={16} />} onClick={openAdd}>دور جديد</Button>
        </Flex>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '80px 0' }}><Spin size="large" /></Flex>
      ) : (
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'لا توجد أدوار بعد' }}
        />
      )}

      {/* ── Add / Edit Dialog ── */}
      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        width={640}
        title={editing ? `تعديل دور: ${editing.name}` : 'إضافة دور جديد'}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button type="primary" onClick={handleSave} disabled={saving || !isFormValid}>
              {saving ? <Spin size="small" /> : editing ? 'حفظ التعديلات' : 'إنشاء الدور'}
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap={16} style={{ paddingTop: 8 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>اسم الدور</Text>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              الصلاحيات ({form.permissions.length} محددة)
            </Text>
            <div style={{ maxHeight: 380, overflowY: 'auto', paddingInlineEnd: 4 }}>
              <Flex vertical gap={10}>
                {grouped.map(([mod, perms]) => {
                  const allChecked = perms.every(p => form.permissions.includes(p))
                  const someChecked = perms.some(p => form.permissions.includes(p))
                  return (
                    <div
                      key={mod}
                      style={{
                        border: '1px solid var(--ant-color-border-secondary)',
                        borderRadius: 8, padding: 10,
                      }}
                    >
                      <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                        <Text style={{ fontWeight: 600, fontSize: 13 }}>{MODULE_LABELS[mod] ?? mod}</Text>
                        <Checkbox
                          checked={allChecked}
                          indeterminate={someChecked && !allChecked}
                          onChange={e => toggleModule(perms, e.target.checked)}
                        >
                          <Text type="secondary" style={{ fontSize: 12 }}>تحديد الكل</Text>
                        </Checkbox>
                      </Flex>
                      <Flex wrap="wrap" gap={12}>
                        {perms.map(p => (
                          <Checkbox
                            key={p}
                            checked={form.permissions.includes(p)}
                            onChange={e => togglePermission(p, e.target.checked)}
                          >
                            <Text style={{ fontSize: 13 }}>{PERMISSION_LABELS[p] ?? p}</Text>
                          </Checkbox>
                        ))}
                      </Flex>
                    </div>
                  )
                })}
              </Flex>
            </div>
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
          هل أنت متأكد من حذف الدور <strong>{delTarget?.name}</strong>؟ لا يمكن التراجع.
        </Text>
      </Modal>
    </div>
  )
}
