import { useState } from 'react'
import { Button, Flex, Input, Modal, Popconfirm, Spin, Typography } from 'antd'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { partyCategoriesApi } from '@/api/partyCategories'
import { useToast } from '@/lib/toast'
import type { PartyCategory } from '@/types/partyCategory'

const { Text } = Typography

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}

interface PartyCategoriesModalProps {
  open: boolean
  onClose: () => void
  categories: PartyCategory[]
  onChanged: () => void
}

export default function PartyCategoriesModal({ open, onClose, categories, onChanged }: PartyCategoriesModalProps) {
  const toast = useToast()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    try {
      await partyCategoriesApi.create({ name })
      setNewName('')
      onChanged()
      toast.success('تم إضافة التصنيف')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setCreating(false) }
  }

  function startEdit(c: PartyCategory) {
    setEditingId(c.id); setEditingName(c.name)
  }

  async function handleSaveEdit() {
    if (editingId == null) return
    const name = editingName.trim()
    if (!name) return
    setSaving(true)
    try {
      await partyCategoriesApi.update(editingId, { name })
      setEditingId(null)
      onChanged()
      toast.success('تم تحديث التصنيف')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setSaving(false) }
  }

  async function handleDelete(c: PartyCategory) {
    setDeletingId(c.id)
    try {
      await partyCategoriesApi.remove(c.id)
      onChanged()
      toast.success('تم حذف التصنيف')
    } catch (err) {
      toast.error(extractError(err))
    } finally { setDeletingId(null) }
  }

  return (
    <Modal open={open} onCancel={onClose} width={420} title="إدارة تصنيفات الأطراف" footer={null}>
      <Flex vertical gap={12} style={{ paddingTop: 8 }}>
        <Flex gap={8}>
          <Input
            placeholder="اسم التصنيف الجديد"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <Button type="primary" icon={<Plus size={15} />} onClick={handleCreate} loading={creating}>
            إضافة
          </Button>
        </Flex>

        <Flex vertical gap={6}>
          {categories.length === 0 && (
            <Text type="secondary" style={{ fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
              لا توجد تصنيفات. أضف تصنيفاً للبدء.
            </Text>
          )}
          {categories.map(c => (
            <Flex
              key={c.id}
              align="center"
              justify="space-between"
              gap={8}
              style={{ padding: '6px 10px', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}
            >
              {editingId === c.id ? (
                <>
                  <Input
                    size="small"
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                    style={{ flex: 1 }}
                  />
                  <Flex gap={2}>
                    <Button type="text" shape="circle" size="small" onClick={handleSaveEdit} loading={saving} icon={<Check size={15} />} />
                    <Button type="text" shape="circle" size="small" onClick={() => setEditingId(null)} icon={<X size={15} />} />
                  </Flex>
                </>
              ) : (
                <>
                  <Text style={{ flex: 1 }}>{c.name}</Text>
                  <Flex gap={2}>
                    <Button type="text" shape="circle" size="small" onClick={() => startEdit(c)} icon={<Pencil size={14} />} />
                    <Popconfirm
                      title="حذف التصنيف"
                      description="سيصبح الأطراف المرتبطون بهذا التصنيف بدون تصنيف."
                      okText="حذف"
                      cancelText="إلغاء"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(c)}
                    >
                      <Button type="text" shape="circle" size="small" danger icon={deletingId === c.id ? <Spin size="small" /> : <Trash2 size={14} />} />
                    </Popconfirm>
                  </Flex>
                </>
              )}
            </Flex>
          ))}
        </Flex>
      </Flex>
    </Modal>
  )
}
