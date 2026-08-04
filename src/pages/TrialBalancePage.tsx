import { useState } from 'react'
import {
  Button, Flex, Segmented, Spin, Table, Tag, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { FileDown, Scale } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

type ViewType = 'totals' | 'balances' | 'both'

interface TrialBalanceRow {
  account_id: number
  code: string
  name: string
  type: string
  opening_balance: string
  opening_side: 'debit' | 'credit'
  total_debit: string
  total_credit: string
  balance: string
  balance_side: 'debit' | 'credit'
  balance_debit: string
  balance_credit: string
}

interface TrialBalanceData {
  from: string
  to: string
  rows: TrialBalanceRow[]
  totals: {
    opening_balance: string
    opening_side: 'debit' | 'credit'
    debit: string
    credit: string
    balance_debit: string
    balance_credit: string
    balanced: boolean
  }
}

type DisplayRow =
  | { key: string; isGroupHeader: true; type: string }
  | (TrialBalanceRow & { key: string; isGroupHeader?: false })

const TYPE_LABELS: Record<string, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
  revenue:   'إيرادات',
  expense:   'مصروفات',
}

const TYPE_COLORS: Record<string, string> = {
  asset:     'blue',
  liability: 'error',
  equity:    'purple',
  revenue:   'success',
  expense:   'warning',
}

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')
const fmtCell = (v: string) => (Number(v) > 0 ? numFmt(v) : '—')
const sideLbl = (s: 'debit' | 'credit') => (s === 'debit' ? 'م' : 'د')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

// Cell renderer that collapses to a single spanning cell on group-header rows
function cell(render: (row: TrialBalanceRow) => React.ReactNode) {
  return (_: unknown, record: DisplayRow) => {
    if (record.isGroupHeader) return { children: null, props: { colSpan: 0 } }
    return render(record)
  }
}

