import { useState } from 'react'
import {
  Button, Flex, Spin, Tag, Typography,
} from 'antd'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { CheckCircle2, FileDown, Landmark, Sheet } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf, downloadExcel } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

interface EquityMovementRow {
  account_id: number
  code: string
  name: string
  contributions: string
  withdrawals: string
  net: string
}

interface StatementOfEquityData {
  from: string
  to: string
  beginning_balance: string
  net_income: string
  is_profit: boolean
  movements: EquityMovementRow[]
  total_contributions: string
  total_withdrawals: string
  net_movement: string
  ending_balance: string
  matches_balance_sheet: boolean
}

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function StatementOfEquityPage() {
  const toast = useToast()
  const [from, setFrom]                 = useState(yearStart())
  const [to, setTo]                     = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]                 = useState<StatementOfEquityData | null>(null)
  const [loading, setLoading]           = useState(false)
  const [pdfLoading, setPdfLoading]     = useState(false)
  const [xlsLoading, setXlsLoading]     = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try { await openPdf('/api/reports/statement-of-equity/pdf', { from, to }) }
    finally { setPdfLoading(false) }
  }

  const handleExcel = async () => {
    setXlsLoading(true)
    try {
      const params = fiscalYearId ? { fiscal_year_id: fiscalYearId } : { from, to }
      await downloadExcel('/api/reports/statement-of-equity/excel', params, 'statement-of-equity.xlsx')
    } catch { toast.error('تعذّر إنشاء ملف Excel') }
    finally { setXlsLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<StatementOfEquityData>('/api/reports/statement-of-equity', { params })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  const handleFromChange = (f: string) => { setFrom(f); setFiscalYearId(null) }
  const handleToChange   = (t: string) => { setTo(t); setFiscalYearId(null) }

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>قائمة التغير في حقوق الملكية</Title>
        <Flex gap={8} align="center">
          {data && (
            <Tag icon={<Landmark size={13} style={{ marginLeft: 4 }} />} color={data.matches_balance_sheet ? 'success' : 'error'}>
              {data.matches_balance_sheet ? 'متطابقة مع الميزانية العمومية' : 'غير متطابقة'}
            </Tag>
          )}
          <HelpButton title="دليل استخدام قائمة التغير في حقوق الملكية">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي قائمة التغير في حقوق الملكية؟</Title>
                <Text>تُظهر هذه القائمة كيف تغيّر رصيد حقوق الملكية خلال فترة معينة: الرصيد الافتتاحي، زائد صافي الربح (أو ناقص الخسارة)، زائد/ناقص أي حركة على حسابات حقوق الملكية (كإضافة رأس مال أو سحوبات)، ليصل إلى الرصيد الختامي.</Text></div>
              <div><Title level={5}>حركة حسابات حقوق الملكية</Title>
                <Text>الإضافات تمثل زيادة في رأس المال أو حسابات حقوق الملكية خلال الفترة، والمسحوبات تمثل ما تم سحبه منها.</Text></div>
              <div><Title level={5}>التحقق من التطابق</Title>
                <Text>يجب أن يتطابق الرصيد الختامي هنا مع إجمالي حقوق الملكية في الميزانية العمومية كما في نهاية نفس الفترة.</Text></div>
            </Flex>
          </HelpButton>
        </Flex>
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
        <div style={{ maxWidth: 820, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', padding: '20px 16px', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
            <Text strong>قائمة التغير في حقوق الملكية</Text>
            <br />
            <Text type="secondary">عن الفترة من {data.from} إلى {data.to}</Text>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
                <td style={{ padding: 10 }}>رصيد حقوق الملكية في بداية الفترة</td>
                <td style={{ padding: 10, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.beginning_balance)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
                <td style={{ padding: 10, color: data.is_profit ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>
                  {data.is_profit ? 'يضاف: صافي الربح' : 'يخصم: صافي الخسارة'}
                </td>
                <td style={{ padding: 10, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: data.is_profit ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>
                  {numFmt(Math.abs(Number(data.net_income)))}
                </td>
              </tr>

              {data.movements.length > 0 && (
                <>
                  <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
                    <td colSpan={2} style={{ padding: '8px 10px' }}>
                      <Text style={{ fontWeight: 700, fontSize: 12 }}>حركة حسابات حقوق الملكية خلال الفترة</Text>
                    </td>
                  </tr>
                  <tr>
                    <th style={{ padding: 8, textAlign: 'right', fontWeight: 500, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>الحساب</th>
                    <th style={{ padding: 8, textAlign: 'left', fontWeight: 500, fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>الصافي</th>
                  </tr>
                  {data.movements.map(row => (
                    <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                      <td style={{ padding: 8 }}>
                        <div>{row.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {row.code} — إضافات {numFmt(row.contributions)} / مسحوبات {numFmt(row.withdrawals)}
                        </Text>
                      </td>
                      <td style={{ padding: 8, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums', color: Number(row.net) >= 0 ? 'var(--ant-color-success)' : 'var(--ant-color-error)' }}>
                        {numFmt(row.net)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--ant-color-fill-alter)', fontWeight: 700, borderTop: '1px solid var(--ant-color-border-secondary)', borderBottom: '1px solid var(--ant-color-border-secondary)' }}>
                    <td style={{ padding: 10 }}>صافي حركة حقوق الملكية</td>
                    <td style={{ padding: 10, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.net_movement)}</td>
                  </tr>
                </>
              )}

              <tr style={{ fontWeight: 800, fontSize: 15, background: 'var(--ant-color-fill-secondary)', borderTop: '2px solid var(--ant-color-border-secondary)' }}>
                <td style={{ padding: 12 }}>رصيد حقوق الملكية في نهاية الفترة</td>
                <td style={{ padding: 12, direction: 'ltr', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.ending_balance)}</td>
              </tr>
            </tbody>
          </table>

          <Flex align="center" gap={8} style={{ padding: '10px 16px', borderTop: '1px solid var(--ant-color-border-secondary)' }}>
            {data.matches_balance_sheet
              ? <CheckCircle2 size={15} color="var(--ant-color-success)" />
              : <CheckCircle2 size={15} color="var(--ant-color-error)" />}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {data.matches_balance_sheet
                ? 'الرصيد الختامي يطابق إجمالي حقوق الملكية في الميزانية العمومية'
                : 'الرصيد الختامي لا يطابق إجمالي حقوق الملكية في الميزانية العمومية — راجع القيود'}
            </Text>
          </Flex>
        </div>
      )}
    </div>
  )
}
