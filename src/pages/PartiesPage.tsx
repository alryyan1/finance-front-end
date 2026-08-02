import { useEffect, useState } from 'react'
import {
  Button, Flex, Input, Modal, Select, Spin, Switch, Table, Tag, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import { useToast } from '@/lib/toast'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { partiesApi } from '@/api/parties'
import { accountsApi } from '@/api/accounts'
import type { Party, PartyType } from '@/types/party'
import type { Account } from '@/types/account'

const { Title, Text } = Typography

const TYPE_LABELS: Record<PartyType, string> = {
  customer: 'عميل',
  supplier: 'مورد',
  employee: 'موظف',
  other:    'أخرى',
  doctor:   'طبيب',
}

const TYPE_COLOR: Record<PartyType, string> = {
  customer: 'success',
  supplier: 'warning',
  employee: 'blue',
  other:    'default',
  doctor:   'blue',
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
  const toast = useToast()
  const [parties, setParties]   = useState<Party[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<Party | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Party | null>(null)
  const [deleting, setDeleting]         = useState(false)

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
    setEditing(null); setForm(emptyForm); setDialogOpen(true)
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
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
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
      toast.success(editing ? 'تم حفظ الطرف' : 'تم إضافة الطرف')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setSaving(false) }
  }

  function confirmDelete(p: Party) {
    setDeleteTarget(p); setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await partiesApi.remove(deleteTarget.id)
      await load(); setDeleteOpen(false)
      toast.success('تم حذف الطرف')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setDeleting(false) }
  }

  const columns: ColumnsType<Party> = [
    {
      title: 'الاسم',
      dataIndex: 'name',
      render: (_: string, p) => (
        <div style={{ opacity: p.is_active ? 1 : 0.45 }}>
          <Text style={{ fontWeight: 500, display: 'block' }}>{p.name}</Text>
          {p.email && <Text type="secondary" style={{ fontSize: 12 }}>{p.email}</Text>}
        </div>
      ),
    },
    {
      title: 'النوع',
      dataIndex: 'type',
      width: 110,
      render: (t: PartyType) => <Tag color={TYPE_COLOR[t]}>{TYPE_LABELS[t]}</Tag>,
    },
    {
      title: 'الهاتف',
      dataIndex: 'phone',
      width: 140,
      render: (v: string | null) => <span dir="ltr" style={{ display: 'block', textAlign: 'right' }}>{v ?? '—'}</span>,
    },
    {
      title: 'الحساب المرتبط',
      dataIndex: 'account',
      render: (acc: Party['account']) => acc
        ? <Text type="secondary" style={{ fontSize: 12 }}>{acc.code} — {acc.name}</Text>
        : <Text type="secondary" style={{ fontSize: 12, opacity: 0.6 }}>—</Text>,
    },
    {
      title: 'الحالة',
      dataIndex: 'is_active',
      width: 80,
      render: (active: boolean) => (
        <Text style={{ fontSize: 12, fontWeight: 500 }} type={active ? 'success' : 'secondary'}>
          {active ? 'نشط' : 'موقوف'}
        </Text>
      ),
    },
    {
      title: 'إجراءات',
      width: 90,
      align: 'center',
      render: (_: unknown, p) => (
        <Flex gap={2} justify="center">
          <Button type="text" shape="circle" size="small" onClick={() => openEdit(p)} icon={<Pencil size={15} />} />
          <Button type="text" shape="circle" size="small" danger onClick={() => confirmDelete(p)} icon={<Trash2 size={15} />} />
        </Flex>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>الأطراف</Title>
          <Text type="secondary">العملاء والموردون والموظفون</Text>
        </div>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام الأطراف">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هم الأطراف؟</Title>
                <Text>الأطراف هم الجهات التي تتعامل معها الشركة: عملاء (يدفعون لك)، موردون (تدفع لهم)، موظفون (تستحق لهم رواتب). ربط الطرف بالقيود يتيح كشف حساب مفصّل لكل جهة.</Text></div>
              <div><Title level={5}>إضافة طرف جديد</Title>
                <Text>اضغط "إضافة طرف"، أدخل الاسم والنوع ومعلومات الاتصال الاختيارية. يمكن استخدام الطرف لاحقاً في القيود وإذونات القبض والصرف.</Text></div>
              <div><Title level={5}>كشف حساب الطرف</Title>
                <Text>لعرض كشف حساب طرف معين، استخدم صفحة "كشف الحساب" واختر الحساب المرتبط ثم صفّح بالطرف المحدد.</Text></div>
            </Flex>
          </HelpButton>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            إضافة طرف
          </Button>
        </Flex>
      </Flex>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={parties}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'لا توجد أطراف. أضف طرفاً للبدء.' }}
      />

      {/* Create / Edit Dialog */}
      <Modal
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={560}
        title={editing ? 'تعديل الطرف' : 'إضافة طرف جديد'}
        footer={null}
      >
        <form onSubmit={handleSubmit}>
          <Flex vertical gap={16} style={{ paddingTop: 8 }}>
            <Flex gap={16}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الاسم</Text>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>النوع</Text>
                <Select
                  style={{ width: '100%' }}
                  value={form.type}
                  onChange={v => setForm(p => ({ ...p, type: v }))}
                  options={(Object.entries(TYPE_LABELS) as [PartyType, string][]).map(([v, label]) => ({ value: v, label }))}
                />
              </div>
            </Flex>

            <Flex gap={16}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الهاتف</Text>
                <Input dir="ltr" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>البريد الإلكتروني</Text>
                <Input type="email" dir="ltr" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </Flex>

            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الحساب المرتبط</Text>
              <Select
                showSearch
                allowClear
                style={{ width: '100%' }}
                placeholder="ابحث عن حساب..."
                value={form.account_id ?? undefined}
                onChange={v => setForm(p => ({ ...p, account_id: v ?? null }))}
                notFoundContent="لا توجد نتائج"
                filterOption={(input, option) =>
                  (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
              />
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>العنوان</Text>
              <Input.TextArea rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
            </div>

            <Flex align="center" justify="space-between" style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, padding: '8px 16px' }}>
              <Text>الطرف نشط</Text>
              <Switch checked={form.is_active} onChange={checked => setForm(p => ({ ...p, is_active: checked }))} />
            </Flex>

            <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
              <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="primary" htmlType="submit" loading={saving}>
                {editing ? 'تحديث' : 'إضافة'}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        width={400}
        title="تأكيد الحذف"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button type="primary" danger onClick={handleDelete} disabled={deleting}>
              {deleting ? <Spin size="small" /> : 'حذف'}
            </Button>
          </Flex>
        }
      >
        <Text type="secondary">
          هل أنت متأكد من حذف الطرف{' '}
          <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>{deleteTarget?.name}</span>؟
        </Text>
      </Modal>
    </div>
  )
}
