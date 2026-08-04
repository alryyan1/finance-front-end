import { useState } from 'react'
import {
  Button, Col, Divider, Flex, Row, Segmented, Spin, Tag, Typography,
} from 'antd'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { Landmark, FileDown } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

interface BSRow {
  account_id: number
  code: string
  name: string
  balance: string
}

interface BalanceSheetData {
  as_of: string
  assets: BSRow[]
  liabilities: BSRow[]
  equity: BSRow[]
  net_profit: string
  is_profit: boolean
  total_assets: string
  total_liabilities: string
  total_equity: string
  total_equity_net: string
  total_liab_equity: string
  balanced: boolean
  // Form 2
  current_assets: BSRow[]
  non_current_assets: BSRow[]
  current_liabilities: BSRow[]
  long_term_liabilities: BSRow[]
  total_current_assets: string
  total_non_current_assets: string
  total_current_liabilities: string
  total_long_term_liabilities: string
  working_capital: string
  net_assets: string
}

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

// ── Form 1 helpers ─────────────────────────────────────────────────────────────

function Section({
  title, color, rows, subtotal, subtotalLabel, extra,
}: {
  title: string
  color: string
  rows: BSRow[]
  subtotal: string
  subtotalLabel: string
  extra?: { label: string; value: string; color?: string }
}) {
  return (
    <>
      <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
        <td colSpan={2} style={{ padding: '6px 12px' }}>
          <Text style={{ fontWeight: 700, color, fontSize: 12 }}>{title}</Text>
        </td>
      </tr>
      {rows.length === 0 && (
        <tr><td colSpan={2} style={{ padding: 16, color: 'var(--ant-color-text-disabled)', textAlign: 'center', fontStyle: 'italic' }}>لا توجد بيانات</td></tr>
      )}
      {rows.map(row => (
        <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
          <td style={{ padding: 8 }}>
            <div>{row.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.code}</Text>
          </td>
          <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(row.balance)}</td>
        </tr>
      ))}
      {extra && (
        <tr>
          <td style={{ padding: 8, color: extra.color ?? 'var(--ant-color-text)' }}>{extra.label}</td>
          <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: extra.color ?? 'var(--ant-color-text)' }}>{extra.value}</td>
        </tr>
      )}
      <tr style={{ fontWeight: 700, borderTop: '1px solid var(--ant-color-border-secondary)', background: 'var(--ant-color-fill-alter)' }}>
        <td style={{ padding: 8 }}>{subtotalLabel}</td>
        <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color }}>{numFmt(subtotal)}</td>
      </tr>
    </>
  )
}

// ── Form 2 helpers ─────────────────────────────────────────────────────────────

function F2Section({
  title, titleColor = 'var(--ant-color-text)', underline = false, rows, subtotal, subtotalLabel, subtotalColor = 'var(--ant-color-text)', negateValues = false,
}: {
  title: string
  titleColor?: string
  underline?: boolean
  rows: BSRow[]
  subtotal: string
  subtotalLabel: string
  subtotalColor?: string
  negateValues?: boolean
}) {
  return (
    <>
      <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
        <td colSpan={3} style={{ padding: '6px 12px' }}>
          <Text style={{ fontWeight: 700, color: titleColor, textDecoration: underline ? 'underline' : 'none', fontSize: 12 }}>
            {title}
          </Text>
        </td>
      </tr>
      {rows.length === 0 && (
        <tr><td colSpan={3} style={{ padding: 12, color: 'var(--ant-color-text-disabled)', textAlign: 'center', fontStyle: 'italic' }}>لا توجد بيانات — حدد التصنيف الفرعي للحسابات</td></tr>
      )}
      {rows.map(row => (
        <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
          <td style={{ width: 40 }} />
          <td style={{ padding: 8 }}>
            <div>{row.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.code}</Text>
          </td>
          <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', width: 130 }}>
            {numFmt(negateValues ? -Number(row.balance) : row.balance)}
          </td>
        </tr>
      ))}
      <tr style={{ fontWeight: 700, borderTop: '1px solid var(--ant-color-border-secondary)', background: 'var(--ant-color-fill-secondary)' }}>
        <td />
        <td style={{ padding: 8, color: subtotalColor }}>{subtotalLabel}</td>
        <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: subtotalColor }}>
          {numFmt(negateValues ? -Number(subtotal) : subtotal)}
        </td>
      </tr>
    </>
  )
}

