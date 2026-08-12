import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Flex, Input, Modal, Select, Spin, Table, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import FirebaseImportDialog from '@/components/FirebaseImportDialog'
import {
  ArrowUpDown, Ban, CircleCheck, CloudDownload, FileDown, FilterX, FileSpreadsheet, Pencil, Search, Sheet, Trash2,
} from 'lucide-react'
import { journalApi } from '@/api/journal'
import { openPdf, downloadExcel } from '@/api/pdf'
import type { JournalEntry, JournalEntryLine } from '@/types/journal'
import FiscalYearSelector from '@/components/FiscalYearSelector'

const { Text } = Typography

const fmt = (v: string | null | undefined) => v ? Math.round(Number(v)).toLocaleString('en-US') : '—'

const debitLines  = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.debit)  > 0)
const creditLines = (lines: JournalEntryLine[]) => lines.filter(l => Number(l.credit) > 0)

function BayanCell({ entry }: { entry: JournalEntry }) {
  const lines       = entry.lines ?? []
  const debits      = debitLines(lines)
  const credits     = creditLines(lines)
  const multiDebit  = debits.length  > 1
  const multiCredit = credits.length > 1
  const debitTotal  = debits.reduce((s, l)  => s + Number(l.debit),  0)
  const creditTotal = credits.reduce((s, l) => s + Number(l.credit), 0)

  const Line = ({ prefix, name, amount, indent, color }: {
    prefix: string; name: string; amount: string; indent: boolean; color: string
  }) => (
    <Flex align="baseline" gap={4} style={{ paddingLeft: indent ? 12 : 0, direction: 'rtl' }}>
      <Text style={{ color, fontWeight: 700, flexShrink: 0, fontSize: 15 }}>{prefix}</Text>
      <Text style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 15 }}>{name}</Text>
      <Text style={{ color, fontWeight: 600, marginLeft: 'auto', paddingLeft: 8, direction: 'ltr', flexShrink: 0, fontSize: 15 }}>{amount}</Text>
    </Flex>
  )

  return (
    <div style={{ padding: '4px 0' }}>
      {multiDebit && (
        <Text style={{ color: 'var(--ant-color-primary)', fontWeight: 700, display: 'block', direction: 'rtl', fontSize: 16 }}>
          من مذكورين · {debitTotal.toLocaleString('en-US')}
        </Text>
      )}
      {debits.map((l, i) => (
        <Line key={`d-${i}`} prefix="من ح/" name={l.account?.name ?? '—'} amount={fmt(l.debit)} indent={multiDebit} color="var(--ant-color-primary)" />
      ))}
      {multiCredit && (
        <Text style={{ color: 'var(--ant-color-success)', fontWeight: 700, display: 'block', direction: 'rtl', marginTop: 2, fontSize: 16 }}>
          إلى مذكورين · {creditTotal.toLocaleString('en-US')}
        </Text>
      )}
      {credits.map((l, i) => (
        <Line key={`c-${i}`} prefix="إلى ح/" name={l.account?.name ?? '—'} amount={fmt(l.credit)} indent={multiCredit || !multiDebit} color="var(--ant-color-success)" />
      ))}
      <Text type="secondary" style={{ fontStyle: 'italic', display: 'block', marginTop: 2, fontSize: 15 }}>
        {entry.description}
      </Text>
    </div>
  )
}

