import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge, Button, Col, Flex, Input, InputNumber, Modal, Row, Segmented, Select, Spin, Table, Tooltip, Typography,
  type GetRef,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { collection, onSnapshot } from 'firebase/firestore'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { useToast } from '@/lib/toast'
import { getFirestoreDb } from '@/lib/firestore'
import {
  Banknote, CheckCheck, CheckCircle2, CircleAlert, CircleMinus, Download, Eye, FileDown, FileText, FileX,
  Landmark, MessageCircle, Paperclip, Plus, RefreshCw, Search, Settings, Sheet, Trash2, UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { accountsApi } from '@/api/accounts'
import { pettyCashSettingsApi, pettyCashAccountSettingsApi } from '@/api/settings'
import { pettyCashApi, type PettyCashTransaction, type NotificationResult, type PettyCashTotals } from '@/api/pettyCash'
import { openPdf, downloadExcel } from '@/api/pdf'
import type { Account } from '@/types/account'

const { Title, Text } = Typography

type TransactionType = 'expense' | 'replenishment'

const numFmt = (v: string | number | null | undefined) =>
  Math.round(parseFloat(String(v ?? 0)) || 0).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

const emptyCompoundLine = () => ({ contra_account: null as Account | null, amount: '' })

const emptyExpenseForm = () => ({
  date:               today(),
  amount:             '',
  beneficiary_name:   '',
  contra_account_id:  null as Account | null,
  source_account_id:  null as Account | null,
  description:        '',
  document:           null as File | null,
  compound:           false,
  lines:              [emptyCompoundLine(), emptyCompoundLine()],
})

const ROLE_LABEL: Record<NotificationResult['role'], string> = { manager: 'المدير' }
const STATUS_LABEL: Record<NotificationResult['status'], string> = { sent: 'تم الإرسال', failed: 'فشل الإرسال', skipped: 'تم التخطي' }

const FieldLabel = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
  <Flex align="center" gap={5} style={{ marginBottom: 4 }}>
    <Icon size={12} color="#000" />
    <Text style={{ fontSize: 11.5, fontWeight: 700, color: '#000' }}>{children}</Text>
  </Flex>
)

/** Pressing Enter in a dialog field advances focus to the next field instead of doing
 *  nothing — mirrors Tab, since these dialogs have no submit-on-Enter form semantics.
 *  Skips textareas (Enter inserts a newline) and antd Select's search input (Enter picks
 *  the highlighted option there; the Select's onChange handler advances focus instead). */
const focusNextField = (e: ReactKeyboardEvent<HTMLDivElement>) => {
  if (e.key !== 'Enter') return
  const target = e.target as HTMLElement
  if (target.tagName === 'TEXTAREA' || target.closest('.ant-select')) return
  e.preventDefault()
  const focusables = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>('input:not(:disabled), textarea:not(:disabled)')
  ).filter(el => el.offsetParent !== null)
  const idx = focusables.indexOf(target)
  if (idx > -1 && idx < focusables.length - 1) focusables[idx + 1].focus()
}

/** Short two-tone chime for a remote update landing via a Firestore listener
 *  (a WhatsApp-tap approval, or a new WhatsApp expense request). Synthesized
 *  with the Web Audio API so no sound asset is needed — silently no-ops if
 *  the browser blocks audio (e.g. no user interaction yet). */
function playChime() {
  try {
    const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioContextCtor()
    const now = ctx.currentTime
    const frequencies = [880, 1320]
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = now + i * 0.12
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.3)
    })
    setTimeout(() => ctx.close(), 600)
  } catch {
    // Web Audio unsupported or blocked — skip the chime, the row animation still shows.
  }
}