function F2SummaryRow({ label, value, color, indent = false, doubleUnderline = false }: {
  label: string; value: string; color?: string; indent?: boolean; doubleUnderline?: boolean
}) {
  return (
    <tr style={{
      fontWeight: 700,
      borderBottom: doubleUnderline ? '3px double var(--ant-color-border-secondary)' : '2px solid var(--ant-color-border-secondary)',
      background: doubleUnderline ? 'var(--ant-color-fill-secondary)' : 'transparent',
    }}>
      <td />
      <td style={{ padding: 8, color, paddingInlineStart: indent ? 32 : 16 }}>{label}</td>
      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color }}>{numFmt(value)}</td>
    </tr>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BalanceSheetPage() {
  const toast = useToast()
  const [asOf, setAsOf]             = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]             = useState<BalanceSheetData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [viewForm, setViewForm]     = useState<'1' | '2'>('1')

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      const params = fiscalYearId ? { fiscal_year_id: fiscalYearId } : { as_of: asOf }
      await openPdf('/api/reports/balance-sheet/pdf', params)
    } finally { setPdfLoading(false) }
  }

  const load = (aof = asOf, fyId = fiscalYearId) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : { as_of: aof }
    api.get<BalanceSheetData>('/api/reports/balance-sheet', { params })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, _from: string, to: string) => {
    setFiscalYearId(fyId)
    const aof = fyId ? to : asOf
    if (fyId) setAsOf(to)
    load(aof, fyId)
  }

  // FiscalYearSelector calls handlePeriodChange on mount, which triggers the initial load

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>الميزانية العمومية</Title>
        <Flex gap={8} align="center">
          {data && (
            <Tag icon={<Landmark size={13} style={{ marginLeft: 4 }} />} color={data.balanced ? 'success' : 'error'}>
              {data.balanced ? 'متوازنة' : 'غير متوازنة'}
            </Tag>
          )}
          <HelpButton title="دليل استخدام الميزانية العمومية">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي الميزانية العمومية؟</Title>
                <Text>الميزانية العمومية تُظهر المركز المالي للشركة في تاريخ محدد: الأصول (ما تملكه) في مقابل الخصوم وحقوق الملكية (ما عليك).</Text></div>
              <div><Title level={5}>المعادلة المحاسبية</Title>
                <Text>الأصول = الخصوم + حقوق الملكية. إذا كانت الميزانية "غير متوازنة" فهناك خطأ في القيود يجب تصحيحه.</Text></div>
              <div><Title level={5}>اختيار التاريخ</Title>
                <Text>تُعرض الميزانية "كما في تاريخ" معين. اختر نهاية الفترة المالية (مثلاً 31/12) للحصول على ميزانية ختامية.</Text></div>
              <div><Title level={5}>تصدير PDF</Title>
                <Text>اضغط زر PDF لتصدير الميزانية كتقرير رسمي قابل للطباعة والمشاركة.</Text></div>
            </Flex>
          </HelpButton>
        </Flex>
      </Flex>

      {/* Filter */}
      <div style={{ padding: 20, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex gap={12} align="flex-end" wrap="wrap">
          <FiscalYearSelector onChange={handlePeriodChange} defaultFrom={today()} defaultTo={today()} />
          <Flex vertical gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>كما في تاريخ</Text>
            <DateInput value={asOf} onChange={e => setAsOf(e.target.value)} />
          </Flex>
          <Button type="primary" onClick={() => load()} disabled={loading}>
            {loading ? <Spin size="small" /> : 'عرض'}
          </Button>

          <Segmented
            value={viewForm}
            onChange={v => setViewForm(v as '1' | '2')}
            options={[
              { value: '1', label: 'الشكل الأول' },
              { value: '2', label: 'الشكل الثاني' },
            ]}
          />

          <Button
            danger
            icon={pdfLoading ? <Spin size="small" /> : <FileDown size={16} />}
            onClick={handlePdf}
            disabled={pdfLoading || !data}
          >
            طباعة PDF
          </Button>
        </Flex>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {/* ── Form 1: Traditional two-column layout ── */}
      {!loading && data && viewForm === '1' && (
        <>
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            {/* Assets */}
            <Col xs={24} md={12}>
              <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 8px' }}>
                  <Title level={5} style={{ margin: 0, color: 'var(--ant-color-primary)' }}>الأصول</Title>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr><th style={{ padding: 8, textAlign: 'right' }}>الحساب</th><th style={{ padding: 8, textAlign: 'left' }}>الرصيد</th></tr>
                  </thead>
                  <tbody>
                    <Section title="الأصول" color="#2563eb" rows={data.assets} subtotal={data.total_assets} subtotalLabel="إجمالي الأصول" />
                  </tbody>
                </table>
              </div>
            </Col>

            {/* Liabilities + Equity */}
            <Col xs={24} md={12}>
              <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px 8px' }}>
                  <Title level={5} style={{ margin: 0, color: 'var(--ant-color-error)' }}>الخصوم وحقوق الملكية</Title>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr><th style={{ padding: 8, textAlign: 'right' }}>الحساب</th><th style={{ padding: 8, textAlign: 'left' }}>الرصيد</th></tr>
                  </thead>
                  <tbody>
                    <Section title="الخصوم" color="#dc2626" rows={data.liabilities} subtotal={data.total_liabilities} subtotalLabel="إجمالي الخصوم" />
                    <tr><td colSpan={2} style={{ padding: 4 }} /></tr>
                    <Section
                      title="حقوق الملكية" color="#7c3aed" rows={data.equity}
                      subtotal={data.total_equity_net} subtotalLabel="إجمالي حقوق الملكية"
                      extra={{
                        label: data.is_profit ? 'صافي الربح' : 'صافي الخسارة',
                        value: numFmt(Math.abs(Number(data.net_profit))),
                        color: data.is_profit ? '#16a34a' : '#dc2626',
                      }}
                    />
                  </tbody>
                </table>
              </div>
            </Col>
          </Row>

          {/* Totals bar */}
          <div style={{ padding: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
            <Divider style={{ margin: '0 0 16px' }} />
            <Flex justify="space-around" wrap="wrap" gap={24}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي الأصول</Text>
                <Title level={5} style={{ margin: 0, direction: 'ltr', color: 'var(--ant-color-primary)' }}>{numFmt(data.total_assets)}</Title>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي الخصوم</Text>
                <Title level={5} style={{ margin: 0, direction: 'ltr', color: 'var(--ant-color-error)' }}>{numFmt(data.total_liabilities)}</Title>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>إجمالي حقوق الملكية</Text>
                <Title level={5} style={{ margin: 0, direction: 'ltr', color: '#7c3aed' }}>{numFmt(data.total_equity_net)}</Title>
              </div>
              <div style={{
                textAlign: 'center', padding: '8px 24px', borderRadius: 8,
                background: data.balanced ? 'var(--ant-color-success)' : 'var(--ant-color-error)',
                color: 'white',
              }}>
                <Text style={{ color: 'white', opacity: 0.85, fontSize: 12 }}>
                  {data.balanced ? 'الميزانية متوازنة' : 'الميزانية غير متوازنة'}
                </Text>
                <Title level={5} style={{ margin: 0, color: 'white', direction: 'ltr' }}>{numFmt(data.total_liab_equity)}</Title>
              </div>
            </Flex>
          </div>
        </>
      )}

      {/* ── Form 2: Working capital format ── */}
      {!loading && data && viewForm === '2' && (
        <div style={{ border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px 8px' }}>
            <Title level={5} style={{ margin: 0 }}>قائمة المركز المالي — الشكل الثاني</Title>
            <Text type="secondary">كما في تاريخ {data.as_of}</Text>
          </div>
          <Divider style={{ margin: 0 }} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th style={{ padding: 8, textAlign: 'right' }}>البيان</th>
                <th style={{ padding: 8, textAlign: 'left', width: 130 }}>المبلغ</th>
              </tr>
            </thead>
            <tbody>
              <F2Section
                title="الأصول المتداولة:" titleColor="#2563eb" underline
                rows={data.current_assets} subtotal={data.total_current_assets}
                subtotalLabel="إجمالي الأصول المتداولة" subtotalColor="#2563eb"
              />
              <tr><td colSpan={3} style={{ padding: 2 }} /></tr>
              <F2Section
                title="يطرح: الخصوم المتداولة:" titleColor="#dc2626" underline
                rows={data.current_liabilities} subtotal={data.total_current_liabilities}
                subtotalLabel="إجمالي الخصوم المتداولة" subtotalColor="#dc2626"
              />
              <F2SummaryRow
                label="رأس المال العامل" value={data.working_capital}
                color={Number(data.working_capital) >= 0 ? '#16a34a' : '#dc2626'}
              />
              <tr><td colSpan={3} style={{ padding: 4 }} /></tr>
              <F2Section
                title="يضاف: الأصول الثابتة وغير الملموسة:" titleColor="#2563eb" underline
                rows={data.non_current_assets} subtotal={data.total_non_current_assets}
                subtotalLabel="إجمالي الأصول الثابتة وغير الملموسة" subtotalColor="#2563eb"
              />
              <F2SummaryRow
                label="إجمالي الأصول"
                value={String(Number(data.working_capital) + Number(data.total_non_current_assets))}
                color="var(--ant-color-primary)"
              />
              <tr><td colSpan={3} style={{ padding: 4 }} /></tr>
              <F2Section
                title="يطرح: الخصوم طويلة الأجل:" titleColor="#dc2626" underline
                rows={data.long_term_liabilities} subtotal={data.total_long_term_liabilities}
                subtotalLabel="إجمالي الخصوم طويلة الأجل" subtotalColor="#dc2626"
              />
              <F2SummaryRow label="صافي الأصول" value={data.net_assets} color="#7c3aed" doubleUnderline />
              <tr><td colSpan={3} style={{ padding: 4 }} /></tr>

              {/* Equity section */}
              <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
                <td colSpan={3} style={{ padding: '6px 12px' }}>
                  <Text style={{ fontWeight: 700, color: '#7c3aed', textDecoration: 'underline', fontSize: 12 }}>حقوق الملكية:</Text>
                </td>
              </tr>
              {data.equity.map(row => (
                <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                  <td />
                  <td style={{ padding: 8 }}>
                    <div>{row.name}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{row.code}</Text>
                  </td>
                  <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(row.balance)}</td>
                </tr>
              ))}
              <tr>
                <td />
                <td style={{ padding: 8, color: data.is_profit ? '#16a34a' : '#dc2626' }}>
                  {data.is_profit ? 'صافي الربح' : 'صافي الخسارة'}
                </td>
                <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: data.is_profit ? '#16a34a' : '#dc2626' }}>
                  {numFmt(Math.abs(Number(data.net_profit)))}
                </td>
              </tr>
              <F2SummaryRow label="صافي حقوق الملكية" value={data.total_equity_net} color="#7c3aed" doubleUnderline />
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
