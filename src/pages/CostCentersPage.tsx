import { useEffect, useState } from 'react'
import { Button, Flex, Input, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import HelpButton from '@/components/common/HelpButton'
import { costCentersApi } from '@/api/costCenters'
import { useToast } from '@/lib/toast'
import type { CostCenter } from '@/types/costCenter'

const { Title, Text } = Typography

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}

export default function CostCentersPage() {
  const toast = useToast()
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      setCostCenters(await costCentersApi.list())
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      await costCentersApi.create({ name })
      setNewName('')
      await load()
      toast.success('تم إضافة مركز التكلفة')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setCreating(false) }
  }

  function startEdit(c: CostCenter) {
    setEditingId(c.id); setEditingName(c.name)
  }

  async function handleSaveEdit() {
    if (editingId == null) return
    const name = editingName.trim()
    if (!name) return
    setSaving(true)
    try {
      await costCentersApi.update(editingId, { name })
      setEditingId(null)
      await load()
      toast.success('تم تحديث مركز التكلفة')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setSaving(false) }
  }

  async function handleDelete(c: CostCenter) {
    setDeletingId(c.id)
    try {
      await costCentersApi.remove(c.id)
      await load()
      toast.success('تم حذف مركز التكلفة')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setDeletingId(null) }
  }

  const columns: ColumnsType<CostCenter> = [
    {
      title: 'مركز التكلفة',
      dataIndex: 'name',
      render: (_: string, c) => editingId === c.id ? (
        <Flex gap={6}>
          <Input
            size="small"
            autoFocus
            value={editingName}
            onChange={e => setEditingName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
            style={{ maxWidth: 280 }}
          />
          <Button type="text" shape="circle" size="small" onClick={handleSaveEdit} loading={saving} icon={<Check size={15} />} />
          <Button type="text" shape="circle" size="small" onClick={() => setEditingId(null)} icon={<X size={15} />} />
        </Flex>
      ) : (
        <Text style={{ fontWeight: 500 }}>{c.name}</Text>
      ),
    },
    {
      title: 'إجراءات',
      width: 90,
      align: 'center',
      render: (_: unknown, c) => editingId === c.id ? null : (
        <Flex gap={2} justify="center">
          <Button type="text" shape="circle" size="small" onClick={() => startEdit(c)} icon={<Pencil size={15} />} />
          <Button
            type="text" shape="circle" size="small" danger
            onClick={() => handleDelete(c)}
            icon={deletingId === c.id ? <Spin size="small" /> : <Trash2 size={15} />}
          />
        </Flex>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>مراكز التكلفة</Title>
          <Text type="secondary">تُستخدم لتصنيف القيود المحاسبية وحركات العهدة حسب القسم أو المشروع</Text>
        </div>
        <HelpButton title="دليل استخدام مراكز التكلفة">
          <Flex vertical gap={16}>
            <div><Title level={5}>ما هي مراكز التكلفة؟</Title>
              <Text>مراكز التكلفة تتيح تصنيف القيود وحركات العهدة النثرية حسب قسم أو فرع أو مشروع، بشكل مستقل عن تصنيف الأطراف أو الحسابات.</Text></div>
            <div><Title level={5}>الاستخدام</Title>
              <Text>يمكن اختيار مركز تكلفة لكل سطر في القيد المحاسبي، أو لكل إذن صرف/قبض في صندوق النثريات. استخدم تقرير "أرصدة مراكز التكلفة" لمتابعة إجمالي كل مركز.</Text></div>
          </Flex>
        </HelpButton>
      </Flex>

      {/* Add new */}
      <Flex gap={8} style={{ marginBottom: 16, maxWidth: 420 }}>
        <Input
          placeholder="اسم مركز التكلفة الجديد"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <Button type="primary" icon={<Plus size={15} />} onClick={handleCreate} loading={creating}>
          إضافة
        </Button>
      </Flex>

      <Table
        columns={columns}
        dataSource={costCenters}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'لا توجد مراكز تكلفة. أضف مركزاً للبدء.' }}
      />
    </div>
  )
}