export default function TransactionsPage() {
  const navigate = useNavigate()
  const [entries,      setEntries]      = useState<JournalEntry[]>([])
  const [loading,      setLoading]      = useState(true)
  const [reversing,    setReversing]    = useState<number | null>(null)
  const [togglingId,   setTogglingId]   = useState<number | null>(null)
  const [confirmEntry, setConfirmEntry] = useState<JournalEntry | null>(null)
  const [pdfLoading,   setPdfLoading]   = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [importOpen,   setImportOpen]   = useState(false)

  const [search, setSearch] = useState('')
  const [from,   setFrom]   = useState('')
  const [to,     setTo]     = useState('')
  const [status, setStatus] = useState('all')

  const load = (params?: { search: string; from: string; to: string; status: string }) => {
    setLoading(true)
    const p = params ?? { search, from, to, status }
    journalApi.list({
      search: p.search  || undefined,
      from:   p.from    || undefined,
      to:     p.to      || undefined,
      status: p.status !== 'all' ? p.status : undefined,
    }).then(setEntries).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handlePeriodChange = (_fyId: number | null, f: string, t: string) => {
    setFrom(f); setTo(t)
    load({ search, from: f, to: t, status })
  }

  const handleReset = () => {
    setSearch(''); setFrom(''); setTo(''); setStatus('all')
    load({ search: '', from: '', to: '', status: 'all' })
  }

  const handleDelete = async (entry: JournalEntry) => {
    if (!confirm(`حذف القيد: ${entry.description}؟`)) return
    try {
      await journalApi.remove(entry.id)
      setEntries(prev => prev.filter(e => e.id !== entry.id))
    } catch {
      // error toast is shown globally by the axios response interceptor
    }
  }

  const handleTogglePost = async (entry: JournalEntry) => {
    setTogglingId(entry.id)
    try {
      const updated = await journalApi.togglePost(entry.id)
      setEntries(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e))
    } catch {
      // error toast is shown globally by the axios response interceptor
    } finally {
      setTogglingId(null)
    }
  }

  const handleReverse = async () => {
    if (!confirmEntry) return
    setReversing(confirmEntry.id)
    setConfirmEntry(null)
    try {
      await journalApi.reverse(confirmEntry.id)
      load()
    } catch {
      // error toast is shown globally by the axios response interceptor
    } finally {
      setReversing(null)
    }
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await openPdf('/api/journal-entries/pdf', {
        from:   from   || undefined,
        to:     to     || undefined,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
      })
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExcel = async () => {
    setExcelLoading(true)
    try {
      await downloadExcel('/api/journal-entries/excel', {
        from:   from   || undefined,
        to:     to     || undefined,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
      }, 'journal-entries.xlsx')
    } finally {
      setExcelLoading(false)
    }
  }

  const grandTotal  = entries.reduce((s, e) => s + Number(e.lines_sum_debit ?? 0), 0)
  const postedCount = entries.filter(e =>  e.is_posted).length
  const draftCount  = entries.filter(e => !e.is_posted).length
  const hasFilters  = !!(search || from || to || status !== 'all')

  const columns: ColumnsType<JournalEntry> = [
    {
      title: '#',
      width: 110,
      align: 'center',
      render: (_: unknown, entry) => (
        <div>
          <Text style={{ fontWeight: 700, direction: 'ltr', display: 'block', fontSize: 16 }}>#{entry.id}</Text>
          {entry.reference && <Text type="secondary" style={{ direction: 'ltr', display: 'block', fontSize: 15 }}>{entry.reference}</Text>}
          {entry.reversal_of && <Text style={{ color: 'var(--ant-color-warning)', display: 'block', fontSize: 15 }}>↩ عكسي</Text>}
          {entry.reversed_by && <Text style={{ color: 'var(--ant-color-error)', display: 'block', fontSize: 15 }}>↩ معكوس</Text>}
        </div>
      ),
    },
    {
      title: 'التاريخ',
      width: 105,
      align: 'center',
      render: (_: unknown, entry) => (
        <div>
          <Text style={{ direction: 'ltr', display: 'block', fontWeight: 500, fontSize: 16 }}>{entry.date}</Text>
          <Flex align="center" gap={4} justify="center" style={{ marginTop: 2 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: entry.is_posted ? 'var(--ant-color-success)' : 'var(--ant-color-warning)',
              flexShrink: 0, display: 'inline-block',
            }} />
            <Text style={{ color: entry.is_posted ? 'var(--ant-color-success)' : 'var(--ant-color-warning)', fontWeight: 600, fontSize: 15 }}>
              {entry.is_posted ? 'مرحَّل' : 'مسودة'}
            </Text>
          </Flex>
        </div>
      ),
    },
    { title: 'البيان', render: (_: unknown, entry) => <BayanCell entry={entry} /> },
    {
      title: 'دائن', width: 115, align: 'center',
      render: (_: unknown, entry) => <Text style={{ color: 'var(--ant-color-success)', fontWeight: 600, fontSize: 15 }}>{fmt(entry.lines_sum_debit)}</Text>,
    },
    {
      title: 'مدين', width: 115, align: 'center',
      render: (_: unknown, entry) => <Text style={{ color: 'var(--ant-color-primary)', fontWeight: 600, fontSize: 15 }}>{fmt(entry.lines_sum_debit)}</Text>,
    },
    {
      title: 'إجراءات', width: 130, align: 'center',
      render: (_: unknown, entry) => (
        <Flex align="center" justify="center" onClick={e => e.stopPropagation()}>
          <Tooltip title={entry.is_posted ? 'إلغاء الترحيل' : 'ترحيل'}>
            <Button
              type="text" shape="circle" size="small"
              disabled={togglingId === entry.id}
              onClick={() => handleTogglePost(entry)}
              icon={togglingId === entry.id ? <Spin size="small" /> : entry.is_posted ? <Ban size={15} color="var(--ant-color-warning)" /> : <CircleCheck size={15} color="var(--ant-color-success)" />}
            />
          </Tooltip>
          <Tooltip title={entry.reversed_by ? 'تم العكس مسبقاً' : 'عكس القيد'}>
            <Button
              type="text" shape="circle" size="small"
              disabled={!entry.is_posted || !!entry.reversed_by || reversing === entry.id}
              onClick={() => setConfirmEntry(entry)}
              icon={reversing === entry.id ? <Spin size="small" /> : <ArrowUpDown size={15} />}
            />
          </Tooltip>
          <Tooltip title="تعديل">
            <Button
              type="text" shape="circle" size="small" color="primary" variant="text"
              disabled={entry.is_posted}
              onClick={() => navigate(`/transactions/${entry.id}/edit`)}
              icon={<Pencil size={15} />}
            />
          </Tooltip>
          <Tooltip title="حذف">
            <Button
              type="text" shape="circle" size="small" danger
              disabled={entry.is_posted}
              onClick={() => handleDelete(entry)}
              icon={<Trash2 size={15} />}
            />
          </Tooltip>
        </Flex>
      ),
    },
  ]

  return (
    <Flex vertical gap={12}>

      {/* ── Header ── */}
      <Flex align="center" gap={12}>
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 16 }}>القيود المحاسبية</Text>
          {!loading && (
            <Flex gap={6} style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 15 }}>{entries.length} قيد</Text>
              {postedCount > 0 && <Text style={{ color: 'var(--ant-color-success)', fontSize: 15 }}>· {postedCount} مرحَّل</Text>}
              {draftCount  > 0 && <Text style={{ color: 'var(--ant-color-warning)', fontSize: 15 }}>· {draftCount} مسودة</Text>}
            </Flex>
          )}
        </div>
        <HelpButton title="دليل استخدام القيود المحاسبية">
          <Flex vertical gap={16}>
            <div><Text strong>ما هو القيد المحاسبي؟</Text><br />
              <Text>القيد المحاسبي هو تسجيل عملية مالية وفق مبدأ القيد المزدوج: مجموع المدين = مجموع الدائن دائماً.</Text></div>
            <div><Text strong>الترحيل والمسودة</Text><br />
              <Text>القيد المسودة لا يؤثر على الأرصدة. اضغط أيقونة الترحيل لتأكيد القيد. لا يمكن تعديل القيد بعد الترحيل.</Text></div>
            <div><Text strong>القيد العكسي</Text><br />
              <Text>لإلغاء تأثير قيد مرحّل، استخدم "قيد عكسي" — يُنشئ النظام قيداً جديداً بمبالغ معكوسة.</Text></div>
          </Flex>
        </HelpButton>
        <Button size="small" icon={<CloudDownload size={16} />} onClick={() => setImportOpen(true)}>
          Firebase
        </Button>
      </Flex>

      {/* ── Filters ── */}
      <div style={{ padding: '8px 12px', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={8} wrap="wrap" align="flex-end">
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={from} defaultTo={to} />
          <Input
            size="small"
            placeholder="بحث..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            style={{ width: 180 }}
            prefix={<Search size={14} color="var(--ant-color-text-disabled)" />}
          />
          <DateInput size="small" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 135 }} />
          <DateInput size="small" value={to} onChange={e => setTo(e.target.value)} style={{ width: 135 }} />
          <Select
            size="small" value={status} onChange={setStatus} style={{ minWidth: 95 }}
            options={[
              { value: 'all', label: 'الكل' },
              { value: 'posted', label: 'مرحَّل' },
              { value: 'draft', label: 'مسودة' },
            ]}
          />
          <Button type="primary" size="small" onClick={() => load()}>بحث</Button>
          {hasFilters && (
            <Tooltip title="إلغاء الفلاتر">
              <Button type="text" shape="circle" size="small" onClick={handleReset} icon={<FilterX size={16} />} />
            </Tooltip>
          )}
          <div style={{ flex: 1 }} />
          <Tooltip title="طباعة PDF">
            <Button type="text" shape="circle" size="small" danger onClick={handlePdf} disabled={pdfLoading || entries.length === 0}
              icon={pdfLoading ? <Spin size="small" /> : <FileDown size={16} />} />
          </Tooltip>
          <Tooltip title="تصدير Excel">
            <Button type="text" shape="circle" size="small" disabled={excelLoading || entries.length === 0}
              onClick={handleExcel}
              icon={excelLoading ? <Spin size="small" /> : <FileSpreadsheet size={16} color="var(--ant-color-success)" />} />
          </Tooltip>
          <Tooltip title="فتح كجدول بيانات">
            <Button
              type="text" shape="circle" size="small" disabled={entries.length === 0}
              onClick={() => {
                const p = new URLSearchParams()
                if (from)             p.set('from',   from)
                if (to)               p.set('to',     to)
                if (search)           p.set('search', search)
                if (status !== 'all') p.set('status', status)
                const qs = p.toString()
                navigate(`/journal-spreadsheet${qs ? `?${qs}` : ''}`)
              }}
              icon={<Sheet size={16} />}
            />
          </Tooltip>
        </Flex>
      </div>

      {/* ── Table ── */}
      <Table
        size="small"
        loading={loading}
        columns={columns}
        dataSource={entries}
        rowKey="id"
        pagination={false}
        locale={{ emptyText: 'لا توجد قيود' }}
        onRow={entry => ({
          style: {
            cursor: 'pointer',
            borderInlineStart: `3px solid ${entry.is_posted ? 'var(--ant-color-success)' : 'var(--ant-color-warning)'}`,
          },
          onClick: () => navigate(`/transactions/${entry.id}/edit`),
        })}
        summary={() => entries.length > 0 ? (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3} align="center">
              <Text strong style={{ fontSize: 15 }}>الإجمالي</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="center">
              <Text strong style={{ color: 'var(--ant-color-success)', fontSize: 15, direction: 'ltr', display: 'block' }}>
                {grandTotal.toLocaleString('en-US')}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="center">
              <Text strong style={{ color: 'var(--ant-color-primary)', fontSize: 15, direction: 'ltr', display: 'block' }}>
                {grandTotal.toLocaleString('en-US')}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} />
          </Table.Summary.Row>
        ) : null}
      />

      {/* ── Reverse confirmation ── */}
      <Modal
        open={!!confirmEntry}
        onCancel={() => setConfirmEntry(null)}
        width={400}
        title="تأكيد عكس القيد"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button size="small" onClick={() => setConfirmEntry(null)}>إلغاء</Button>
            <Button size="small" type="primary" style={{ background: 'var(--ant-color-warning)' }} onClick={handleReverse} icon={<ArrowUpDown size={16} />}>
              تأكيد العكس
            </Button>
          </Flex>
        }
      >
        <Text style={{ fontSize: 13 }}>سيتم إنشاء قيد عكسي يلغي أثر:</Text>
        <div style={{ marginTop: 8, padding: 10, background: 'var(--ant-color-fill-alter)', borderRadius: 6, direction: 'rtl' }}>
          <Text style={{ fontWeight: 600, display: 'block' }}>{confirmEntry?.description}</Text>
          <Text type="secondary" style={{ fontSize: 15 }}>{confirmEntry?.date}</Text>
        </div>
        <Text type="secondary" style={{ marginTop: 8, fontSize: 15, display: 'block' }}>
          يُرحَّل تلقائياً بتاريخ اليوم — لا يمكن التراجع.
        </Text>
      </Modal>

      <FirebaseImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => { setImportOpen(false); load() }}
      />
    </Flex>
  )
}
