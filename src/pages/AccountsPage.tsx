import { useEffect, useMemo, useRef, useState } from 'react'
import HelpButton from '@/components/common/HelpButton'
import { useToast } from '@/lib/toast'
import {
  Alert, Button, Dropdown, Flex, Input, Modal, Segmented, Select, Spin, Switch, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MenuProps } from 'antd'
import { ChevronDown, ChevronLeft, ListTree, Pencil, Plus, Rows3, Trash2 } from 'lucide-react'
import { accountsApi } from '@/api/accounts'
import type { Account, AccountSubType, AccountType } from '@/types/account'

const { Title, Text } = Typography

const TYPE_LABELS: Record<AccountType, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_COLOR: Record<AccountType, string> = {
  asset:     'blue',
  liability: 'error',
  equity:    'purple',
  revenue:   'success',
  expense:   'warning',
}

// ─── Depth background palette ────────────────────────────────────────────────
const DEPTH_BG = [
  '#f1f5f9',  // depth 0 — slate-100
  '#eff6ff',  // depth 1 — blue-50
  '#f0fdf4',  // depth 2 — green-50
  '#faf5ff',  // depth 3 — purple-50
  '#fff7ed',  // depth 4 — orange-50
  '#fdf2f8',  // depth 5 — pink-50
]

// ─── Sibling color palette ────────────────────────────────────────────────────

const SIBLING_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1',
  '#84cc16', '#a855f7', '#0ea5e9', '#d946ef', '#22c55e',
]

// Maps each parent_id → a color. Children sharing the same parent_id share the same color.
function buildParentColorMap(accounts: Account[]): Map<number, string> {
  const map = new Map<number, string>()
  let idx = 0
  const sorted = [...accounts].sort((a, b) => a.code.localeCompare(b.code))
  for (const a of sorted) {
    if (a.parent_id !== null && !map.has(a.parent_id)) {
      map.set(a.parent_id, SIBLING_COLORS[idx % SIBLING_COLORS.length])
      idx++
    }
  }
  return map
}

// ─── Tree helpers ────────────────────────────────────────────────────────────

interface TreeNode extends Account { children: TreeNode[] }

