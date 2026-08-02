import { useEffect, useState } from 'react'
import {
  Button, Divider, Flex, Row, Col, Segmented, Spin, Tooltip, Typography,
} from 'antd'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { useToast } from '@/lib/toast'
import { FileDown, FileText, Rows3, TrendingDown, TrendingUp } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'

const { Title, Text } = Typography

interface ISRow {
  account_id: number
  code: string
  name: string
  type: string
  total_debit: string
  total_credit: string
  net: string
}

interface IncomeStatementData {
  from: string
  to: string
  revenue: ISRow[]
  expenses: ISRow[]
  total_revenue: string
  total_expense: string
  net_profit: string
  is_profit: boolean
}

interface Settings { company_name: string; address?: string; phone?: string }

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const yearStart = () => `${new Date().getFullYear()}-01-01`

// ── Formal statement view ──────────────────────────────────────────────────
function StatementView({ data, settings }: { data: IncomeStatementData; settings: Settings | null }) {
  const netProfit  = Number(data.net_profit)
  const isProfit   = data.is_profit

  return (
    <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
      {/* Report header */}
      <div style={{ textAlign: 'center', padding: '24px 16px', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
        {settings?.company_name && (
          <Title level={5} style={{ marginBottom: 2 }}>{settings.company_name}</Title>
        )}
        <Text strong>قائمة الدخل</Text>
        <br />
        <Text type="secondary">عن الفترة من {data.from} إلى {data.to}</Text>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
            <th style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>البيان</th>
            <th style={{ padding: 8, textAlign: 'left', fontWeight: 700, width: '21%' }}>فرعي</th>
            <th style={{ padding: 8, textAlign: 'left', fontWeight: 700, width: '21%' }}>إجمالي</th>
          </tr>
        </thead>
        <tbody>
          {/* ── Revenue section ── */}
          <tr>
            <td colSpan={3} style={{ background: '#5b21b6', color: 'white', fontWeight: 700, fontSize: 14, padding: '8px 12px' }}>
              الإيرادات
            </td>
          </tr>

          {data.revenue.map(row => (
            <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
              <td style={{ padding: 8 }}>{row.name}</td>
              <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: 'var(--ant-color-success)' }}>{numFmt(row.net)}</td>
              <td style={{ padding: 8 }} />
            </tr>
          ))}

          {data.revenue.length === 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>لا توجد إيرادات</td></tr>
          )}

          <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
            <td style={{ padding: 8, fontWeight: 700 }}>إجمالي الإيرادات</td>
            <td style={{ padding: 8 }} />
            <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontWeight: 700, color: 'var(--ant-color-success)', borderTop: '2px solid var(--ant-color-success-border)' }}>
              {numFmt(data.total_revenue)}
            </td>
          </tr>

          <tr><td colSpan={3} style={{ padding: '6px 0' }} /></tr>

          {/* ── Expenses section ── */}
          <tr>
            <td colSpan={3} style={{ background: '#5b21b6', color: 'white', fontWeight: 700, fontSize: 14, padding: '8px 12px' }}>
              <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.8, marginLeft: 8 }}>يطرح:</span>
              المصروفات
            </td>
          </tr>

          {data.expenses.map(row => (
            <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
              <td style={{ padding: 8 }}>{row.name}</td>
              <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: 'var(--ant-color-error)' }}>{numFmt(row.net)}</td>
              <td style={{ padding: 8 }} />
            </tr>
          ))}

          {data.expenses.length === 0 && (
            <tr><td colSpan={3} style={{ textAlign: 'center', padding: '12px', color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>لا توجد مصروفات</td></tr>
          )}

          <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
            <td style={{ padding: 8, fontWeight: 700 }}>إجمالي المصروفات</td>
            <td style={{ padding: 8 }} />
            <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontWeight: 700, color: 'var(--ant-color-error)', borderTop: '2px solid var(--ant-color-error-border)' }}>
              ({numFmt(data.total_expense)})
            </td>
          </tr>

          <tr><td colSpan={3} style={{ padding: '4px 0' }} /></tr>

          {/* ── Net Profit / Loss ── */}
          <tr style={{
            background: isProfit ? 'var(--ant-color-success-bg)' : 'var(--ant-color-error-bg)',
            borderTop: `2px solid ${isProfit ? 'var(--ant-color-success)' : 'var(--ant-color-error)'}`,
          }}>
            <td style={{ padding: 8, fontWeight: 800, fontSize: 14, color: isProfit ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>
              {isProfit ? 'صافي الربح' : 'صافي الخسارة'}
            </td>
            <td style={{ padding: 8 }} />
            <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontWeight: 800, fontSize: 15, color: isProfit ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>
              {numFmt(Math.abs(netProfit))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function IncomeStatementPage() {
  const toast = useToast()
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]             = useState<IncomeStatementData | null>(null)
  const [settings, setSettings]     = useState<Settings | null>(null)
  const [viewMode, setViewMode]     = useState<'columns' | 'statement'>('columns')
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/income-statement/pdf', { from, to, view_type: viewMode }) }
    finally { setPdfLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<IncomeStatementData>('/api/reports/income-statement', { params })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  const handleFromChange = (f: string) => { setFrom(f); setFiscalYearId(null) }
  const handleToChange   = (t: string) => { setTo(t);   setFiscalYearId(null) }

  useEffect(() => {
    api.get<Settings>('/api/settings').then(r => setSettings(r.data)).catch(() => {})
  }, [])

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>قائمة الدخل</Title>
        <HelpButton title="دليل استخدام قائمة الدخل">
          <Flex vertical gap={16}>
            <div><Title level={5}>ما هي قائمة الدخل؟</Title>
              <Text>قائمة الدخل (حساب الأرباح والخسائر) تُظهر نتيجة النشاط خلال فترة محددة: الإيرادات ناقص المصروفات = صافي الربح أو الخسارة.</Text></div>
            <div><Title level={5}>الإيرادات والمصروفات</Title>
              <Text>الإيرادات: المبالغ المحصّلة من النشاط الرئيسي. المصروفات: التكاليف المتكبّدة لتحقيق تلك الإيرادات. الفرق بينهما هو صافي النتيجة.</Text></div>
            <div><Title level={5}>اختيار الفترة</Title>
              <Text>حدد "من تاريخ" و"إلى تاريخ" لعرض نتائج فترة محددة. يمكن استخدام منتقي السنة المالية للاختيار السريع.</Text></div>
            <div><Title level={5}>طريقة العرض</Title>
              <Text>يمكن التبديل بين العرض الجدولي والعرض التفصيلي. تصدير PDF يُنتج تقريراً رسمياً يحمل اسم الشركة.</Text></div>
          </Flex>
        </HelpButton>
      </Flex>

      {/* Filters */}
      <div style={{ padding: 20, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={12} align="flex-end" wrap="wrap">
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={yearStart()} defaultTo={today()} />
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>من تاريخ</Text>
            <DateInput value={from} onChange={e => handleFromChange(e.target.value)} />
          </Flex>
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>إلى تاريخ</Text>
            <DateInput value={to} onChange={e => handleToChange(e.target.value)} />
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

          {/* View toggle */}
          <div style={{ marginRight: 'auto' }}>
            <Segmented
              value={viewMode}
              onChange={v => setViewMode(v as 'columns' | 'statement')}
              options={[
                { value: 'columns', icon: <Tooltip title="عرض عمودين"><Rows3 size={15} /></Tooltip> },
                { value: 'statement', icon: <Tooltip title="قائمة رسمية (بيان / فرعي / إجمالي)"><FileText size={15} /></Tooltip> },
              ]}
            />
          </div>
        </Flex>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {/* ── Statement view ── */}
      {!loading && data && viewMode === 'statement' && (
        <div style={{ maxWidth: 720 }}>
          <StatementView data={data} settings={settings} />
        </div>
      )}

      {/* ── Columns view (original) ── */}
      {!loading && data && viewMode === 'columns' && (
        <Row gutter={[24, 24]}>
          {/* Revenue */}
          <Col xs={24} md={12}>
            <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
              <Flex align="center" gap={8} style={{ padding: '16px 20px 8px' }}>
                <TrendingUp size={20} color="var(--ant-color-success)" />
                <Title level={5} style={{ margin: 0, color: 'var(--ant-color-success)' }}>الإيرادات</Title>
              </Flex>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, textAlign: 'right', width: 80 }}>الرمز</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>الحساب</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>صافي الإيراد</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenue.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--ant-color-text-secondary)' }}>لا توجد إيرادات</td></tr>
                  )}
                  {data.revenue.map(row => (
                    <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                      <td style={{ padding: 8, color: 'var(--ant-color-text-secondary)', direction: 'ltr', textAlign: 'right' }}>{row.code}</td>
                      <td style={{ padding: 8 }}>{row.name}</td>
                      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: Number(row.net) >= 0 ? 'var(--ant-color-success)' : 'var(--ant-color-error)', fontWeight: 500 }}>
                        {numFmt(row.net)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--ant-color-success-bg)', borderTop: '2px solid var(--ant-color-border-secondary)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: 8, textAlign: 'center' }}>إجمالي الإيرادات</td>
                    <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: 'var(--ant-color-success)' }}>{numFmt(data.total_revenue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Col>

          {/* Expenses */}
          <Col xs={24} md={12}>
            <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
              <Flex align="center" gap={8} style={{ padding: '16px 20px 8px' }}>
                <TrendingDown size={20} color="var(--ant-color-error)" />
                <Title level={5} style={{ margin: 0, color: 'var(--ant-color-error)' }}>المصروفات</Title>
              </Flex>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: 8, textAlign: 'right', width: 80 }}>الرمز</th>
                    <th style={{ padding: 8, textAlign: 'right' }}>الحساب</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>صافي المصروف</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expenses.length === 0 && (
                    <tr><td colSpan={3} style={{ textAlign: 'center', padding: 24, color: 'var(--ant-color-text-secondary)' }}>لا توجد مصروفات</td></tr>
                  )}
                  {data.expenses.map(row => (
                    <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                      <td style={{ padding: 8, color: 'var(--ant-color-text-secondary)', direction: 'ltr', textAlign: 'right' }}>{row.code}</td>
                      <td style={{ padding: 8 }}>{row.name}</td>
                      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: 'var(--ant-color-error)', fontWeight: 500 }}>{numFmt(row.net)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--ant-color-error-bg)', borderTop: '2px solid var(--ant-color-border-secondary)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: 8, textAlign: 'center' }}>إجمالي المصروفات</td>
                    <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', color: 'var(--ant-color-error)' }}>{numFmt(data.total_expense)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Col>

          {/* Net Profit summary */}
          <Col span={24}>
            <div style={{ padding: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
              <Divider style={{ margin: '0 0 16px' }} />
              <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
                <Flex gap={32}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي الإيرادات</Text>
                    <Text style={{ fontWeight: 700, direction: 'ltr', color: 'var(--ant-color-success)' }}>{numFmt(data.total_revenue)}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي المصروفات</Text>
                    <Text style={{ fontWeight: 700, direction: 'ltr', color: 'var(--ant-color-error)' }}>{numFmt(data.total_expense)}</Text>
                  </div>
                </Flex>
                <div style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: data.is_profit ? 'var(--ant-color-success)' : 'var(--ant-color-error)',
                  color: 'white', textAlign: 'center', minWidth: 180,
                }}>
                  <Text style={{ color: 'white', opacity: 0.85, fontSize: 12 }}>
                    {data.is_profit ? 'صافي الربح' : 'صافي الخسارة'}
                  </Text>
                  <Title level={5} style={{ margin: 0, color: 'white', direction: 'ltr' }}>
                    {numFmt(Math.abs(Number(data.net_profit)))}
                  </Title>
                </div>
              </Flex>
            </div>
          </Col>
        </Row>
      )}
    </div>
  )
}
