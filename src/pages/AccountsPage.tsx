import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { accountsApi } from '@/api/accounts'
import type { Account, AccountType } from '@/types/account'

const TYPE_LABELS: Record<AccountType, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_CLASSES: Record<AccountType, string> = {
  asset:     'bg-blue-100 text-blue-800',
  liability: 'bg-red-100 text-red-800',
  equity:    'bg-purple-100 text-purple-800',
  revenue:   'bg-green-100 text-green-800',
  expense:   'bg-orange-100 text-orange-800',
}

interface AccountNode extends Account { level: number }

function flattenTree(accounts: Account[]): AccountNode[] {
  const childrenOf = new Map<number | null, Account[]>()
  for (const a of accounts) {
    const key = a.parent_id ?? null
    if (!childrenOf.has(key)) childrenOf.set(key, [])
    childrenOf.get(key)!.push(a)
  }
  const result: AccountNode[] = []
  function walk(parentId: number | null, level: number) {
    for (const a of (childrenOf.get(parentId) ?? [])) {
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

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response: { data?: { errors?: Record<string, string[]>; message?: string } } }).response
    if (res?.data?.errors) return Object.values(res.data.errors).flat().join(' ')
    if (res?.data?.message) return res.data.message
  }
  return 'حدث خطأ غير متوقع.'
}

const emptyForm = {
  code: '',
  name: '',
  type: 'asset' as AccountType,
  parent_id: null as number | null,
  is_active: true,
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setAccounts(await accountsApi.list()) }
    finally { setLoading(false) }
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parent_id: account.parent_id,
      is_active: account.is_active,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      if (editing) {
        await accountsApi.update(editing.id, form)
      } else {
        await accountsApi.create(form)
      }
      await load()
      setDialogOpen(false)
    } catch (err) {
      setFormError(extractError(err))
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(account: Account) {
    setDeleteTarget(account)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await accountsApi.remove(deleteTarget.id)
      await load()
      setDeleteOpen(false)
    } catch (err) {
      setDeleteError(extractError(err))
    } finally {
      setDeleting(false)
    }
  }

  const tree = flattenTree(accounts)
  const excludeIds = editing
    ? new Set([editing.id, ...getDescendantIds(editing.id, accounts)])
    : new Set<number>()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">شجرة الحسابات</h1>
          <p className="text-sm text-muted-foreground mt-1">دليل الحسابات المحاسبي</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="me-2" />
          إضافة حساب
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">الكود</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead className="w-36">النوع</TableHead>
              <TableHead className="w-24">الحالة</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  جارٍ التحميل…
                </TableCell>
              </TableRow>
            ) : tree.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  لا توجد حسابات. أضف حساباً للبدء.
                </TableCell>
              </TableRow>
            ) : (
              tree.map(node => (
                <TableRow key={node.id} className={!node.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {node.code}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-1"
                      style={{ paddingInlineStart: `${node.level * 1.25}rem` }}
                    >
                      {node.level > 0 && (
                        <span className="text-muted-foreground text-xs select-none">└</span>
                      )}
                      <span className={node.level === 0 ? 'font-semibold' : ''}>{node.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_CLASSES[node.type]}`}>
                      {TYPE_LABELS[node.type]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${node.is_active ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {node.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(node)}>
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(node)}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الحساب' : 'إضافة حساب جديد'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {formError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="acc-code">الكود</Label>
                <Input
                  id="acc-code"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="1001"
                  dir="ltr"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(p => ({ ...p, type: v as AccountType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_LABELS) as [AccountType, string][]).map(([v, label]) => (
                      <SelectItem key={v} value={v}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="acc-name">الاسم</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="اسم الحساب"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>الحساب الأب</Label>
              <Select
                value={form.parent_id?.toString() ?? '__none__'}
                onValueChange={v => setForm(p => ({ ...p, parent_id: v === '__none__' ? null : Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون أب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— بدون أب —</SelectItem>
                  {accounts
                    .filter(a => !excludeIds.has(a.id))
                    .map(a => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <Label htmlFor="acc-active" className="cursor-pointer font-normal">الحساب نشط</Label>
              <Switch
                id="acc-active"
                checked={form.is_active}
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'جارٍ الحفظ…' : editing ? 'تحديث' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteOpen}
        onOpenChange={open => {
          setDeleteOpen(open)
          if (!open) { setDeleteTarget(null); setDeleteError(null) }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف الحساب{' '}
            <span className="font-semibold text-foreground">
              {deleteTarget?.code} — {deleteTarget?.name}
            </span>
            ؟
          </p>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'جارٍ الحذف…' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