function buildTree(accounts: Account[]): TreeNode[] {
  const map = new Map<number, TreeNode>()
  for (const a of accounts) map.set(a.id, { ...a, children: [] })

  const roots: TreeNode[] = []
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    nodes.forEach(n => sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

function collectAllIds(nodes: TreeNode[]): number[] {
  const ids: number[] = []
  const walk = (ns: TreeNode[]) => ns.forEach(n => { ids.push(n.id); walk(n.children) })
  walk(nodes)
  return ids
}

// ─── Flat table helpers ───────────────────────────────────────────────────────

interface AccountNode extends Account { level: number }

function flattenTree(accounts: Account[]): AccountNode[] {
  const childrenOf = new Map<number | null, Account[]>()
  for (const a of accounts) {
    const key = a.parent_id ?? null
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(a)
  }
  const result: AccountNode[] = []
  function walk(pid: number | null, level: number) {
    const children = (childrenOf.get(pid) ?? []).sort((a, b) => a.code.localeCompare(b.code))
    for (const a of children) {
      result.push({ ...a, level })
      walk(a.id, level + 1)
    }
  }
  walk(null, 0)
  return result
}

function getDescendantIds(id: number, accounts: Account[]): Set<number> {
  const ids = new Set<number>()
  function walk(pid: number) {
    accounts.filter(a => a.parent_id === pid).forEach(a => { ids.add(a.id); walk(a.id) })
  }
  walk(id)
  return ids
}

function suggestCode(parentId: number | null, accounts: Account[]): string {
  const parent   = parentId ? accounts.find(a => a.id === parentId) : null
  const siblings = accounts.filter(a => (a.parent_id ?? null) === parentId)

  if (siblings.length === 0) {
    if (!parent) return '1'
    return `${parent.code}1`
  }

  const nums = siblings.map(a => parseInt(a.code, 10)).filter(n => !isNaN(n))
  if (nums.length === 0) return parent ? `${parent.code}1` : ''
  return String(Math.max(...nums) + 1)
}

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}

const SUB_TYPE_OPTIONS: Record<AccountType, { value: AccountSubType; label: string }[]> = {
  asset:     [{ value: 'current', label: 'أصول متداولة' }, { value: 'non_current', label: 'أصول ثابتة وغير ملموسة' }],
  liability: [{ value: 'current', label: 'خصوم متداولة' }, { value: 'long_term', label: 'خصوم طويلة الأجل' }],
  equity:    [],
  revenue:   [],
  expense:   [],
}

const emptyForm = {
  code:      '',
  name:      '',
  type:      'asset' as AccountType,
  sub_type:  null as AccountSubType,
  parent_id: null as number | null,
  is_active: true,
}

// ─── Tree node component ──────────────────────────────────────────────────────

interface TreeNodeProps {
  node: TreeNode
  depth: number
  expandedIds: Set<number>
  parentColorMap: Map<number, string>
  newlyAddedId: number | null
  onToggle: (id: number) => void
  onAddChild: (node: Account) => void
  onEdit: (node: Account) => void
  onDelete: (node: Account) => void
}

function AccountTreeNode({ node, depth, expandedIds, parentColorMap, newlyAddedId, onToggle, onAddChild, onEdit, onDelete }: TreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded  = expandedIds.has(node.id)
  const siblingColor = node.parent_id !== null ? (parentColorMap.get(node.parent_id) ?? null) : null

  const menuItems: MenuProps['items'] = [
    { key: 'add', label: 'إضافة حساب فرعي', icon: <Plus size={15} color="var(--ant-color-primary)" /> },
    { key: 'edit', label: 'تعديل', icon: <Pencil size={15} /> },
    { key: 'delete', label: 'حذف', icon: <Trash2 size={15} />, danger: true },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'add') onAddChild(node)
    else if (key === 'edit') onEdit(node)
    else if (key === 'delete') onDelete(node)
  }

  return (
    <>
      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
        <Flex
          align="center" gap={4}
          className={node.id === newlyAddedId ? 'highlight-fade' : undefined}
          style={{
            padding: '5px 8px',
            paddingInlineStart: `${4 + depth * 22}px`,
            borderBottom: '1px solid var(--ant-color-border-secondary)',
            borderInlineStart: siblingColor ? `3px solid ${siblingColor}` : '3px solid transparent',
            opacity: node.is_active ? 1 : 0.45,
            background: DEPTH_BG[depth % DEPTH_BG.length],
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 26, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            {hasChildren ? (
              <Button
                type="text" shape="circle" size="small"
                onClick={(e) => { e.stopPropagation(); onToggle(node.id) }}
                icon={isExpanded
                  ? <ChevronDown size={16} color="var(--ant-color-text-secondary)" />
                  : <ChevronLeft size={16} color="var(--ant-color-text-secondary)" />}
              />
            ) : (
              <div style={{ width: 26 }} />
            )}
          </div>

          <Text style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--ant-color-text-secondary)', minWidth: 64, flexShrink: 0, direction: 'ltr', textAlign: 'left' }}>
            {node.code}
          </Text>

          <div style={{ flex: 1, fontWeight: depth === 0 ? 700 : 400, fontSize: depth === 0 ? 14 : 13, color: depth === 0 ? 'var(--ant-color-text)' : 'var(--ant-color-text-secondary)' }}>
            {node.name}
            {hasChildren && (
              <span style={{
                display: 'inline-block',
                marginRight: 10, fontSize: 11, fontWeight: 600,
                padding: '1px 6px', borderRadius: 6,
                color: siblingColor ?? 'var(--ant-color-text-disabled)',
                background: siblingColor ? `${siblingColor}18` : 'transparent',
              }}>
                {node.children.length}
              </span>
            )}
          </div>

          <Tag color={TYPE_COLOR[node.type]} style={{ fontSize: 11, flexShrink: 0 }}>{TYPE_LABELS[node.type]}</Tag>

          <Text style={{ fontSize: 12, fontWeight: 500, minWidth: 40, textAlign: 'center', flexShrink: 0 }} type={node.is_active ? 'success' : 'secondary'}>
            {node.is_active ? 'نشط' : 'موقوف'}
          </Text>
        </Flex>
      </Dropdown>

      {hasChildren && isExpanded && node.children.map(child => (
        <AccountTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          parentColorMap={parentColorMap}
          newlyAddedId={newlyAddedId}
          onToggle={onToggle}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const toast = useToast()
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [loading, setLoading]         = useState(true)
  const [viewMode, setViewMode]       = useState<'table' | 'tree'>('tree')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<Account | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await accountsApi.list()
      setAccounts(data)
      setExpandedIds(new Set(collectAllIds(buildTree(data))))
    } finally {
      setLoading(false)
    }
  }

  const treeData       = useMemo(() => buildTree(accounts), [accounts])
  const flatData       = useMemo(() => flattenTree(accounts), [accounts])
  const parentColorMap = useMemo(() => buildParentColorMap(accounts), [accounts])

  const toggleExpand = (id: number) =>
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const expandAll   = () => setExpandedIds(new Set(collectAllIds(treeData)))
  const collapseAll = () => setExpandedIds(new Set())

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, code: suggestCode(null, accounts) })
    setDialogOpen(true)
  }

  function openAddChild(parent: Account) {
    setEditing(null)
    setForm({ code: suggestCode(parent.id, accounts), name: '', type: parent.type, sub_type: null, parent_id: parent.id, is_active: true })
    setDialogOpen(true)
    setExpandedIds(prev => new Set(prev).add(parent.id))
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({ code: a.code, name: a.name, type: a.type, sub_type: a.sub_type, parent_id: a.parent_id, is_active: a.is_active })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        const updated = await accountsApi.update(editing.id, form)
        setDialogOpen(false)
        setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, ...updated } : a))
        toast.success('تم حفظ الحساب')
      } else {
        setDialogOpen(false)
        const created = await accountsApi.create(form)
        setAccounts(prev => [...prev, created])
        if (highlightTimer.current) clearTimeout(highlightTimer.current)
        setNewlyAddedId(created.id)
        highlightTimer.current = setTimeout(() => setNewlyAddedId(null), 2500)
        toast.success('تم إضافة الحساب')
      }
    } catch (err) {
      toast.error(extractError(err))
      setDialogOpen(true)
    }
    finally { setSaving(false) }
  }

  function confirmDelete(a: Account) {
    setDeleteTarget(a); setDeleteOpen(true)
  }
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const snapshot = accounts
    setAccounts(prev => prev.filter(a => a.id !== deleteTarget.id))
    setDeleteOpen(false)
    try {
      await accountsApi.remove(deleteTarget.id)
      toast.success('تم حذف الحساب')
    } catch (err) {
      setAccounts(snapshot)
      toast.error(extractError(err))
      setDeleteOpen(true)
    } finally {
      setDeleting(false)
    }
  }

  const excludeIds = editing
    ? new Set([editing.id, ...getDescendantIds(editing.id, accounts)])
    : new Set<number>()

  const hasChildrenOfDeleteTarget = !!deleteTarget && accounts.some(a => a.parent_id === deleteTarget.id)

  const columns: ColumnsType<AccountNode> = [
    { title: 'الكود', dataIndex: 'code', width: 90, render: (v: string) => <Text style={{ fontFamily: 'monospace', fontSize: 13 }} type="secondary">{v}</Text> },
    {
      title: 'الاسم',
      render: (_: unknown, node) => (
        <Flex align="center" gap={4} style={{ paddingInlineStart: node.level * 20 }}>
          {node.level > 0 && <Text type="secondary" style={{ lineHeight: 1 }}>└</Text>}
          <Text style={{ fontWeight: node.level === 0 ? 600 : 400 }}>{node.name}</Text>
        </Flex>
      ),
    },
    { title: 'النوع', width: 130, render: (_: unknown, node) => <Tag color={TYPE_COLOR[node.type]}>{TYPE_LABELS[node.type]}</Tag> },
    {
      title: 'الحالة', width: 80,
      render: (_: unknown, node) => (
        <Text style={{ fontSize: 12, fontWeight: 500 }} type={node.is_active ? 'success' : 'secondary'}>
          {node.is_active ? 'نشط' : 'موقوف'}
        </Text>
      ),
    },
    {
      title: 'إجراءات', width: 80, align: 'center',
      render: (_: unknown, node) => (
        <Flex justify="center">
          <Button type="text" shape="circle" size="small" onClick={() => openEdit(node)} icon={<Pencil size={15} />} />
          <Button type="text" shape="circle" size="small" danger onClick={() => confirmDelete(node)} icon={<Trash2 size={15} />} />
        </Flex>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex align="center" justify="space-between" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>شجرة الحسابات</Title>
          <Text type="secondary">دليل الحسابات المحاسبي</Text>
        </div>

        <Flex gap={12} align="center">
          <HelpButton title="دليل استخدام شجرة الحسابات">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي شجرة الحسابات؟</Title>
                <Text>شجرة الحسابات هي الهيكل الأساسي للنظام المحاسبي. تُنظَّم الحسابات في مستويات هرمية: حسابات رئيسية → حسابات فرعية. كل حساب له رمز ونوع (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات).</Text></div>
              <div><Title level={5}>إضافة حساب جديد</Title>
                <Text>اضغط "حساب جديد"، أدخل الرمز والاسم، حدد النوع، واختر الحساب الأب إذا كان حساباً فرعياً. الحسابات التي لها قيود لا يمكن حذفها.</Text></div>
              <div><Title level={5}>العرض الشجري والجدولي</Title>
                <Text>يمكن التبديل بين العرض الشجري (يُظهر التسلسل الهرمي) والعرض الجدولي (يُظهر قائمة مسطحة). في العرض الشجري يمكن توسيع وطي الشجرة بالكامل.</Text></div>
              <div><Title level={5}>الأنواع الخمسة للحسابات</Title>
                <Text>أصول (Assets) · خصوم (Liabilities) · حقوق الملكية (Equity) · إيرادات (Revenue) · مصروفات (Expenses). النوع يحدد طبيعة الحساب في التقارير المالية.</Text></div>
            </Flex>
          </HelpButton>
          {viewMode === 'tree' && !loading && (
            <Flex gap={4}>
              <Button size="small" type="text" onClick={expandAll}>توسيع الكل</Button>
              <Button size="small" type="text" onClick={collapseAll}>طي الكل</Button>
            </Flex>
          )}

          <Segmented
            value={viewMode}
            onChange={v => setViewMode(v as 'table' | 'tree')}
            options={[
              { value: 'tree', icon: <Tooltip title="عرض الشجرة"><ListTree size={15} /></Tooltip> },
              { value: 'table', icon: <Tooltip title="عرض الجدول"><Rows3 size={15} /></Tooltip> },
            ]}
          />

          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            إضافة حساب
          </Button>
        </Flex>
      </Flex>

      {/* ── Tree view ── */}
      {viewMode === 'tree' && (
        <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          <Flex align="center" gap={4} style={{ padding: '8px 16px', background: 'var(--ant-color-fill-alter)', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
            <div style={{ width: 26 }} />
            <Text style={{ fontWeight: 700, fontSize: 12, minWidth: 64 }} type="secondary">الكود</Text>
            <Text style={{ flex: 1, fontWeight: 700, fontSize: 12 }} type="secondary">اسم الحساب</Text>
            <Text style={{ fontWeight: 700, fontSize: 12, minWidth: 100, textAlign: 'center' }} type="secondary">النوع</Text>
            <Text style={{ fontWeight: 700, fontSize: 12, minWidth: 40, textAlign: 'center' }} type="secondary">الحالة</Text>
            <div style={{ width: 68 }} />
          </Flex>

          {loading ? (
            <Flex justify="center" style={{ padding: '64px 0' }}><Spin size="large" /></Flex>
          ) : treeData.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <Text type="secondary">لا توجد حسابات. أضف حساباً للبدء.</Text>
            </div>
          ) : (
            treeData.map(node => (
              <AccountTreeNode
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                parentColorMap={parentColorMap}
                newlyAddedId={newlyAddedId}
                onToggle={toggleExpand}
                onAddChild={openAddChild}
                onEdit={openEdit}
                onDelete={confirmDelete}
              />
            ))
          )}
        </div>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && (
        <Table
          size="small"
          columns={columns}
          dataSource={flatData}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: 'لا توجد حسابات. أضف حساباً للبدء.' }}
          rowClassName={node => node.id === newlyAddedId ? 'highlight-fade' : ''}
        />
      )}

      {/* ── Create / Edit Dialog ── */}
      <Modal
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        width={520}
        title={editing ? 'تعديل الحساب' : 'إضافة حساب جديد'}
        footer={null}
      >
        <form onSubmit={handleSubmit}>
          <Flex vertical gap={16} style={{ paddingTop: 8 }}>
            <Flex gap={16}>
              <div style={{ flex: 5 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الكود</Text>
                <Input dir="ltr" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} required />
              </div>
              <div style={{ flex: 7 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>النوع</Text>
                <Select
                  style={{ width: '100%' }}
                  value={form.type}
                  onChange={v => setForm(p => ({ ...p, type: v, sub_type: null }))}
                  options={(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([v, label]) => ({ value: v, label }))}
                />
              </div>
            </Flex>

            {SUB_TYPE_OPTIONS[form.type].length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>التصنيف الفرعي</Text>
                <Select
                  style={{ width: '100%' }}
                  value={form.sub_type ?? ''}
                  onChange={v => setForm(p => ({ ...p, sub_type: (v || null) as AccountSubType }))}
                  options={[
                    { value: '', label: '— غير محدد —' },
                    ...SUB_TYPE_OPTIONS[form.type].map(opt => ({ value: opt.value ?? '', label: opt.label })),
                  ]}
                />
              </div>
            )}

            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الاسم</Text>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الحساب الأب</Text>
              <Select
                showSearch
                style={{ width: '100%' }}
                value={form.parent_id?.toString() ?? ''}
                onChange={v => {
                  const newParentId = v === '' ? null : Number(v)
                  setForm(p => ({
                    ...p,
                    parent_id: newParentId,
                    ...(!editing && { code: suggestCode(newParentId, accounts) }),
                  }))
                }}
                filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={[
                  { value: '', label: '— بدون أب —' },
                  ...accounts.filter(a => !excludeIds.has(a.id)).map(a => ({ value: a.id.toString(), label: `${a.code} — ${a.name}` })),
                ]}
              />
            </div>

            <Flex align="center" justify="space-between" style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, padding: '8px 16px' }}>
              <Text>الحساب نشط</Text>
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

      {/* ── Delete Confirmation ── */}
      <Modal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        width={420}
        title="تأكيد الحذف"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button type="primary" danger onClick={handleDelete} disabled={deleting || hasChildrenOfDeleteTarget}>
              {deleting ? <Spin size="small" /> : 'حذف'}
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap={12} style={{ paddingTop: 8 }}>
          <Text type="secondary">
            هل أنت متأكد من حذف الحساب{' '}
            <span style={{ fontWeight: 600, color: 'var(--ant-color-text)' }}>{deleteTarget?.code} — {deleteTarget?.name}</span>؟
          </Text>
          {hasChildrenOfDeleteTarget && (
            <Alert type="warning" showIcon message="لا يمكن الحذف — هذا الحساب يحتوي على حسابات فرعية. احذف الحسابات الفرعية أولاً." />
          )}
        </Flex>
      </Modal>
    </div>
  )
}
