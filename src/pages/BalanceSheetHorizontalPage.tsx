import { useState } from 'react'
import { Button, Divider, Flex, Spin, Typography } from 'antd'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { ArrowDown, ArrowUp, FileDown, Minus, Sheet } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf, downloadExcel } from '@/api/pdf'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

interface HRow {
  account_id: number
  code: string
  name: string
  from: string
  to: string
  diff: string
  percent: number | null
}

interface HTotal {
  from: string
  to: string
  diff: string
  percent: number | null
}

interface HorizontalData {
  from_as_of: string
  to_as_of: string
  current_assets: HRow[]
  non_current_assets: HRow[]
  current_liabilities: HRow[]
  long_term_liabilities: HRow[]
  equity: HRow[]
  totals: {
    total_current_assets: HTotal
    total_non_current_assets: HTotal
    total_assets: HTotal
    total_current_liabilities: HTotal
    total_long_term_liabilities: HTotal
    total_equity_net: HTotal
    total_liab_equity: HTotal
  }
}

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')
const fmtAccounting = (v: string | number) => {
  const n = Math.round(Number(v))
  return n < 0 ? `(${numFmt(Math.abs(n))})` : numFmt(n)
}
const fmtPercent = (p: number | null) => {
  if (p === null) return '—'
  const rounded = Math.round(p)
  return rounded < 0 ? `(${Math.abs(rounded)})%` : `${rounded}%`
}

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const oneYearAgo = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

function DiffCell({ diff, percent }: { diff: string; percent: number | null }) {
  const n = Number(diff)
  const color = n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : 'var(--ant-color-text-secondary)'
  const Icon = n > 0 ? ArrowUp : n < 0 ? ArrowDown : Minus
  return (
    <>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', width: 120 }}>
        {fmtAccounting(diff)}
      </td>
      <td style={{ padding: 8, width: 110 }}>
        <Flex align="center" justify="center" gap={4} style={{ color, fontWeight: 600 }}>
          <Icon size={13} />
          <span style={{ direction: 'ltr' }}>{fmtPercent(percent)}</span>
        </Flex>
      </td>
    </>
  )
}

function HSectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
      <td colSpan={5} style={{ padding: '6px 12px' }}>
        <Text style={{ fontWeight: 700, color, fontSize: 12 }}>{title}</Text>
      </td>
    </tr>
  )
}

function HDataRow({ row }: { row: HRow }) {
  return (
    <tr style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
      <td style={{ padding: 8 }}>
        <div>{row.name}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{row.code}</Text>
      </td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(row.from)}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(row.to)}</td>
      <DiffCell diff={row.diff} percent={row.percent} />
    </tr>
  )
}

function HSubtotalRow({ label, total, color = 'var(--ant-color-text)' }: { label: string; total: HTotal; color?: string }) {
  return (
    <tr style={{ fontWeight: 700, borderTop: '1px solid var(--ant-color-border-secondary)', background: 'var(--ant-color-fill-alter)' }}>
      <td style={{ padding: 8, color }}>{label}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color }}>{numFmt(total.from)}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color }}>{numFmt(total.to)}</td>
      <DiffCell diff={total.diff} percent={total.percent} />
    </tr>
  )
}

function HGrandTotalRow({ label, total }: { label: string; total: HTotal }) {
  return (
    <tr style={{ fontWeight: 700, background: 'var(--ant-color-primary)' }}>
      <td style={{ padding: 8, color: 'white' }}>{label}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: 'white' }}>{numFmt(total.from)}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: 'white' }}>{numFmt(total.to)}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: 'white' }}>{fmtAccounting(total.diff)}</td>
      <td style={{ padding: 8, color: 'white', textAlign: 'center' }}>{fmtPercent(total.percent)}</td>
    </tr>
  )
}

