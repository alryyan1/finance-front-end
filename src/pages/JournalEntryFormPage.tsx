import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Button, Col, Divider, Flex, Input, InputNumber, Row, Select, Spin, Table, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react'
import DateInput from '@/components/common/DateInput'
import { useToast } from '@/lib/toast'
import { aiApi } from '@/api/ai'
import { journalApi } from '@/api/journal'
import { accountsApi } from '@/api/accounts'
import { partiesApi } from '@/api/parties'
import { fiscalYearsApi } from '@/api/fiscalYears'
import type { JournalEntryLinePayload } from '@/types/journal'
import type { Account } from '@/types/account'
import type { Party } from '@/types/party'

const { Title, Text } = Typography

interface LineForm {
  account: Account | null
  party: Party | null
  description: string
  debit: string
  credit: string
}

const emptyLine = (): LineForm => ({
  account: null,
  party: null,
  description: '',
  debit: '',
  credit: '',
})

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

export default function JournalEntryFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()

  const [accounts, setAccounts] = useState<Account[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingEntry, setLoadingEntry] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [date, setDate] = useState(today())
  const [reference, setReference] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()])
  const [dateWarning, setDateWarning] = useState<string | null>(null)

  const [suggestingLine, setSuggestingLine] = useState<number | null>(null)

  const suggestLineDescription = async (i: number) => {
    const line = lines[i]
    setSuggestingLine(i)
    try {
      const suggestion = await aiApi.suggestDescription({
        debit_account:  line.debit  && line.account ? `${line.account.code} ${line.account.name}` : undefined,
        credit_account: line.credit && line.account ? `${line.account.code} ${line.account.name}` : undefined,
        amount: line.debit ? Number(line.debit) : line.credit ? Number(line.credit) : undefined,
      })
      updateLine(i, { description: suggestion })
    } finally {
      setSuggestingLine(null)
    }
  }

  const parentIds = new Set(accounts.map(a => a.parent_id).filter(id => id !== null))

  useEffect(() => {
    Promise.all([accountsApi.list(), partiesApi.list()])
      .then(([accs, parts]) => {
        setAccounts(accs)
        setParties(parts)
      })
      .finally(() => setLoadingMeta(false))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    journalApi.get(Number(id)).then(entry => {
      setDate(entry.date)
      setReference(entry.reference ?? '')
      setDescription(entry.description)
      // lines populated after accounts loaded — handled below
      setLines(
        (entry.lines ?? []).map(l => ({
          account: l.account ? ({ id: l.account.id, code: l.account.code, name: l.account.name } as Account) : null,
          party: l.party ? ({ id: l.party.id, name: l.party.name } as Party) : null,
          description: l.description ?? '',
          debit: l.debit === '0.00' ? '' : String(Number(l.debit)),
          credit: l.credit === '0.00' ? '' : String(Number(l.credit)),
        }))
      )
    }).finally(() => setLoadingEntry(false))
  }, [id, isEdit])

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0

  useEffect(() => {
    if (!date) return
    fiscalYearsApi.checkDate(date).then(res => {
      setDateWarning(res.covered ? null : 'لا توجد فترة محاسبية مفتوحة تغطي هذا التاريخ — سيُحفظ القيد لكن تأكد من صحة التاريخ')
    }).catch(() => setDateWarning(null))
  }, [date])

  const updateLine = (i: number, patch: Partial<LineForm>) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }

  const handleDebitChange = (i: number, val: string) => {
    updateLine(i, { debit: val, credit: val ? '' : lines[i].credit })
  }

  const handleCreditChange = (i: number, val: string) => {
    updateLine(i, { credit: val, debit: val ? '' : lines[i].debit })
  }

  const addLine = () => setLines(prev => [...prev, emptyLine()])

  const removeLine = (i: number) => {
    if (lines.length <= 2) return
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()

    if (!description.trim()) { toast.error('الوصف مطلوب'); return }
    if (!isBalanced) { toast.error('مجموع المدين يجب أن يساوي مجموع الدائن'); return }
    if (lines.some(l => !l.account)) { toast.error('يجب اختيار الحساب لكل سطر'); return }

    const payload = {
      date,
      reference: reference.trim() || null,
      description: description.trim(),
      lines: lines.map(l => ({
        account_id: l.account!.id,
        party_id: l.party?.id ?? null,
        description: l.description.trim() || null,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })) as JournalEntryLinePayload[],
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await journalApi.update(Number(id), payload)
        toast.success('تم تحديث القيد')
      } else {
        await journalApi.create(payload)
        toast.success('تم إنشاء القيد')
      }
      navigate('/transactions')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  if (loadingMeta || loadingEntry) {
    return (
      <Flex justify="center" style={{ padding: '80px 0' }}>
        <Spin size="large" />
      </Flex>
    )
  }

  const numFmt = (n: number) => Math.round(n).toLocaleString('en-US')

  const accountOptions = accounts.map(a => {
    const isRoot = a.parent_id === null
    const isParent = parentIds.has(a.id)
    return {
      value: a.id,
      label: `${a.code} — ${a.name}`,
      disabled: isParent,
      isRoot,
      isParent,
    }
  })

  const partyOptions = parties.map(p => ({ value: p.id, label: p.name }))

  const columns: ColumnsType<LineForm & { __i: number }> = [
    {
      title: 'الحساب',
      width: '38%',
      render: (_: unknown, line, i) => (
        <Select
          showSearch
          allowClear
          style={{ width: '100%' }}
          placeholder="اختر حساباً"
          value={line.account?.id}
          onChange={v => updateLine(i, { account: accounts.find(a => a.id === v) ?? null })}
          notFoundContent="لا توجد نتائج"
          filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          options={accountOptions}
          optionRender={option => {
            const { isRoot, isParent } = option.data as { isRoot: boolean; isParent: boolean }
            return (
              <span style={{
                fontWeight: isRoot ? 700 : isParent ? 600 : 400,
                color: isRoot ? '#1565c0' : isParent ? '#2e7d32' : 'inherit',
                paddingRight: isRoot ? 0 : isParent ? 12 : 24,
                fontSize: 13,
              }}>
                {option.label}
              </span>
            )
          }}
        />
      ),
    },
    {
      title: 'الجهة',
      width: '16%',
      render: (_: unknown, line, i) => (
        <Select
          showSearch
          allowClear
          style={{ width: '100%' }}
          placeholder="اختياري"
          value={line.party?.id}
          onChange={v => {
            const party = parties.find(p => p.id === v) ?? null
            const update: Partial<LineForm> = { party }
            if (party?.account && !line.account) {
              const full = accounts.find(a => a.id === party.account!.id)
              if (full) update.account = full
            }
            updateLine(i, update)
          }}
          notFoundContent="لا توجد نتائج"
          filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          options={partyOptions}
        />
      ),
    },
    {
      title: 'البيان',
      render: (_: unknown, line, i) => (
        <Input
          value={line.description}
          onChange={e => updateLine(i, { description: e.target.value })}
          placeholder="بيان السطر"
          suffix={
            <Tooltip title="اقتراح بيان بالذكاء الاصطناعي">
              <Button
                type="text" size="small" shape="circle"
                disabled={suggestingLine === i}
                onClick={() => suggestLineDescription(i)}
                icon={suggestingLine === i ? <Spin size="small" /> : <Sparkles size={15} color="var(--ant-color-primary)" />}
              />
            </Tooltip>
          }
        />
      ),
    },
    {
      title: 'مدين',
      align: 'left',
      width: '12%',
      render: (_: unknown, line, i) => (
        <InputNumber
          min={0} step={0.01} style={{ width: 110, direction: 'ltr' }}
          value={line.debit === '' ? null : Number(line.debit)}
          onChange={val => handleDebitChange(i, val == null ? '' : String(val))}
        />
      ),
    },
    {
      title: 'دائن',
      align: 'left',
      width: '12%',
      render: (_: unknown, line, i) => (
        <InputNumber
          min={0} step={0.01} style={{ width: 110, direction: 'ltr' }}
          value={line.credit === '' ? null : Number(line.credit)}
          onChange={val => handleCreditChange(i, val == null ? '' : String(val))}
        />
      ),
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, _line, i) => (
        <Tooltip title="حذف السطر">
          <Button
            type="text" shape="circle" size="small" danger
            onClick={() => removeLine(i)}
            disabled={lines.length <= 2}
            icon={<Trash2 size={15} />}
          />
        </Tooltip>
      ),
    },
  ]

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <Flex align="center" gap={16} style={{ marginBottom: 24 }}>
        <Tooltip title="رجوع">
          <Button shape="circle" onClick={() => navigate('/transactions')} icon={<ArrowLeft size={18} />} />
        </Tooltip>
        <Title level={4} style={{ margin: 0, flexGrow: 1 }}>
          {isEdit ? 'تعديل القيد' : 'قيد جديد'}
        </Title>
        <Button
          type="primary"
          htmlType="submit"
          disabled={saving || !isBalanced}
          style={{ minWidth: 120 }}
        >
          {saving ? <Spin size="small" /> : 'حفظ القيد'}
        </Button>
      </Flex>

      {dateWarning && (
        <Alert type="warning" showIcon message={dateWarning} style={{ marginBottom: 16 }} />
      )}

      {/* Entry header fields */}
      <div style={{ padding: 24, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>التاريخ</Text>
            <DateInput value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%' }} />
          </Col>
          <Col xs={24} sm={6}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>المرجع</Text>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="اختياري" />
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>الوصف</Text>
            <Input value={description} onChange={e => setDescription(e.target.value)} required />
          </Col>
        </Row>
      </div>

      {/* Lines table */}
      <div style={{ marginBottom: 16, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
        <Table
          size="small"
          columns={columns}
          dataSource={lines.map((l, i) => ({ ...l, __i: i }))}
          rowKey="__i"
          pagination={false}
        />
        <div style={{ padding: '12px 16px' }}>
          <Button icon={<Plus size={14} />} onClick={addLine} size="small">
            إضافة سطر
          </Button>
        </div>
      </div>

      {/* Balance summary */}
      <div style={{ padding: 16, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex justify="flex-end" gap={32} align="center">
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي المدين</Text>
            <Text style={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalDebit)}</Text>
          </div>
          <Divider type="vertical" style={{ height: 32 }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي الدائن</Text>
            <Text style={{ fontWeight: 700, direction: 'ltr' }}>{numFmt(totalCredit)}</Text>
          </div>
          <Divider type="vertical" style={{ height: 32 }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>الفرق</Text>
            <Text style={{ fontWeight: 700, direction: 'ltr' }} type={isBalanced ? 'success' : 'danger'}>
              {numFmt(Math.abs(totalDebit - totalCredit))}
            </Text>
          </div>
          <div style={{
            fontWeight: 700, padding: '4px 16px', borderRadius: 6,
            background: isBalanced ? 'var(--ant-color-success-bg)' : 'var(--ant-color-error-bg)',
            color: isBalanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)',
          }}>
            {isBalanced ? 'متوازن' : 'غير متوازن'}
          </div>
        </Flex>
      </div>
    </form>
  )
}
