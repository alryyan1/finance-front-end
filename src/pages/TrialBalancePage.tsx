import { useState } from 'react'
import {
  Button, Flex, Segmented, Spin, Tag, Typography,
} from 'antd'
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
    debit: string
    credit: string
    balance_debit: string
    balance_credit: string
    balanced: boolean
  }
}

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

const numFmt = (v: string) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

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
    try { await openPdf('/api/reports/trial-balance/pdf', { from, to, view_type: viewType }) }
    finally { setPdfLoading(false) }
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

  const grouped = data
    ? (['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map(type => ({
        type,
        rows: data.rows.filter(r => r.type === type),
      })).filter(g => g.rows.length > 0)
    : []

  // Column config per view type
  const showTotals   = viewType === 'totals'   || viewType === 'both'
  const showBalances = viewType === 'balances' || viewType === 'both'

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>ميزان المراجعة</Title>
          <Text type="secondary">
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
      <div style={{ padding: 20, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={16} align="flex-end" wrap="wrap">
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

        {/* View type toggle */}
        <div style={{ marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            نوع الميزان
          </Text>
          <Segmented
            value={viewType}
            onChange={v => setViewType(v as ViewType)}
            options={[
              { label: 'بالمجاميع', value: 'totals' },
              { label: 'بالأرصدة', value: 'balances' },
              { label: 'بالمجاميع والأرصدة', value: 'both' },
            ]}
          />
        </div>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {!loading && data && (
        <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
                <th style={headCell('right', 80)}>الرمز</th>
                <th style={headCell('right')}>اسم الحساب</th>
                <th style={headCell('right', 80)}>النوع</th>
                {showTotals && (
                  <th colSpan={2} style={{ ...headCell('center'), borderBottom: '2px solid var(--ant-color-primary)', color: 'var(--ant-color-primary)' }}>
                    المجاميع
                  </th>
                )}
                {showBalances && (
                  <th colSpan={2} style={{ ...headCell('center'), borderBottom: '2px solid var(--ant-color-success)', color: 'var(--ant-color-success)' }}>
                    الأرصدة
                  </th>
                )}
              </tr>
              <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
                <th /><th /><th />
                {showTotals && (
                  <>
                    <th style={{ ...headCell('left', 120), color: 'var(--ant-color-primary)' }}>مجموع مدين</th>
                    <th style={{ ...headCell('left', 120), color: 'var(--ant-color-primary)' }}>مجموع دائن</th>
                  </>
                )}
                {showBalances && (
                  <>
                    <th style={{ ...headCell('left', 120), color: 'var(--ant-color-success)' }}>رصيد مدين</th>
                    <th style={{ ...headCell('left', 120), color: 'var(--ant-color-success)' }}>رصيد دائن</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {grouped.map(({ type, rows }) => (
                <>
                  <tr key={`hdr-${type}`} style={{ background: 'var(--ant-color-fill-secondary)' }}>
                    <td colSpan={3 + (showTotals ? 2 : 0) + (showBalances ? 2 : 0)} style={{ padding: '6px 12px' }}>
                      <Text style={{ fontWeight: 700, fontSize: 12 }} type="secondary">{TYPE_LABELS[type]}</Text>
                    </td>
                  </tr>

                  {rows.map(row => (
                    <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                      <td style={{ ...bodyCell('right'), color: 'var(--ant-color-text-secondary)', direction: 'ltr', textAlign: 'right' }}>
                        {row.code}
                      </td>
                      <td style={bodyCell('right')}>{row.name}</td>
                      <td style={bodyCell('right')}>
                        <Tag color={TYPE_COLORS[row.type]}>{TYPE_LABELS[row.type]}</Tag>
                      </td>
                      {showTotals && (
                        <>
                          <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(row.total_debit) > 0 ? numFmt(row.total_debit) : '—'}
                          </td>
                          <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(row.total_credit) > 0 ? numFmt(row.total_credit) : '—'}
                          </td>
                        </>
                      )}
                      {showBalances && (
                        <>
                          <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {Number(row.balance_debit) > 0 ? numFmt(row.balance_debit) : '—'}
                          </td>
                          <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                            {Number(row.balance_credit) > 0 ? numFmt(row.balance_credit) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </>
              ))}

              {/* Totals row */}
              {data.rows.length > 0 && (
                <tr style={{ background: 'var(--ant-color-fill-alter)', borderTop: '2px solid var(--ant-color-border-secondary)', fontWeight: 700 }}>
                  <td colSpan={3} style={{ ...bodyCell('center'), fontWeight: 700 }}>الإجمالي</td>
                  {showTotals && (
                    <>
                      <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--ant-color-primary)', fontWeight: 700 }}>
                        {numFmt(data.totals.debit)}
                      </td>
                      <td style={{
                        ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                        color: viewType === 'totals'
                          ? (data.totals.balanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)')
                          : 'var(--ant-color-primary)',
                      }}>
                        {numFmt(data.totals.credit)}
                        {viewType === 'totals' && (data.totals.balanced ? ' ✓' : ' ✗')}
                      </td>
                    </>
                  )}
                  {showBalances && (
                    <>
                      <td style={{ ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: 'var(--ant-color-success)', fontWeight: 700 }}>
                        {numFmt(data.totals.balance_debit)}
                      </td>
                      <td style={{
                        ...bodyCell('left'), direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                        color: data.totals.balanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)',
                      }}>
                        {numFmt(data.totals.balance_credit)}
                        {data.totals.balanced ? ' ✓' : ' ✗'}
                      </td>
                    </>
                  )}
                </tr>
              )}

              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...bodyCell('center'), padding: '48px 12px', color: 'var(--ant-color-text-secondary)' }}>
                    لا توجد بيانات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function headCell(align: 'right' | 'center' | 'left', width?: number): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align, fontWeight: 600, fontSize: 12, color: 'var(--ant-color-text-secondary)', width }
}
function bodyCell(align: 'right' | 'center' | 'left'): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align }
}
