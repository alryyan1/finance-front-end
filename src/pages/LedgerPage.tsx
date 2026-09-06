import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button, Flex, Segmented, Select, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { useToast } from '@/lib/toast'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import { partiesApi } from '@/api/parties'
import { openPdf, downloadExcel } from '@/api/pdf'
import type { Account } from '@/types/account'
import type { Party } from '@/types/party'
import { BookOpen, FileDown, Rows3, Sheet } from 'lucide-react'
import FiscalYearSelector from '@/components/FiscalYearSelector'

const { Title, Text } = Typography

interface LedgerRow {
  entry_id: number
  date: string
  reference: string | null
  entry_description: string
  line_description: string | null
  party_name: string | null
  debit: string
  credit: string
  balance: string
  balance_side: 'debit' | 'credit'
}

interface LedgerData {
  account: { id: number; code: string; name: string; type: string }
  from: string
  to: string
  opening_balance: string
  opening_side: 'debit' | 'credit'
  closing_balance: string
  closing_side: 'debit' | 'credit'
  rows: LedgerRow[]
  totals: { debit: string; credit: string }
}

const numFmt = (v: string) => Math.round(Number(v)).toLocaleString('en-US')

const sideLbl  = (s: 'debit' | 'credit') => (s === 'debit' ? 'م' : 'د')
const sideEn   = (s: 'debit' | 'credit') => (s === 'debit' ? 'Dr' : 'Cr')

// ── General Ledger View ───────────────────────────────────────────────────────

const GL_BLUE   = '#0d2b6e'
const GL_RED    = '#c0001a'
const GL_HEADER = '#1a3a8f'