export default function TrialBalancePage() {
  const toast = useToast()
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [viewType, setViewType]     = useState<ViewType>('both')
  const [data, setData]             = useState<TrialBalanceData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      const params = fiscalYearId ? { fiscal_year_id: fiscalYearId, view_type: viewType } : { from, to, view_type: viewType }
      await openPdf('/api/reports/trial-balance/pdf', params)
    } finally { setPdfLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<TrialBalanceData>('/api/reports/trial-balance', { params })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  // FiscalYearSelector calls handlePeriodChange on mount, which triggers the initial load

  const showTotals   = viewType === 'totals'   || viewType === 'both'
  const showBalances = viewType === 'balances' || viewType === 'both'

  const dataSource: DisplayRow[] = data
    ? (['asset', 'liability', 'equity', 'revenue', 'expense'] as const).flatMap(type => {
        const rows = data.rows.filter(r => r.type === type)
        if (rows.length === 0) return []
        return [
          { key: `hdr-${type}`, isGroupHeader: true as const, type },
          ...rows.map(r => ({ ...r, key: String(r.account_id) })),
        ]
      })
    : []

  const columns: ColumnsType<DisplayRow> = [
    {
      title: 'الرمز', dataIndex: 'code', width: 84,
      render: (v: string, record) => record.isGroupHeader
        ? { children: <Text style={{ fontWeight: 700, fontSize: 12 }} type="secondary">{TYPE_LABELS[record.type]}</Text>, props: { colSpan: 4 + (showTotals ? 2 : 0) + (showBalances ? 2 : 0) } }
        : <Text style={{ fontFamily: 'monospace', fontSize: 12, direction: 'ltr' }} type="secondary">{v}</Text>,
    },
    {
      title: 'اسم الحساب', dataIndex: 'name',
      render: (v: string, record) => record.isGroupHeader ? { children: null, props: { colSpan: 0 } } : v,
    },
    {
      title: 'النوع', width: 88,
      render: (_: unknown, record) => record.isGroupHeader
        ? { children: null, props: { colSpan: 0 } }
        : <Tag color={TYPE_COLORS[record.type]} style={{ marginInlineEnd: 0 }}>{TYPE_LABELS[record.type]}</Tag>,
    },
    {
      title: 'رصيد أول الفترة', width: 130, align: 'right' as const,
      render: cell(row => (
        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
          {numFmt(row.opening_balance)}
          <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(row.opening_side)}</span>
        </span>
      )),
    },
    ...(showTotals ? [{
      title: 'حركة الفترة',
      children: [
        {
          title: 'مدين', dataIndex: 'total_debit', width: 110, align: 'right' as const,
          render: cell(row => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtCell(row.total_debit)}</span>),
        },
        {
          title: 'دائن', dataIndex: 'total_credit', width: 110, align: 'right' as const,
          render: cell(row => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtCell(row.total_credit)}</span>),
        },
      ],
    }] : []),
    ...(showBalances ? [{
      title: 'الأرصدة',
      children: [
        {
          title: 'مدين', dataIndex: 'balance_debit', width: 110, align: 'right' as const,
          render: cell(row => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtCell(row.balance_debit)}</span>),
        },
        {
          title: 'دائن', dataIndex: 'balance_credit', width: 110, align: 'right' as const,
          render: cell(row => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtCell(row.balance_credit)}</span>),
        },
      ],
    }] : []),
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>ميزان المراجعة</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {{
              totals:   'بالمجاميع',
              balances: 'بالأرصدة',
              both:     'بالمجاميع والأرصدة',
            }[viewType]}
          </Text>
        </div>
        <Flex gap={8} align="center">
          {data && (
            <Tag icon={<Scale size={13} style={{ marginLeft: 4 }} />} color={data.totals.balanced ? 'success' : 'error'}>
              {data.totals.balanced ? 'متوازن' : 'غير متوازن'}
            </Tag>
          )}
          <HelpButton title="دليل استخدام ميزان المراجعة">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هو ميزان المراجعة؟</Title>
                <Text>ميزان المراجعة يُظهر مجموع المدين والدائن لكل حساب في فترة محددة. يُستخدم للتحقق من توازن القيود المحاسبية وصحة البيانات.</Text></div>
              <div><Title level={5}>أنواع العرض</Title>
                <Text>بالمجاميع: يُظهر إجمالي المدين والدائن. بالأرصدة: يُظهر الرصيد الصافي فقط. بالمجاميع والأرصدة: يجمع الاثنين معاً.</Text></div>
              <div><Title level={5}>التوازن</Title>
                <Text>إجمالي المدين يجب أن يساوي إجمالي الدائن دائماً. إذا ظهرت "غير متوازن" فهناك قيد غير مكتمل يحتاج مراجعة.</Text></div>
              <div><Title level={5}>تصدير PDF</Title>
                <Text>اضغط زر PDF لتصدير الميزان بصيغة قابلة للطباعة. يمكن اختيار الفترة الزمنية قبل التصدير.</Text></div>
            </Flex>
          </HelpButton>
        </Flex>
      </Flex>

      {/* Filters */}
      <div style={{ padding: 14, marginBottom: 16, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={20} align="flex-end" wrap="wrap">
          <Flex gap={10} align="flex-end" wrap="wrap">
            <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={yearStart()} defaultTo={today()} />
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>من تاريخ</Text>
              <DateInput value={from} onChange={e => setFrom(e.target.value)} />
            </Flex>
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>إلى تاريخ</Text>
              <DateInput value={to} onChange={e => setTo(e.target.value)} />
            </Flex>
            <Button type="primary" onClick={() => load()} disabled={loading}>
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
          </Flex>

          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>نوع الميزان</Text>
            <Segmented
              size="middle"
              value={viewType}
              onChange={v => setViewType(v as ViewType)}
              options={[
                { label: 'بالمجاميع', value: 'totals' },
                { label: 'بالأرصدة', value: 'balances' },
                { label: 'بالمجاميع والأرصدة', value: 'both' },
              ]}
            />
          </Flex>
        </Flex>
      </div>

      <Table
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={dataSource}
        rowKey="key"
        pagination={false}
        sticky
        rowClassName={record => record.isGroupHeader ? 'tb-group-row' : ''}
        locale={{ emptyText: 'لا توجد بيانات في هذه الفترة' }}
        summary={() => {
          if (!data || data.rows.length === 0) return null
          const openingStart  = 3
          const totalsStart   = openingStart + 1
          const balancesStart = totalsStart + (showTotals ? 2 : 0)
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ fontWeight: 700, background: 'var(--ant-color-fill-alter)' }}>
                <Table.Summary.Cell index={0} colSpan={3} align="center">الإجمالي</Table.Summary.Cell>
                <Table.Summary.Cell index={openingStart} align="right">
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {numFmt(data.totals.opening_balance)}
                    <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 400, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(data.totals.opening_side)}</span>
                  </span>
                </Table.Summary.Cell>
                {showTotals && (
                  <>
                    <Table.Summary.Cell index={totalsStart} align="right">
                      <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--ant-color-primary)' }}>{numFmt(data.totals.debit)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={totalsStart + 1} align="right">
                      <span style={{
                        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                        color: viewType === 'totals'
                          ? (data.totals.balanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)')
                          : 'var(--ant-color-primary)',
                      }}>
                        {numFmt(data.totals.credit)}{viewType === 'totals' && (data.totals.balanced ? ' ✓' : ' ✗')}
                      </span>
                    </Table.Summary.Cell>
                  </>
                )}
                {showBalances && (
                  <>
                    <Table.Summary.Cell index={balancesStart} align="right">
                      <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--ant-color-success)' }}>{numFmt(data.totals.balance_debit)}</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={balancesStart + 1} align="right">
                      <span style={{
                        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
                        color: data.totals.balanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)',
                      }}>
                        {numFmt(data.totals.balance_credit)}{data.totals.balanced ? ' ✓' : ' ✗'}
                      </span>
                    </Table.Summary.Cell>
                  </>
                )}
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </div>
  )
}