export default function BalanceSheetHorizontalPage() {
  const toast = useToast()
  const [fromAsOf, setFromAsOf] = useState(oneYearAgo())
  const [fromFyId, setFromFyId] = useState<number | null>(null)
  const [toAsOf, setToAsOf] = useState(today())
  const [toFyId, setToFyId] = useState<number | null>(null)
  const [data, setData] = useState<HorizontalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsLoading, setXlsLoading] = useState(false)

  const buildParams = (overrides: Partial<{ fromAsOf: string; fromFyId: number | null; toAsOf: string; toFyId: number | null }> = {}) => {
    const f = { fromAsOf, fromFyId, toAsOf, toFyId, ...overrides }
    return {
      ...(f.fromFyId ? { from_fiscal_year_id: f.fromFyId } : { from_as_of: f.fromAsOf }),
      ...(f.toFyId ? { to_fiscal_year_id: f.toFyId } : { to_as_of: f.toAsOf }),
    }
  }

  const load = (overrides: Partial<{ fromAsOf: string; fromFyId: number | null; toAsOf: string; toFyId: number | null }> = {}) => {
    setLoading(true)
    api.get<HorizontalData>('/api/reports/balance-sheet/horizontal', { params: buildParams(overrides) })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      await openPdf('/api/reports/balance-sheet/horizontal/pdf', buildParams())
    } finally { setPdfLoading(false) }
  }

  const handleExcel = async () => {
    setXlsLoading(true)
    try {
      await downloadExcel('/api/reports/balance-sheet/horizontal/excel', buildParams(), 'balance-sheet-horizontal.xlsx')
    } catch { toast.error('تعذّر إنشاء ملف Excel') }
    finally { setXlsLoading(false) }
  }

  const handleFromPeriodChange = (fyId: number | null, _from: string, to: string) => {
    setFromFyId(fyId)
    const aof = fyId ? to : fromAsOf
    if (fyId) setFromAsOf(to)
    load({ fromAsOf: aof, fromFyId: fyId })
  }

  const handleToPeriodChange = (fyId: number | null, _from: string, to: string) => {
    setToFyId(fyId)
    const aof = fyId ? to : toAsOf
    if (fyId) setToAsOf(to)
    load({ toAsOf: aof, toFyId: fyId })
  }

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>التحليل الأفقي</Title>
        <HelpButton title="دليل التحليل الأفقي">
          <Flex vertical gap={16}>
            <div><Title level={5}>ما هو التحليل الأفقي؟</Title>
              <Text>يقارن التحليل الأفقي قائمة المركز المالي بين فترتين، لمعرفة مقدار ونسبة التغير في كل حساب.</Text></div>
            <div><Title level={5}>الفرق المطلق</Title>
              <Text>الفرق = القيمة في الفترة الجديدة − القيمة في الفترة السابقة.</Text></div>
            <div><Title level={5}>النسبة المئوية</Title>
              <Text>% الفرق = (الفرق ÷ القيمة في الفترة السابقة) × 100. إذا كانت القيمة السابقة صفراً تُعرض النسبة كـ "—".</Text></div>
          </Flex>
        </HelpButton>
      </Flex>

      {/* Filter */}
      <div style={{ padding: 20, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={20} align="flex-end" wrap="wrap">
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>الفترة السابقة</Text>
            <Flex gap={12} align="flex-end" wrap="wrap">
              <FiscalYearSelector onChange={handleFromPeriodChange} defaultFrom={oneYearAgo()} defaultTo={oneYearAgo()} />
              <Flex vertical gap={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>كما في تاريخ</Text>
                <DateInput value={fromAsOf} onChange={e => setFromAsOf(e.target.value)} />
              </Flex>
            </Flex>
          </Flex>

          <Divider type="vertical" style={{ height: 48 }} />

          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>الفترة الحالية</Text>
            <Flex gap={12} align="flex-end" wrap="wrap">
              <FiscalYearSelector onChange={handleToPeriodChange} defaultFrom={today()} defaultTo={today()} />
              <Flex vertical gap={4}>
                <Text type="secondary" style={{ fontSize: 12 }}>كما في تاريخ</Text>
                <DateInput value={toAsOf} onChange={e => setToAsOf(e.target.value)} />
              </Flex>
            </Flex>
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
          <Button
            icon={xlsLoading ? <Spin size="small" /> : <Sheet size={16} />}
            onClick={handleExcel}
            disabled={xlsLoading || !data}
          >
            تصدير Excel
          </Button>
        </Flex>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {!loading && data && (
        <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 8px' }}>
            <Title level={5} style={{ margin: 0 }}>قائمة المركز المالي — التحليل الأفقي</Title>
            <Text type="secondary">من {data.from_as_of} إلى {data.to_as_of}</Text>
          </div>
          <Divider style={{ margin: 0 }} />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 720, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, textAlign: 'right' }}>البيان</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>{data.from_as_of}</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>{data.to_as_of}</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>الفرق</th>
                  <th style={{ padding: 8, textAlign: 'center' }}>% الفرق</th>
                </tr>
              </thead>
              <tbody>
                <HSectionTitle title="الأصول المتداولة" color="#2563eb" />
                {data.current_assets.map(row => <HDataRow key={row.account_id} row={row} />)}
                <HSubtotalRow label="إجمالي الأصول المتداولة" total={data.totals.total_current_assets} color="#2563eb" />

                <tr><td colSpan={5} style={{ padding: 2 }} /></tr>

                <HSectionTitle title="الأصول الثابتة" color="#2563eb" />
                {data.non_current_assets.map(row => <HDataRow key={row.account_id} row={row} />)}
                <HSubtotalRow label="إجمالي الأصول الثابتة" total={data.totals.total_non_current_assets} color="#2563eb" />

                <HGrandTotalRow label="مجموع الموجودات" total={data.totals.total_assets} />

                <tr><td colSpan={5} style={{ padding: 6 }} /></tr>

                <HSectionTitle title="الخصوم المتداولة" color="#dc2626" />
                {data.current_liabilities.map(row => <HDataRow key={row.account_id} row={row} />)}
                <HSubtotalRow label="إجمالي الخصوم المتداولة" total={data.totals.total_current_liabilities} color="#dc2626" />

                {data.long_term_liabilities.length > 0 && (
                  <>
                    <tr><td colSpan={5} style={{ padding: 2 }} /></tr>
                    <HSectionTitle title="الخصوم طويلة الأجل" color="#dc2626" />
                    {data.long_term_liabilities.map(row => <HDataRow key={row.account_id} row={row} />)}
                    <HSubtotalRow label="إجمالي الخصوم طويلة الأجل" total={data.totals.total_long_term_liabilities} color="#dc2626" />
                  </>
                )}

                <tr><td colSpan={5} style={{ padding: 2 }} /></tr>

                <HSectionTitle title="حقوق الملكية" color="#7c3aed" />
                {data.equity.map(row => <HDataRow key={row.account_id} row={row} />)}
                <HSubtotalRow label="إجمالي حقوق الملكية" total={data.totals.total_equity_net} color="#7c3aed" />

                <HGrandTotalRow label="مجموع المطاليب وحقوق الملكية" total={data.totals.total_liab_equity} />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
