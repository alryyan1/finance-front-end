import { useEffect, useMemo, useRef, useState } from 'react'
import HelpButton from '@/components/common/HelpButton'
import { keyframes } from '@emotion/react'
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
import Collapse from '@mui/material/Collapse'
import Tooltip from '@mui/material/Tooltip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { SelectChangeEvent } from '@mui/material/Select'
import { accountsApi } from '@/api/accounts'
import type { Account, AccountSubType, AccountType } from '@/types/account'

const TYPE_LABELS: Record<AccountType, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_COLOR: Record<AccountType, 'primary' | 'error' | 'secondary' | 'success' | 'warning'> = {
  asset:     'primary',
  liability: 'error',
  equity:    'secondary',
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

// ─── Highlight animation ──────────────────────────────────────────────────────

const highlightFade = keyframes`
  0%   { background-color: rgba(59, 130, 246, 0.22); }
  60%  { background-color: rgba(59, 130, 246, 0.09); }
  100% { background-color: rgba(59, 130, 246, 0); }
`

// ─── Tree node component ──────────────────────────────────────────────────────

interface TreeNodeProps {
  node: TreeNode
  depth: number
  expandedIds: Set<number>
  parentColorMap: Map<number, string>
  newlyAddedId: number | null
  onToggle: (id: number) => void
  onEdit: (a: Account) => void
  onDelete: (a: Account) => void
  onAddChild: (a: Account) => void
}

function AccountTreeNode({ node, depth, expandedIds, parentColorMap, newlyAddedId, onToggle, onEdit, onDelete, onAddChild }: TreeNodeProps) {
  const hasChildren = node.children.length > 0
  const isExpanded  = expandedIds.has(node.id)
  // Color shared by all siblings (nodes with same parent_id)
  const siblingColor = node.parent_id !== null ? (parentColorMap.get(node.parent_id) ?? null) : null

  return (
    <>
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          px: 1, py: 0.6,
          paddingInlineStart: `${4 + depth * 22}px`,
          borderBottom: '1px solid',
          borderColor: 'divider',
          borderLeft: siblingColor ? `3px solid ${siblingColor}` : '3px solid transparent',
          opacity: node.is_active ? 1 : 0.45,
          bgcolor: DEPTH_BG[depth % DEPTH_BG.length],
          '&:hover': { bgcolor: 'action.hover' },
          transition: 'background-color 0.1s',
          animation: node.id === newlyAddedId ? `${highlightFade} 2s ease-out forwards` : undefined,
        }}
      >
        <Box sx={{ width: 26, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            <IconButton size="small" onClick={() => onToggle(node.id)} sx={{ p: 0.25 }}>
              {isExpanded
                ? <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                : <ChevronLeftIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
            </IconButton>
          ) : (
            <Box sx={{ width: 26 }} />
          )}
        </Box>

        <Typography
          sx={{ fontFamily: 'monospace', fontSize: 12, color: 'text.secondary',
            minWidth: 64, flexShrink: 0, direction: 'ltr', textAlign: 'left' }}
        >
          {node.code}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            flex: 1, fontWeight: depth === 0 ? 700 : 400,
            fontSize: depth === 0 ? 14 : 13,
            color: depth === 0 ? 'text.primary' : 'text.secondary',
          }}
        >
          {node.name}
          {hasChildren && (
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                mr: 1.3, fontSize: 11, fontWeight: 600,
                px: 0.6, py: 0.1, borderRadius: 0.75,
                color: siblingColor ?? 'text.disabled',
                bgcolor: siblingColor ? `${siblingColor}18` : 'transparent',
              }}
            >
              {node.children.length}
            </Box>
          )}
        </Typography>

        <Chip
          label={TYPE_LABELS[node.type]}
          color={TYPE_COLOR[node.type]}
          size="small" variant="outlined"
          sx={{ fontSize: 11, flexShrink: 0 }}
        />

        <Typography
          variant="caption"
          sx={{ color: node.is_active ? 'success.main' : 'text.disabled',
            fontWeight: 500, minWidth: 40, textAlign: 'center', flexShrink: 0 }}
        >
          {node.is_active ? 'نشط' : 'موقوف'}
        </Typography>

        <Tooltip title="إضافة حساب فرعي">
          <IconButton size="small" onClick={() => onAddChild(node)} sx={{ color: 'primary.main' }}>
            <AddOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="تعديل">
          <IconButton size="small" onClick={() => onEdit(node)} sx={{ color: 'text.secondary' }}>
            <EditOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" onClick={() => onDelete(node)} sx={{ color: 'error.main' }}>
            <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {hasChildren && (
        <Collapse in={isExpanded} unmountOnExit>
          {node.children.map(child => (
            <AccountTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              parentColorMap={parentColorMap}
              newlyAddedId={newlyAddedId}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </Collapse>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [loading, setLoading]         = useState(true)
  const [viewMode, setViewMode]       = useState<'table' | 'tree'>('tree')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing]       = useState<Account | null>(null)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [deleteError, setDeleteError]   = useState<string | null>(null)

  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await accountsApi.list()
      setAccounts(data)
      const tree = buildTree(data)
      setExpandedIds(new Set(collectAllIds(tree)))
    } finally { setLoading(false) }
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
    setFormError(null); setDialogOpen(true)
  }

  function openAddChild(parent: Account) {
    setEditing(null)
    setForm({ code: suggestCode(parent.id, accounts), name: '', type: parent.type, sub_type: null, parent_id: parent.id, is_active: true })
    setFormError(null)
    setDialogOpen(true)
    setExpandedIds(prev => new Set(prev).add(parent.id))
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({ code: a.code, name: a.name, type: a.type, sub_type: a.sub_type, parent_id: a.parent_id, is_active: a.is_active })
    setFormError(null); setDialogOpen(true)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true); setFormError(null)
    try {
      if (editing) {
        await accountsApi.update(editing.id, form)
      } else {
        const created = await accountsApi.create(form)
        if (highlightTimer.current) clearTimeout(highlightTimer.current)
        setNewlyAddedId(created.id)
        highlightTimer.current = setTimeout(() => setNewlyAddedId(null), 2500)
      }
      await load(); setDialogOpen(false)
    } catch (err) { setFormError(extractError(err)) }
    finally { setSaving(false) }
  }

  function confirmDelete(a: Account) {
    setDeleteTarget(a); setDeleteError(null); setDeleteOpen(true)
  }
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError(null)
    try {
      await accountsApi.remove(deleteTarget.id)
      await load(); setDeleteOpen(false)
    } catch (err) { setDeleteError(extractError(err)) }
    finally { setDeleting(false) }
  }

  const excludeIds = editing
    ? new Set([editing.id, ...getDescendantIds(editing.id, accounts)])
    : new Set<number>()

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>شجرة الحسابات</Typography>
          <Typography variant="body2" color="text.secondary">دليل الحسابات المحاسبي</Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <HelpButton title="دليل استخدام شجرة الحسابات">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>ما هي شجرة الحسابات؟</Typography>
                <Typography variant="body2">شجرة الحسابات هي الهيكل الأساسي للنظام المحاسبي. تُنظَّم الحسابات في مستويات هرمية: حسابات رئيسية → حسابات فرعية. كل حساب له رمز ونوع (أصول، خصوم، حقوق ملكية، إيرادات، مصروفات).</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>إضافة حساب جديد</Typography>
                <Typography variant="body2">اضغط "حساب جديد"، أدخل الرمز والاسم، حدد النوع، واختر الحساب الأب إذا كان حساباً فرعياً. الحسابات التي لها قيود لا يمكن حذفها.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>العرض الشجري والجدولي</Typography>
                <Typography variant="body2">يمكن التبديل بين العرض الشجري (يُظهر التسلسل الهرمي) والعرض الجدولي (يُظهر قائمة مسطحة). في العرض الشجري يمكن توسيع وطي الشجرة بالكامل.</Typography></Box>
              <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>الأنواع الخمسة للحسابات</Typography>
                <Typography variant="body2">أصول (Assets) · خصوم (Liabilities) · حقوق الملكية (Equity) · إيرادات (Revenue) · مصروفات (Expenses). النوع يحدد طبيعة الحساب في التقارير المالية.</Typography></Box>
            </Box>
          </HelpButton>
          {viewMode === 'tree' && !loading && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Button size="small" variant="text" onClick={expandAll}   sx={{ fontSize: 12 }}>توسيع الكل</Button>
              <Button size="small" variant="text" onClick={collapseAll} sx={{ fontSize: 12 }}>طي الكل</Button>
            </Box>
          )}

          <ToggleButtonGroup
            value={viewMode} exclusive size="small"
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="tree">
              <Tooltip title="عرض الشجرة">
                <AccountTreeOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="table">
              <Tooltip title="عرض الجدول">
                <TableRowsOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            إضافة حساب
          </Button>
        </Box>
      </Box>

      {/* ── Tree view ── */}
      {viewMode === 'tree' && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 2, py: 1,
            bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 26 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 64, color: 'text.secondary' }}>الكود</Typography>
            <Typography variant="caption" sx={{ flex: 1, fontWeight: 700, color: 'text.secondary' }}>اسم الحساب</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 100, color: 'text.secondary', textAlign: 'center' }}>النوع</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 40, color: 'text.secondary', textAlign: 'center' }}>الحالة</Typography>
            <Box sx={{ width: 68 }} />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress size={28} />
            </Box>
          ) : treeData.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">لا توجد حسابات. أضف حساباً للبدء.</Typography>
            </Box>
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
                onEdit={openEdit}
                onDelete={confirmDelete}
                onAddChild={openAddChild}
              />
            ))
          )}
        </Paper>
      )}

      {/* ── Table view ── */}
      {viewMode === 'table' && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 90 }}>الكود</TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell sx={{ width: 130 }}>النوع</TableCell>
                <TableCell sx={{ width: 80 }}>الحالة</TableCell>
                <TableCell sx={{ width: 80 }} align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : flatData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    لا توجد حسابات. أضف حساباً للبدء.
                  </TableCell>
                </TableRow>
              ) : flatData.map(node => (
                <TableRow key={node.id}
                  sx={{
                    opacity: node.is_active ? 1 : 0.45,
                    '&:hover': { bgcolor: 'action.hover' },
                    animation: node.id === newlyAddedId ? `${highlightFade} 2s ease-out forwards` : undefined,
                  }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, color: 'text.secondary' }}>
                    {node.code}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, paddingInlineStart: `${node.level * 20}px` }}>
                      {node.level > 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1 }}>└</Typography>
                      )}
                      <Typography variant="body2" sx={{ fontWeight: node.level === 0 ? 600 : 400 }}>
                        {node.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={TYPE_LABELS[node.type]} color={TYPE_COLOR[node.type]}
                      size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption"
                      sx={{ color: node.is_active ? 'success.main' : 'text.disabled', fontWeight: 500 }}>
                      {node.is_active ? 'نشط' : 'موقوف'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => openEdit(node)} sx={{ color: 'text.secondary' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => confirmDelete(node)} sx={{ color: 'error.main' }}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
        <Divider />
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 2 }}>
              <TextField
                label="الكود" value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                slotProps={{ htmlInput: { dir: 'ltr' } }} required fullWidth size="small"
              />
              <FormControl size="small" fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type} label="النوع"
                  onChange={(e: SelectChangeEvent) => setForm(p => ({ ...p, type: e.target.value as AccountType, sub_type: null }))}
                >
                  {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([v, label]) => (
                    <MenuItem key={v} value={v}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {SUB_TYPE_OPTIONS[form.type].length > 0 && (
              <FormControl size="small" fullWidth>
                <InputLabel>التصنيف الفرعي</InputLabel>
                <Select
                  value={form.sub_type ?? ''}
                  label="التصنيف الفرعي"
                  onChange={(e: SelectChangeEvent) =>
                    setForm(p => ({ ...p, sub_type: (e.target.value || null) as AccountSubType }))
                  }
                >
                  <MenuItem value="">— غير محدد —</MenuItem>
                  {SUB_TYPE_OPTIONS[form.type].map(opt => (
                    <MenuItem key={opt.value} value={opt.value ?? ''}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="الاسم" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              required fullWidth size="small"
            />

            <FormControl size="small" fullWidth>
              <InputLabel>الحساب الأب</InputLabel>
              <Select
                value={form.parent_id?.toString() ?? ''}
                label="الحساب الأب"
                onChange={(e: SelectChangeEvent) => {
                  const newParentId = e.target.value === '' ? null : Number(e.target.value)
                  setForm(p => ({
                    ...p,
                    parent_id: newParentId,
                    ...(!editing && { code: suggestCode(newParentId, accounts) }),
                  }))
                }}
              >
                <MenuItem value="">— بدون أب —</MenuItem>
                {accounts.filter(a => !excludeIds.has(a.id)).map(a => (
                  <MenuItem key={a.id} value={a.id.toString()}>{a.code} — {a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 2, py: 1 }}>
              <Typography variant="body2">الحساب نشط</Typography>
              <Switch checked={form.is_active}
                onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} size="small" />
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

      {/* ── Delete Confirmation ── */}
      {(() => {
        const hasChildren = !!deleteTarget && accounts.some(a => a.parent_id === deleteTarget.id)
        return (
          <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setDeleteError(null) }} maxWidth="xs" fullWidth>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" color="text.secondary">
                هل أنت متأكد من حذف الحساب{' '}
                <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {deleteTarget?.code} — {deleteTarget?.name}
                </Box>؟
              </Typography>
              {hasChildren && (
                <Alert severity="warning">
                  لا يمكن الحذف — هذا الحساب يحتوي على حسابات فرعية. احذف الحسابات الفرعية أولاً.
                </Alert>
              )}
              {deleteError && <Alert severity="error">{deleteError}</Alert>}
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button variant="outlined" onClick={() => { setDeleteOpen(false); setDeleteError(null) }}>إلغاء</Button>
              <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting || hasChildren}>
                {deleting ? 'جارٍ الحذف…' : 'حذف'}
              </Button>
            </DialogActions>
          </Dialog>
        )
      })()}
    </Box>
  )
}