export default function PettyCashPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cashAccount, setCashAccount] = useState<Account | null>(null)
  const [bankAccount, setBankAccount] = useState<Account | null>(null)
  const [accounts, setAccounts]       = useState<Account[]>([])
  // Guards the "accounts not configured" empty-state from flashing briefly on
  // every visit while cashAccount/bankAccount are still their initial null —
  // that state is indistinguishable from "genuinely not configured" until this
  // settles.
  const [accountSettingsLoading, setAccountSettingsLoading] = useState(true)
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([])
  const [loading, setLoading]         = useState(true)

  // Approval designation (who is allowed to approve)
  const [approvalSettings, setApprovalSettings] = useState<{ managerUserId: number | null }>({
    managerUserId: null,
  })
  // Firestore tenant collection petty cash approvals are mirrored under — falls back to
  // the same default ("jawda") the backend uses when the setting hasn't been configured.
  const [firestoreCollectionName, setFirestoreCollectionName] = useState<string | null>(null)
  const isManager = !!user && user.id === approvalSettings.managerUserId

  // Approve / upload-document in-flight state
  const [approving, setApproving]           = useState<number | null>(null)
  const [uploadingDocFor, setUploadingDocFor] = useState<number | null>(null)
  const [deletingDocFor, setDeletingDocFor]   = useState<number | null>(null)
  const [uploadTarget, setUploadTarget]       = useState<PettyCashTransaction | null>(null)
  const rowDocInputRef = useRef<HTMLInputElement>(null)

  // WhatsApp notification status popup
  const [notifying, setNotifying]                 = useState<number | null>(null)
  const [notificationResults, setNotificationResults] = useState<NotificationResult[] | null>(null)

  // Filters
  const [from, setFrom]                 = useState(yearStart())
  const [to, setTo]                     = useState(today())
  const [search, setSearch]             = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceAccountFilter, setSourceAccountFilter] = useState<number | null>(null)

  // Pagination — the grid used to load every transaction in the date range at
  // once; the backend now paginates so page loads stay fast regardless of how
  // much history is in range.
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal]       = useState(0)
  const [totals, setTotals]     = useState<PettyCashTotals | null>(null)

  // Expense dialog
  const [expenseOpen, setExpenseOpen]     = useState(false)
  const [expenseForm, setExpenseForm]     = useState(emptyExpenseForm())
  const [creatingExpense, setCreatingExpense] = useState(false)
  const expenseDocInputRef = useRef<HTMLInputElement>(null)
  const expenseAmountRef = useRef<GetRef<typeof InputNumber>>(null)
  const expenseDescriptionRef = useRef<GetRef<typeof Input.TextArea>>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<PettyCashTransaction | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Document download
  const [docLoading, setDocLoading] = useState<number | null>(null)

  // PDF export
  const [pdfLoading, setPdfLoading] = useState(false)

  // Excel export
  const [excelLoading, setExcelLoading] = useState(false)

  // Sync expense accounts to WhatsApp (Firestore)
  const [syncingAccounts, setSyncingAccounts] = useState(false)

  // Manually reconcile still-pending expenses against their Firestore mirror docs
  // (approvals/receipts made via WhatsApp) — moved off the page-load path for performance.
  const [reconcilingPending, setReconcilingPending] = useState(false)

  // Import pending "new expense" requests submitted via the WhatsApp Flow
  const [importingWhatsApp, setImportingWhatsApp] = useState(false)
  const [pendingWhatsAppCount, setPendingWhatsAppCount] = useState(0)

  // Rows just reconciled from a remote (WhatsApp-tap) approval — briefly highlighted + chimed
  const [updatedIds, setUpdatedIds] = useState<Set<number>>(new Set())
  const updatedHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Rows currently being checked against their Firestore mirror doc — shows a small
  // spinner in the status column for as long as that check is in flight.
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set())

  const markSyncing = (ids: number[]) => setSyncingIds(prev => new Set([...prev, ...ids]))
  const clearSyncing = (ids: number[]) => setSyncingIds(prev => {
    const next = new Set(prev)
    ids.forEach(id => next.delete(id))
    return next
  })

  const flashUpdated = (ids: number[]) => {
    if (ids.length === 0) return
    if (updatedHighlightTimer.current) clearTimeout(updatedHighlightTimer.current)
    setUpdatedIds(new Set(ids))
    updatedHighlightTimer.current = setTimeout(() => setUpdatedIds(new Set()), 2500)
    playChime()
  }

  const loadTransactions = () => {
    setLoading(true)
    pettyCashApi.listTransactionsPaginated({
      from, to, search: debouncedSearch || undefined, source_account_id: sourceAccountFilter ?? undefined, page, per_page: pageSize,
    })
      .then(res => {
        setTransactions(res.data)
        setTotal(res.total)
        setTotals(res.totals)
      })
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  // Debounce the search box so every keystroke doesn't fire a request — the
  // filter now runs server-side (it used to filter the already-fully-loaded
  // list in the browser, which no longer has every row available).
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    Promise.all([accountsApi.list(), pettyCashAccountSettingsApi.get()]).then(([a, s]) => {
      setAccounts(a)
      setCashAccount(a.find(acc => acc.id === s.petty_cash_cash_account_id) ?? null)
      setBankAccount(a.find(acc => acc.id === s.petty_cash_bank_account_id) ?? null)
    }).finally(() => setAccountSettingsLoading(false))
    pettyCashSettingsApi.get().then(s => {
      setApprovalSettings({
        managerUserId: s.petty_cash_manager_user_id,
      })
      setFirestoreCollectionName(s.firebase_collection_name || 'jawda')
    })
  }, [])

  useEffect(() => { loadTransactions() }, [from, to, debouncedSearch, sourceAccountFilter, page, pageSize])

  // Live updates: the WhatsApp approve-button tap writes straight to Firestore (via the
  // pettyCashWebhook Cloud Function), bypassing this app entirely. Listen for changes on
  // that mirror collection so an approval made from someone's phone shows up here without
  // a manual reload. Firestore is a mirror, not the source of truth, so for every changed
  // doc we call the backend's reconcile endpoint — it re-reads that same Firestore doc and
  // updates MySQL (manager_approved_at, and posts the journal entry) — then
  // merges the authoritative row back in.
  useEffect(() => {
    if (!firestoreCollectionName) return

    const db = getFirestoreDb()
    const ref = collection(db, 'finance', firestoreCollectionName, 'petty_cash_approvals')

    let isFirstSnapshot = true
    const unsubscribe = onSnapshot(ref, snapshot => {
      // The first callback fires immediately with every existing doc as an "added"
      // change — that's not a live update, just Firestore reporting current state.
      if (isFirstSnapshot) {
        isFirstSnapshot = false
        return
      }

      const changedIds = snapshot.docChanges()
        .filter(change => change.type !== 'removed')
        .map(change => Number(change.doc.id))
        .filter(id => Number.isFinite(id))
      if (changedIds.length === 0) return

      markSyncing(changedIds)

      Promise.all(changedIds.map(id => pettyCashApi.reconcileTransaction(id)))
        .then(updated => {
          const byId = new Map(updated.map(t => [t.id, t]))
          setTransactions(prev => prev.map(t => byId.get(t.id) ?? t))
          flashUpdated(updated.map(t => t.id))
        })
        .catch(err => console.error('Petty cash reconcile error', err))
        .finally(() => clearSyncing(changedIds))
    }, err => {
      console.error('Petty cash Firestore listener error', err)
    })

    return () => {
      unsubscribe()
      if (updatedHighlightTimer.current) clearTimeout(updatedHighlightTimer.current)
    }
  }, [firestoreCollectionName])

  // Live count of "new expense" requests submitted via the WhatsApp Flow and not
  // yet imported. Chimes when a new one lands so it isn't missed while the app is
  // open — the import button (top of page) shows the count as a badge.
  useEffect(() => {
    if (!firestoreCollectionName) return

    const db = getFirestoreDb()
    const ref = collection(db, 'finance', firestoreCollectionName, 'whatsapp_new_requests')

    let isFirstSnapshot = true
    const unsubscribe = onSnapshot(ref, snapshot => {
      setPendingWhatsAppCount(snapshot.size)

      if (isFirstSnapshot) {
        isFirstSnapshot = false
        return
      }

      const hasNewRequest = snapshot.docChanges().some(change => change.type === 'added')
      if (hasNewRequest) playChime()
    }, err => {
      console.error('Petty cash WhatsApp requests listener error', err)
    })

    return () => unsubscribe()
  }, [firestoreCollectionName])

  const expenseAccounts  = accounts.filter(a => a.type === 'expense')
  const hasSourceAccount = !!bankAccount || !!cashAccount

  const openExpenseDialog = () => {
    setExpenseForm({ ...emptyExpenseForm(), source_account_id: bankAccount ?? cashAccount })
    setExpenseOpen(true)
  }

  // "+" opens the new-expense dialog, unless the user is already typing somewhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '+' || expenseOpen) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return
      if (!hasSourceAccount) return
      e.preventDefault()
      openExpenseDialog()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [hasSourceAccount, expenseOpen, bankAccount, cashAccount])

  const compoundTotal = expenseForm.lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const compoundValid = expenseForm.compound
    && expenseForm.lines.length >= 2
    && expenseForm.lines.every(l => l.contra_account && parseFloat(l.amount) > 0)
  const expenseFormValid = expenseForm.compound
    ? compoundValid
    : !!expenseForm.amount && !!expenseForm.contra_account_id

  const handleCreateExpense = async () => {
    if (!expenseFormValid || !expenseForm.source_account_id) return
    setCreatingExpense(true)
    try {
      const created = await pettyCashApi.createExpense({
        date: expenseForm.date,
        beneficiary_name: expenseForm.beneficiary_name || undefined,
        source_account_id: expenseForm.source_account_id.id,
        description: expenseForm.description || undefined,
        document: expenseForm.document,
        ...(expenseForm.compound
          ? { lines: expenseForm.lines.map(l => ({ contra_account_id: l.contra_account!.id, amount: l.amount })) }
          : { amount: expenseForm.amount, contra_account_id: expenseForm.contra_account_id!.id }),
      })
      setExpenseOpen(false)
      setExpenseForm(emptyExpenseForm())
      if (page === 1) loadTransactions()
      else setPage(1)
      toast.success('تم حفظ المصروف بانتظار اعتماد المدير')
      if (created.notifications) setNotificationResults(created.notifications)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر حفظ المصروف')
    } finally {
      setCreatingExpense(false)
    }
  }

  const handleSendNotification = async (t: PettyCashTransaction) => {
    setNotifying(t.id)
    try {
      const { notifications } = await pettyCashApi.sendNotification(t.id)
      setNotificationResults(notifications)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر إرسال إشعار واتساب')
    } finally {
      setNotifying(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await pettyCashApi.deleteTransaction(deleteTarget.id)
      setDeleteTarget(null)
      loadTransactions()
      toast.success('تم حذف الحركة')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر الحذف')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDocument = async (t: PettyCashTransaction) => {
    setDocLoading(t.id)
    try {
      const res = await pettyCashApi.downloadDocument(t.id)
      const url = URL.createObjectURL(res.data as Blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('تعذّر عرض المستند')
    } finally {
      setDocLoading(null)
    }
  }

  const handleUploadDocument = async (t: PettyCashTransaction, file: File) => {
    setUploadingDocFor(t.id)
    try {
      await pettyCashApi.uploadDocument(t.id, file)
      loadTransactions()
      toast.success('تم إرفاق المستند')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر رفع المستند')
    } finally {
      setUploadingDocFor(null)
    }
  }

  const handleDeleteDocument = (t: PettyCashTransaction) => {
    Modal.confirm({
      title: 'إزالة المستند',
      content: `سيتم حذف "${t.document_original_name ?? 'المستند المرفق'}" نهائياً من هذه الحركة.`,
      okText: 'إزالة', okType: 'danger', cancelText: 'إلغاء',
      onOk: async () => {
        setDeletingDocFor(t.id)
        try {
          await pettyCashApi.deleteDocument(t.id)
          loadTransactions()
          toast.success('تم إزالة المستند')
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'تعذّر إزالة المستند')
        } finally {
          setDeletingDocFor(null)
        }
      },
    })
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await openPdf('/api/petty-cash/transactions/pdf', { from, to, source_account_id: sourceAccountFilter ?? undefined })
    } catch {
      toast.error('تعذّر إنشاء ملف PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExcel = async () => {
    setExcelLoading(true)
    try {
      await downloadExcel('/api/petty-cash/transactions/excel', { from, to }, 'petty-cash-transactions.xlsx')
    } catch {
      toast.error('تعذّر إنشاء ملف Excel')
    } finally {
      setExcelLoading(false)
    }
  }

  const handleSyncExpenseAccounts = async () => {
    setSyncingAccounts(true)
    try {
      const { message } = await pettyCashApi.syncExpenseAccounts()
      toast.success(message)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّرت مزامنة حسابات المصروفات')
    } finally {
      setSyncingAccounts(false)
    }
  }

  const handleReconcilePending = async () => {
    setReconcilingPending(true)
    try {
      const { message, reconciled } = await pettyCashApi.reconcilePending()
      toast.success(message)
      if (reconciled > 0) loadTransactions()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّرت مزامنة الاعتمادات المعلّقة')
    } finally {
      setReconcilingPending(false)
    }
  }

  const handleImportWhatsAppRequests = async () => {
    setImportingWhatsApp(true)
    try {
      const { imported, message } = await pettyCashApi.importWhatsAppRequests()
      toast.success(message)
      if (imported > 0) {
        if (page === 1) loadTransactions()
        else setPage(1)
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر استيراد طلبات واتساب')
    } finally {
      setImportingWhatsApp(false)
    }
  }

  const handleApprove = async (t: PettyCashTransaction) => {
    setApproving(t.id)
    try {
      await pettyCashApi.approveByManager(t.id)
      loadTransactions()
      toast.success('تم اعتماد المصروف من قبل المدير')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر اعتماد المصروف')
    } finally {
      setApproving(null)
    }
  }

  const columns: ColumnsType<PettyCashTransaction> = [
    {
      title: '#', width: 60, align: 'center',
      render: (_: unknown, t) => <Text style={{ fontWeight: 700, direction: 'ltr', fontSize: 12 }}>#{t.id}</Text>,
    },
    {
      title: 'التاريخ', width: 95, align: 'center',
      render: (_: unknown, t) => <span style={{ direction: 'ltr', color: '#000', fontWeight: 700, fontSize: 12.5 }}>{t.date}</span>,
    },
    {
      title: 'البيان',
      render: (_: unknown, t) => {
        const content = (
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontWeight: 500, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>
              {t.description || (t.type === 'expense' ? 'مصروف نثرية' : 'تغذية الصندوق')}
            </div>
            {t.beneficiary_name && <Text style={{ fontSize: 11, display: 'block', fontWeight: 700, color: '#000' }}>{t.beneficiary_name}</Text>}
          </div>
        )
        return t.journal_entry_id ? (
          <Tooltip title={`تم إنشاء القيد المحاسبي رقم ${t.journal_entry_id}`}>
            <Badge.Ribbon text="قيد" color="blue">{content}</Badge.Ribbon>
          </Tooltip>
        ) : content
      },
    },
    {
      title: 'الحسابات', width: 280,
      render: (_: unknown, t) => {
        const debit = t.contra_account ? (
          <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#000' }}>من ح/ {t.contra_account.name}</Text>
        ) : (
          <Tooltip title={t.lines.map(l => `${l.contra_account.name} — ${numFmt(l.amount)}`).join(' | ')}>
            <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#000' }}>من ح/ متعدد ({t.lines.length})</Text>
          </Tooltip>
        )
        return (
          <Flex vertical gap={1}>
            {debit}
            <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#000' }}>الى ح/ {t.source_account?.name ?? '—'}</Text>
          </Flex>
        )
      },
    },
    {
      title: 'أنشأه', width: 120,
      render: (_: unknown, t) => (
        <Flex align="center" gap={4}>
          <UserRound size={12} color="#000" />
          <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#000' }}>{t.created_by?.name ?? '—'}</Text>
        </Flex>
      ),
    },
    {
      title: 'المبلغ', width: 110, align: 'left',
      render: (_: unknown, t) => (
        <span style={{
          direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 16.5,
          color: t.type === 'expense' ? 'var(--ant-color-error)' : 'var(--ant-color-success)',
        }}>
          {t.type === 'expense' ? '-' : '+'}{numFmt(t.amount)}
        </span>
      ),
    },
    {
      title: 'الحالة', width: 100, align: 'center',
      render: (_: unknown, t) => t.type === 'expense' && (
        <Flex align="center" justify="center" gap={4}>
          {syncingIds.has(t.id) && (
            <Tooltip title="جارٍ التحقق من آخر تحديث عبر واتساب...">
              <Spin size="small" />
            </Tooltip>
          )}
          <Tooltip title={t.status === 'approved' ? 'مكتمل — اعتمده المدير' : 'بانتظار اعتماد المدير'}>
            <span style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
              background: t.status === 'approved' ? 'var(--ant-color-success)' : 'var(--ant-color-warning)',
            }} />
          </Tooltip>
          {isManager && (
            <Tooltip title={t.manager_approved_at ? 'تم الاعتماد' : 'اعتماد نهائي (مدير) — يُنشئ القيد المحاسبي'}>
              <Button size="small"
                onClick={() => handleApprove(t)}
                disabled={approving === t.id || !!t.manager_approved_at}
              >
                {approving === t.id ? <Spin size="small" /> : 'اعتماد'}
              </Button>
            </Tooltip>
          )}
        </Flex>
      ),
    },
    {
      title: 'إجراءات', width: 200, align: 'center',
      render: (_: unknown, t) => (
        <Flex align="center" justify="center" wrap="nowrap">
          {t.type === 'expense' && t.status === 'pending' && (
            <Tooltip title="إرسال إشعار واتساب للمدير">
              <Button type="text" shape="circle" size="small" onClick={() => handleSendNotification(t)} disabled={notifying === t.id}
                icon={notifying === t.id ? <Spin size="small" /> : <MessageCircle size={15} color="var(--ant-color-success)" />} />
            </Tooltip>
          )}
          {t.document_path ? (
            <>
              <Tooltip title={t.document_original_name ?? 'عرض المستند'}>
                <Button type="text" shape="circle" size="small" onClick={() => handleViewDocument(t)} disabled={docLoading === t.id}
                  icon={docLoading === t.id ? <Spin size="small" /> : <Eye size={15} color="var(--ant-color-primary)" />} />
              </Tooltip>
              <Tooltip title="استبدال المستند">
                <Button type="text" shape="circle" size="small" disabled={uploadingDocFor === t.id}
                  onClick={() => { setUploadTarget(t); rowDocInputRef.current?.click() }}
                  icon={uploadingDocFor === t.id ? <Spin size="small" /> : <Paperclip size={15} color="#000" />} />
              </Tooltip>
              <Tooltip title="إزالة المستند">
                <Button type="text" shape="circle" size="small" danger disabled={deletingDocFor === t.id}
                  onClick={() => handleDeleteDocument(t)}
                  icon={deletingDocFor === t.id ? <Spin size="small" /> : <FileX size={15} />} />
              </Tooltip>
            </>
          ) : t.type === 'expense' && (
            <Tooltip title="إرفاق مستند">
              <Button type="text" shape="circle" size="small" disabled={uploadingDocFor === t.id}
                onClick={() => { setUploadTarget(t); rowDocInputRef.current?.click() }}
                icon={uploadingDocFor === t.id ? <Spin size="small" /> : <Paperclip size={15} color="var(--ant-color-primary)" />} />
            </Tooltip>
          )}
          <Tooltip title={t.status === 'approved' ? 'لا يمكن حذف حركة معتمدة' : 'حذف'}>
            <Button type="text" shape="circle" size="small" danger disabled={t.status === 'approved'} onClick={() => setDeleteTarget(t)} icon={<Trash2 size={15} />} />
          </Tooltip>
        </Flex>
      ),
    },
  ]

  return (
    <div>
      <input ref={rowDocInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.pdf"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file && uploadTarget) handleUploadDocument(uploadTarget, file)
          e.target.value = ''
        }} />
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 2 }}>
        <Text strong style={{ fontSize: 16 }}>صندوق النثريات</Text>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام صندوق النثريات">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هو صندوق النثريات؟</Title>
                <Text>مصروفات صغيرة ومتكررة تُصرف نقداً أو من البنك. كل مصروف يُنشئ قيداً محاسبياً (مدين المصروف، دائن الحساب المُختار).</Text></div>
              <div><Title level={5}>الاعتماد</Title>
                <Text>اعتماد المدير هو ما يُنشئ القيد المحاسبي فعلياً.</Text></div>
              <div><Title level={5}>المرفقات</Title>
                <Text>يمكن إرفاق صورة أو ملف PDF لإيصال كل مصروف لتوثيقه.</Text></div>
            </Flex>
          </HelpButton>
                {/* Totals summary */}
          {totals && (
            <div style={{ padding: '8px 14px', marginBottom: 3, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, textAlign: 'center' }}>
              <Text style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#000' }}>إجمالي المصروفات</Text>
              <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: 18, color: 'var(--ant-color-error)' }}>
                {numFmt(totals.expense)}
              </span>
            </div>
          )}
          <Button type="primary" danger size="small" icon={<Banknote size={15} />} onClick={openExpenseDialog}>
                مصروف جديد
              </Button>
          <Badge count={pendingWhatsAppCount} size="small" offset={[-4, 4]}>
            <Button
              size="small"
              icon={importingWhatsApp ? <Spin size="small" /> : <Download size={14} />}
              onClick={handleImportWhatsAppRequests}
              disabled={importingWhatsApp}
            >
              استيراد طلبات واتساب
            </Button>
            
          </Badge>
          <Button size="small" icon={<Settings size={15} />} onClick={() => navigate('/settings?tab=petty-cash')}>
            {hasSourceAccount ? 'الإعدادات' : 'إعداد الحسابات'}
          </Button>
        </Flex>
      </Flex>

      {accountSettingsLoading ? (
        <Flex justify="center" style={{ padding: '64px 0' }}><Spin size="large" /></Flex>
      ) : !hasSourceAccount ? (
        <div style={{ padding: 48, textAlign: 'center', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
          <Text style={{ display: 'block', marginBottom: 16, fontWeight: 700, color: '#000' }}>
            لم يتم إعداد حسابات صندوق النثريات بعد
          </Text>
          <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate('/settings?tab=petty-cash')}>
            إعداد الحسابات
          </Button>
        </div>
      ) : (
        <>
    

          {/* Toolbar */}
          <div style={{ padding: 3, marginBottom: 3, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
          

            <div style={{ margin: '2px 0', borderTop: '1px solid var(--ant-color-border-secondary)' }} />

            <Flex gap={8} align="center" wrap="wrap">
              <Input
                size="small"
                placeholder="بحث بالبيان أو المستفيد أو الحساب..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
                prefix={<Search size={14} color="#000" />}
              />
              <DateInput size="small" value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} style={{ width: 135 }} />
              <DateInput size="small" value={to} onChange={e => { setTo(e.target.value); setPage(1) }} style={{ width: 135 }} />
              <Tooltip title="تصدير PDF">
                <Button type="text" shape="circle" size="small" onClick={handlePdf} disabled={pdfLoading}
                  icon={pdfLoading ? <Spin size="small" /> : <FileDown size={16} />} />
              </Tooltip>
              <Tooltip title="تصدير Excel">
                <Button type="text" shape="circle" size="small" onClick={handleExcel} disabled={excelLoading}
                  icon={excelLoading ? <Spin size="small" /> : <Sheet size={16} />} />
              </Tooltip>
              <Tooltip title="مزامنة حسابات المصروفات مع واتساب">
                <Button type="text" shape="circle" size="small" onClick={handleSyncExpenseAccounts} disabled={syncingAccounts}
                  icon={syncingAccounts ? <Spin size="small" /> : <RefreshCw size={16} />} />
              </Tooltip>
              <Tooltip title="التحقق من اعتمادات واتساب المعلّقة">
                <Button size="small" onClick={handleReconcilePending} disabled={reconcilingPending}
                  icon={reconcilingPending ? <Spin size="small" /> : <CheckCheck size={15} />}>
                  التحقق من الاعتمادات
                </Button>
              </Tooltip>
            </Flex>
          </div>

          <Table
            size="small"
            loading={loading}
            columns={columns}
            dataSource={transactions}
            rowKey="id"
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: t => `الإجمالي: ${t}`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            }}
            locale={{ emptyText: 'لا توجد حركات مطابقة' }}
            rowClassName={t => updatedIds.has(t.id) ? 'highlight-fade' : ''}
            onRow={t => ({
              style: { borderInlineEnd: `3px solid ${t.type === 'expense' ? 'var(--ant-color-error)' : 'var(--ant-color-success)'}` },
            })}
          />
        </>
      )}

      {/* ── Expense Dialog ── */}
      <Modal
        open={expenseOpen}
        onCancel={() => setExpenseOpen(false)}
        width={640}
        centered
        styles={{ content: { borderRadius: 16, padding: 0, overflow: 'hidden' }, header: { padding: '14px 18px 0', margin: 0 }, body: { padding: '10px 18px 0' }, footer: { padding: '10px 18px 14px', margin: 0 } }}
        title={
          <Flex align="center" justify="space-between" gap={10} style={{ paddingInlineEnd: 28 }}>
            <Flex align="center" gap={8}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: 'var(--ant-color-error-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Banknote size={16} color="var(--ant-color-error)" />
              </div>
              <Text strong style={{ fontSize: 14 }}>مصروف نثرية جديد</Text>
            </Flex>
            <DateInput
              value={expenseForm.date}
              onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); expenseAmountRef.current?.focus() } }}
              style={{ width: 130 }}
            />
          </Flex>
        }
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setExpenseOpen(false)}>إلغاء</Button>
            <Button type="primary" danger onClick={handleCreateExpense}
              disabled={creatingExpense || !expenseFormValid || !expenseForm.source_account_id}
              icon={creatingExpense ? <Spin size="small" /> : <Plus size={16} />}>
              حفظ المصروف
            </Button>
          </Flex>
        }
      >
        <div onKeyDown={focusNextField}>
          {/* Amount hero */}
          <div style={{
            background: 'linear-gradient(180deg, var(--ant-color-error-bg) 0%, var(--ant-color-bg-container) 100%)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 12,
            textAlign: 'center',
          }}>
            <Text style={{ fontSize: 11, letterSpacing: 0.3, fontWeight: 700, color: '#000' }}>المبلغ</Text>
            <div style={{
              margin: '2px 0 8px', direction: 'ltr', lineHeight: 1,
              fontSize: 30, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: (expenseForm.compound ? compoundTotal > 0 : !!expenseForm.amount) ? 'var(--ant-color-error)' : '#000',
            }}>
              {numFmt(expenseForm.compound ? compoundTotal : (expenseForm.amount || 0))}
            </div>
            {!expenseForm.compound && (
              <div >
                <InputNumber
                  ref={expenseAmountRef}
                  autoFocus  controls={false}
                  value={expenseForm.amount === '' ? null : Number(expenseForm.amount)}
                  onChange={val => setExpenseForm(f => ({ ...f, amount: val == null ? '' : String(val) }))}
                />
              </div>
            )}
          </div>

          <Row gutter={[12, 10]}>
            <Col span={24}>
              <FieldLabel icon={UserRound}>اسم المستفيد</FieldLabel>
              <Input value={expenseForm.beneficiary_name} onChange={e => setExpenseForm(f => ({ ...f, beneficiary_name: e.target.value }))} />
            </Col>
            <Col span={24}>
              <Flex align="center" justify="space-between">
                <FieldLabel icon={Landmark}>{expenseForm.compound ? 'حسابات المصروف' : 'حساب المصروف'}</FieldLabel>
                <Button
                  type="link" size="small" style={{ padding: 0, height: 'auto', fontSize: 11 }}
                  onClick={() => setExpenseForm(f => ({ ...f, compound: !f.compound }))}
                >
                  {expenseForm.compound ? 'رجوع لحساب واحد' : 'تقسيم على عدة حسابات'}
                </Button>
              </Flex>
              {expenseForm.compound ? (
                <Flex vertical gap={6}>
                  {expenseForm.lines.map((line, i) => (
                    <Flex key={i} gap={6} align="center">
                      <Select
                        showSearch
                        style={{ flex: 1 }}
                        placeholder="اختر حساباً"
                        value={line.contra_account?.id}
                        onChange={v => setExpenseForm(f => ({
                          ...f,
                          lines: f.lines.map((l, idx) => idx === i ? { ...l, contra_account: expenseAccounts.find(a => a.id === v) ?? null } : l),
                        }))}
                        notFoundContent="لا توجد حسابات"
                        filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                        options={expenseAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                      />
                      <InputNumber
                        controls={false}
                        style={{ width: 90 }}
                        placeholder="المبلغ"
                        value={line.amount === '' ? null : Number(line.amount)}
                        onChange={val => setExpenseForm(f => ({
                          ...f,
                          lines: f.lines.map((l, idx) => idx === i ? { ...l, amount: val == null ? '' : String(val) } : l),
                        }))}
                      />
                      <Button
                        type="text" shape="circle" size="small" danger
                        disabled={expenseForm.lines.length <= 2}
                        onClick={() => setExpenseForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))}
                        icon={<Trash2 size={14} />}
                      />
                    </Flex>
                  ))}
                  <Button
                    icon={<Plus size={13} />} size="small"
                    onClick={() => setExpenseForm(f => ({ ...f, lines: [...f.lines, emptyCompoundLine()] }))}
                  >
                    إضافة سطر
                  </Button>
                </Flex>
              ) : (
                <Select
                  showSearch
                  style={{ width: '100%' }}
                  value={expenseForm.contra_account_id?.id}
                  onChange={v => {
                    setExpenseForm(f => ({ ...f, contra_account_id: expenseAccounts.find(a => a.id === v) ?? null }))
                    setTimeout(() => expenseDescriptionRef.current?.focus(), 0)
                  }}
                  notFoundContent="لا توجد حسابات"
                  filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={expenseAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
                />
              )}
            </Col>
            <Col span={24}>
              <FieldLabel icon={Landmark}>من حساب</FieldLabel>
              <Segmented
                block
                value={expenseForm.source_account_id?.id}
                onChange={v => setExpenseForm(f => ({ ...f, source_account_id: [bankAccount, cashAccount].find(a => a?.id === v) ?? null }))}
                options={[bankAccount, cashAccount].filter((a): a is Account => !!a).map(a => ({ value: a.id, label: a.name }))}
              />
            </Col>
            <Col span={24}>
              <FieldLabel icon={FileText}>البيان</FieldLabel>
              <Input.TextArea ref={expenseDescriptionRef} rows={2} placeholder="مثال: مواصلات توصيل طرد" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
            </Col>
            <Col span={24}>
              <div
                className="petty-upload-zone"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', marginBottom: 10 }}
                onClick={() => expenseDocInputRef.current?.click()}
              >
                <Paperclip size={14} color="#000" />
                <Text style={{ fontSize: 12.5, fontWeight: 700, color: '#000' }}>
                  {expenseForm.document ? expenseForm.document.name : 'إرفاق إيصال (اختياري)'}
                </Text>
                <input ref={expenseDocInputRef} type="file" hidden accept=".jpg,.jpeg,.png,.pdf"
                  onChange={e => setExpenseForm(f => ({ ...f, document: e.target.files?.[0] ?? null }))} />
              </div>
            </Col>
          </Row>
        </div>
      </Modal>

      {/* ── Delete Dialog ── */}
      <Modal
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        width={400}
        title="حذف الحركة"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button type="primary" danger onClick={handleDelete} disabled={deleting} icon={deleting ? <Spin size="small" /> : <Trash2 size={16} />}>
              حذف
            </Button>
          </Flex>
        }
      >
        <Text style={{ fontWeight: 700, color: '#000' }}>
          سيتم حذف الحركة والقيد المحاسبي المرتبط بها نهائياً. هذا الإجراء لا يمكن التراجع عنه.
        </Text>
        {deleteTarget && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--ant-color-fill-alter)', borderRadius: 6 }}>
            <Text style={{ fontWeight: 600 }}>
              {deleteTarget.type === 'expense' ? 'مصروف' : 'تغذية'} — {numFmt(deleteTarget.amount)}
            </Text>
          </div>
        )}
      </Modal>

      {/* ── WhatsApp Notification Status Dialog ── */}
      <Modal
        open={!!notificationResults}
        onCancel={() => setNotificationResults(null)}
        width={400}
        title={<Flex align="center" gap={8}><MessageCircle size={18} color="var(--ant-color-success)" /> حالة إرسال إشعار واتساب</Flex>}
        footer={
          <Flex justify="flex-end">
            <Button type="primary" onClick={() => setNotificationResults(null)}>تم</Button>
          </Flex>
        }
      >
        <Flex vertical gap={8} style={{ paddingTop: 8 }}>
          {notificationResults?.map(n => (
            <Flex key={n.role} align="center" gap={12}>
              {n.status === 'sent' && <CheckCircle2 size={16} color="var(--ant-color-success)" />}
              {n.status === 'failed' && <CircleAlert size={16} color="var(--ant-color-error)" />}
              {n.status === 'skipped' && <CircleMinus size={16} color="#000" />}
              <div>
                <Text style={{ display: 'block', fontWeight: 700, color: '#000' }}>{ROLE_LABEL[n.role]} — {STATUS_LABEL[n.status]}</Text>
                {(n.error || n.phone) && (
                  <Text type={n.status === 'failed' ? 'danger' : undefined} style={{ fontSize: 12, fontWeight: 700, color: n.status === 'failed' ? undefined : '#000' }} dir={n.phone ? 'ltr' : undefined}>
                    {n.error ?? n.phone}
                  </Text>
                )}
              </div>
            </Flex>
          ))}
        </Flex>
      </Modal>
    </div>
  )
}