function GeneralLedgerView({ data, onRowClick }: { data: LedgerData; onRowClick: (id: number) => void }) {
  const th = (i: number, label: string): React.CSSProperties => ({
    background: GL_HEADER, color: '#fff', fontWeight: 700,
    fontFamily: 'inherit', fontSize: 14,
    border: '1px solid #2756c5',
    width: i === 2 ? 'auto' : i === 0 ? 95 : i === 1 ? 80 : 110,
    padding: '8px 6px',
    textAlign: i >= 3 ? 'right' : 'center',
  })

  return (
    <div style={{ fontFamily: '"Times New Roman", serif', maxWidth: 900, margin: '0 auto' }}>

      {/* Title bar */}
      <Flex style={{ border: `2px solid ${GL_BLUE}`, borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '10px 0',
          background: `linear-gradient(135deg, ${GL_HEADER} 0%, #2756c5 100%)`,
          borderInlineEnd: `2px solid ${GL_BLUE}`,
        }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 1, fontFamily: 'inherit' }}>
            General Ledger
          </span>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', background: 'linear-gradient(135deg, #2756c5 0%, #1a3a8f 100%)' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, fontFamily: 'inherit' }}>
            دفتر الأستاذ العام
          </span>
        </div>
      </Flex>

      {/* Account info */}
      <Flex justify="space-between" align="center" style={{
        border: `2px solid ${GL_BLUE}`, borderTop: 'none',
        padding: '10px 24px', background: '#f5f8ff',
      }}>
        <span style={{ color: GL_RED, fontWeight: 700, fontSize: 15, fontFamily: 'inherit', direction: 'ltr' }}>
          Account No. :&nbsp;
          <span style={{ letterSpacing: 2 }}>{data.account.code}</span>
        </span>
        <span style={{ color: GL_RED, fontWeight: 700, fontSize: 15, fontFamily: 'inherit', direction: 'ltr' }}>
          Account Name :&nbsp;{data.account.name}
        </span>
      </Flex>

      {/* Table */}
      <div style={{ border: `2px solid ${GL_BLUE}`, borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
          <thead>
            <tr>
              {['Date', 'Trx. No.', 'Description', 'Debit', 'Credit', 'Balance'].map((h, i) => (
                <th key={h} style={th(i, h)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance */}
            <tr style={{ background: '#f0f4ff' }}>
              <td style={{ textAlign: 'center', fontFamily: 'inherit', border: '1px solid #cdd6f0', color: '#555', padding: 8 }}>{data.from}</td>
              <td style={{ border: '1px solid #cdd6f0' }} />
              <td style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, border: '1px solid #cdd6f0', padding: 8 }}>Opening Balance</td>
              <td style={{ border: '1px solid #cdd6f0' }} />
              <td style={{ border: '1px solid #cdd6f0' }} />
              <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', fontSize: 14, border: '1px solid #cdd6f0', padding: '8px 12px' }}>
                {numFmt(data.opening_balance)}
                <span style={{ marginLeft: 4, fontSize: 11, color: '#666' }}>{sideEn(data.opening_side)}</span>
              </td>
            </tr>

            {data.rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#888', fontFamily: 'inherit', border: '1px solid #cdd6f0' }}>No transactions in this period</td></tr>
            )}

            {data.rows.map((row, i) => (
              <tr key={i} onClick={() => onRowClick(row.entry_id)} style={{ cursor: 'pointer' }}>
                <td style={{ textAlign: 'center', fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', color: '#333', padding: 8 }}>{row.date}</td>
                <td style={{ textAlign: 'center', fontFamily: 'inherit', fontSize: 13, border: '1px solid #cdd6f0', color: '#555', padding: 8 }}>{row.reference || '—'}</td>
                <td style={{ fontFamily: 'inherit', fontSize: 13, border: '1px solid #cdd6f0', padding: '8px 12px' }}>
                  <div style={{ fontWeight: 600 }}>{row.entry_description}</div>
                  {row.line_description && <div style={{ fontSize: 11, color: '#888' }}>{row.line_description}</div>}
                  {row.party_name && <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic' }}>{row.party_name}</div>}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', padding: '8px 12px', color: Number(row.debit) > 0 ? '#0d2b6e' : '#bbb' }}>
                  {Number(row.debit) > 0 ? numFmt(row.debit) : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'inherit', fontSize: 13, direction: 'ltr', border: '1px solid #cdd6f0', padding: '8px 12px', color: Number(row.credit) > 0 ? '#0d2b6e' : '#bbb' }}>
                  {Number(row.credit) > 0 ? numFmt(row.credit) : '—'}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, direction: 'ltr', border: '1px solid #cdd6f0', padding: '8px 12px' }}>
                  {numFmt(row.balance)}
                  <span style={{ marginLeft: 4, fontSize: 11, color: '#666' }}>{sideEn(row.balance_side)}</span>
                </td>
              </tr>
            ))}

            {data.rows.length > 0 && (
              <tr style={{ background: '#e8eeff' }}>
                <td colSpan={3} style={{ textAlign: 'center', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, padding: 8 }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, padding: '8px 12px' }}>
                  {numFmt(data.totals.debit)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, padding: '8px 12px' }}>
                  {numFmt(data.totals.credit)}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'inherit', color: GL_RED, direction: 'ltr', border: `1px solid ${GL_BLUE}`, borderTop: `2px solid ${GL_BLUE}`, padding: '8px 12px', fontSize: 15 }}>
                  {numFmt(data.closing_balance)}
                  <span style={{ marginLeft: 4, fontSize: 11 }}>{sideEn(data.closing_side)}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ledgerColumns: ColumnsType<LedgerRow> = [
  {
    title: 'التاريخ', dataIndex: 'date', width: 110, align: 'center',
    render: (v: string) => <span style={{ direction: 'ltr', color: 'var(--ant-color-text-secondary)' }}>{v}</span>,
  },
  {
    title: 'مرجع', dataIndex: 'reference', width: 90, align: 'center',
    render: (v: string | null) => <Text type="secondary">{v || '—'}</Text>,
  },
  {
    title: 'البيان', dataIndex: 'entry_description', width: 240,
    render: (_: string, row) => (
      <div>
        <div>{row.entry_description}</div>
        {row.line_description && <Text type="secondary" style={{ fontSize: 12 }}>{row.line_description}</Text>}
      </div>
    ),
  },
  {
    title: 'الطرف', dataIndex: 'party_name', width: 150, align: 'center',
    render: (v: string | null) => <Text type="secondary">{v || '—'}</Text>,
  },
  {
    title: 'مدين', dataIndex: 'debit', width: 130, align: 'right',
    render: (v: string) => Number(v) > 0
      ? <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(v)}</span>
      : <span style={{ color: 'var(--ant-color-text-disabled)' }}>—</span>,
  },
  {
    title: 'دائن', dataIndex: 'credit', width: 130, align: 'right',
    render: (v: string) => Number(v) > 0
      ? <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(v)}</span>
      : <span style={{ color: 'var(--ant-color-text-disabled)' }}>—</span>,
  },
  {
    title: 'الرصيد', dataIndex: 'balance', width: 150, align: 'right',
    render: (v: string, row) => (
      <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {numFmt(v)}
        <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(row.balance_side)}</span>
      </span>
    ),
  },
]

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function LedgerPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [accounts, setAccounts]       = useState<Account[]>([])
  const [parties, setParties]         = useState<Party[]>([])
  const [account, setAccount]         = useState<Account | null>(null)
  const [party, setParty]             = useState<Party | null>(null)
  const [from, setFrom]               = useState(yearStart())
  const [to, setTo]                   = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]               = useState<LedgerData | null>(null)
  const [loading, setLoading]         = useState(false)
  const [pdfLoading, setPdfLoading]   = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [view, setView]               = useState<'arabic' | 'gl'>('arabic')

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t); setData(null)
  }

  const handlePdf = async () => {
    if (!account) return
    setPdfLoading(true)
    try {
      await openPdf('/api/reports/ledger/pdf', {
        account_id: account.id,
        from,
        to,
        view,
        ...(party ? { party_id: party.id } : {}),
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      })
    } finally { setPdfLoading(false) }
  }

  const handleExcel = async () => {
    if (!account) return
    setExcelLoading(true)
    try {
      await downloadExcel('/api/reports/ledger/excel', {
        account_id: account.id,
        from,
        to,
        ...(party ? { party_id: party.id } : {}),
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      }, `كشف-حساب-${account.code}.xlsx`)
    } catch {
      toast.error('تعذّر إنشاء ملف Excel')
    } finally { setExcelLoading(false) }
  }

  useEffect(() => {
    Promise.all([accountsApi.list(), partiesApi.list()])
      .then(([accs, parts]) => { setAccounts(accs); setParties(parts) })
      .finally(() => setLoadingAccounts(false))
  }, [])

  const load = () => {
    if (!account) return
    setLoading(true)
    api.get<LedgerData>('/api/reports/ledger', {
      params: {
        account_id: account.id,
        from,
        to,
        ...(party ? { party_id: party.id } : {}),
        ...(fiscalYearId ? { fiscal_year_id: fiscalYearId } : {}),
      },
    })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>كشف حساب</Title>
        <HelpButton title="دليل استخدام كشف الحساب">
          <Flex vertical gap={16}>
            <div><Title level={5}>ما هو كشف الحساب؟</Title>
              <Text>كشف الحساب يُظهر جميع الحركات (مدين/دائن) لحساب محدد خلال فترة زمنية، مع الرصيد التراكمي بعد كل حركة.</Text></div>
            <div><Title level={5}>اختيار الحساب</Title>
              <Text>اختر الحساب من القائمة المنسدلة (يمكن البحث بالاسم أو الرمز). حدد الفترة الزمنية ثم اضغط "عرض" لتحميل البيانات.</Text></div>
            <div><Title level={5}>التصفية بالطرف</Title>
              <Text>يمكن تصفية الحركات بطرف محدد (عميل/مورد) لعرض كشف حساب مفصّل للتعاملات مع تلك الجهة فقط.</Text></div>
            <div><Title level={5}>الرصيد الافتتاحي والختامي</Title>
              <Text>يُعرض الرصيد الافتتاحي في بداية الفترة والرصيد الختامي في نهايتها. يمكن تصدير الكشف كـ PDF.</Text></div>
          </Flex>
        </HelpButton>
      </Flex>

      {/* Filters */}
      <div style={{ padding: 20, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={12} align="flex-end" wrap="wrap">
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={yearStart()} defaultTo={today()} />
          <Select
            showSearch
            allowClear
            loading={loadingAccounts}
            style={{ minWidth: 280 }}
            placeholder="الحساب"
            value={account?.id}
            onChange={v => { setAccount(accounts.find(a => a.id === v) ?? null); setData(null) }}
            notFoundContent="لا توجد نتائج"
            filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            options={accounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
          />
          <Select
            showSearch
            allowClear
            style={{ minWidth: 200 }}
            placeholder="الطرف (اختياري)"
            value={party?.id}
            onChange={v => { setParty(parties.find(p => p.id === v) ?? null); setData(null) }}
            notFoundContent="لا توجد نتائج"
            filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            options={parties.map(p => ({ value: p.id, label: p.name }))}
          />
          <DateInput value={from} onChange={e => { setFrom(e.target.value); setFiscalYearId(null) }} />
          <DateInput value={to} onChange={e => { setTo(e.target.value); setFiscalYearId(null) }} />
          <Button type="primary" onClick={load} disabled={!account || loading}>
            {loading ? <Spin size="small" /> : 'عرض'}
          </Button>
          <Button
            danger
            icon={pdfLoading ? <Spin size="small" /> : <FileDown size={16} />}
            onClick={handlePdf}
            disabled={pdfLoading || !data}
          >
            طباعة PDF
          </Button>
          <Button
            icon={excelLoading ? <Spin size="small" /> : <Sheet size={16} color="var(--ant-color-success)" />}
            onClick={handleExcel}
            disabled={excelLoading || !data}
          >
            تصدير Excel
          </Button>

          {data && (
            <Segmented
              value={view}
              onChange={v => setView(v as 'arabic' | 'gl')}
              options={[
                { value: 'arabic', label: <Flex align="center" gap={4}><Rows3 size={14} /> عربي</Flex> },
                { value: 'gl', label: <Flex align="center" gap={4}><BookOpen size={14} /> General Ledger</Flex> },
              ]}
            />
          )}
        </Flex>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {!loading && data && view === 'gl' && (
        <GeneralLedgerView data={data} onRowClick={id => navigate(`/transactions/${id}/edit`)} />
      )}

      {!loading && data && view === 'arabic' && (
        <>
          {/* Account info bar */}
          <Flex gap={12} align="center" style={{ marginBottom: 16 }}>
            <Text style={{ fontWeight: 700, fontSize: 17 }}>
              {data.account.code} — {data.account.name}
            </Text>
            <Tag>رصيد افتتاحي: {numFmt(data.opening_balance)} {sideLbl(data.opening_side)}</Tag>
            <Tag color="blue">رصيد ختامي: {numFmt(data.closing_balance)} {sideLbl(data.closing_side)}</Tag>
          </Flex>

          <Table<LedgerRow>
            size="small"
            bordered
            sticky
            columns={ledgerColumns}
            dataSource={data.rows}
            rowKey={(_, i) => String(i)}
            pagination={false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'لا توجد حركات في هذه الفترة' }}
            onRow={row => ({
              style: { cursor: 'pointer' },
              onClick: () => navigate(`/transactions/${row.entry_id}/edit`),
            })}
            summary={() => (
              <>
                <Table.Summary fixed="top">
                  <Table.Summary.Row style={{ background: 'var(--ant-color-fill-alter)' }}>
                    <Table.Summary.Cell index={0}>
                      <span style={{ direction: 'ltr', color: 'var(--ant-color-text-secondary)' }}>{data.from}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2}>
                      <Text type="secondary" italic>رصيد افتتاحي</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} />
                    <Table.Summary.Cell index={4} />
                    <Table.Summary.Cell index={5} />
                    <Table.Summary.Cell index={6} align="right">
                      <span style={{ direction: 'ltr', fontWeight: 600 }}>
                        {numFmt(data.opening_balance)}
                        <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(data.opening_side)}</span>
                      </span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
                {data.rows.length > 0 && (
                  <Table.Summary fixed="bottom">
                    <Table.Summary.Row style={{ background: 'var(--ant-color-fill-alter)', fontWeight: 700 }}>
                      <Table.Summary.Cell index={0} colSpan={4} align="center">الإجمالي</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.totals.debit)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.totals.credit)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <span style={{ direction: 'ltr', color: 'var(--ant-color-primary)' }}>
                          {numFmt(data.closing_balance)}
                          <span style={{ marginLeft: 4, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(data.closing_side)}</span>
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              </>
            )}
          />
        </>
      )}

      {!loading && !data && (
        <Flex align="center" justify="center" style={{ padding: '80px 0', color: 'var(--ant-color-text-secondary)' }}>
          <Text type="secondary">اختر حساباً لعرض الكشف</Text>
        </Flex>
      )}
    </div>
  )
}
