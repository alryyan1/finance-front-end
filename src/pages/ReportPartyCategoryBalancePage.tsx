import { useState } from 'react'
import { Button, Flex, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import DateInput from '@/components/common/DateInput'
import { FileDown, Sheet } from 'lucide-react'
import api from '@/lib/axios'
import { openPdf, downloadExcel } from '@/api/pdf'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

interface PartyCategoryBalanceRow {
  category_id: number
  category_name: string
  debit: string
  credit: string
  balance: string
  balance_side: 'debit' | 'credit'
}

interface PartyCategoryBalanceData {
  from: string
  to: string
  rows: PartyCategoryBalanceRow[]
  totals: {
    debit: string
    credit: string
    balance: string
    balance_side: 'debit' | 'credit'
  }
}

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')
const sideLbl = (s: 'debit' | 'credit') => (s === 'debit' ? 'م' : 'د')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function ReportPartyCategoryBalancePage() {
  const toast = useToast()
  const [from, setFrom]             = useState(yearStart())
  const [to, setTo]                 = useState(today())
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [data, setData]             = useState<PartyCategoryBalanceData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [xlsLoading, setXlsLoading] = useState(false)

  const handlePdf = async () => {
    setPdfLoading(true)
    try {
      const params = fiscalYearId ? { fiscal_year_id: fiscalYearId } : { from, to }
      await openPdf('/api/reports/party-category-balance/pdf', params)
    } finally { setPdfLoading(false) }
  }

  const handleExcel = async () => {
    setXlsLoading(true)
    try {
      const params = fiscalYearId ? { fiscal_year_id: fiscalYearId } : { from, to }
      await downloadExcel('/api/reports/party-category-balance/excel', params, 'party-category-balance.xlsx')
    } catch { toast.error('تعذّر إنشاء ملف Excel') }
    finally { setXlsLoading(false) }
  }

  const load = (f = from, t = to, fyId = fiscalYearId) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : { from: f, to: t }
    api.get<PartyCategoryBalanceData>('/api/reports/party-category-balance', { params })
      .then(r => setData(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, f: string, t: string) => {
    setFiscalYearId(fyId); setFrom(f); setTo(t)
    load(f, t, fyId)
  }

  // FiscalYearSelector calls handlePeriodChange on mount, which triggers the initial load

  const columns: ColumnsType<PartyCategoryBalanceRow> = [
    {
      title: 'التصنيف', dataIndex: 'category_name',
      render: (v: string, row) => row.category_id === 0
        ? <Text type="secondary" style={{ fontStyle: 'italic' }}>{v}</Text>
        : v,
    },
    {
      title: 'مدين', dataIndex: 'debit', width: 140, align: 'right' as const,
      render: (v: string) => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(v)}</span>,
    },
    {
      title: 'دائن', dataIndex: 'credit', width: 140, align: 'right' as const,
      render: (v: string) => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(v)}</span>,
    },
    {
      title: 'الرصيد', dataIndex: 'balance', width: 150, align: 'right' as const,
      render: (v: string, row) => (
        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {numFmt(v)}
          <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 400, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(row.balance_side)}</span>
        </span>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>أرصدة فئات الأطراف</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>إجمالي المدين والدائن والرصيد لكل تصنيف من تصنيفات الأطراف خلال الفترة المحددة</Text>
        </div>
        <HelpButton title="دليل استخدام تقرير أرصدة فئات الأطراف">
          <Flex vertical gap={16}>
            <div><Title level={5}>ما هو هذا التقرير؟</Title>
              <Text>يجمع هذا التقرير حركة القيود المرحّلة المرتبطة بالأطراف خلال فترة محددة، ويعرضها مجمّعة حسب تصنيف الطرف (العملاء، الموردون، ...) بدلاً من الحساب.</Text></div>
            <div><Title level={5}>بدون تصنيف</Title>
              <Text>الأطراف التي لم يتم تحديد تصنيف لها تظهر مجمّعة ضمن صف "بدون تصنيف". يمكن تحديد تصنيف لكل طرف من صفحة "الأطراف".</Text></div>
          </Flex>
        </HelpButton>
      </Flex>

      {/* Filters */}
      <div style={{ padding: 14, marginBottom: 16, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
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
          <Button
            icon={xlsLoading ? <Spin size="small" /> : <Sheet size={16} />}
            onClick={handleExcel}
            disabled={xlsLoading || !data}
          >
            تصدير Excel
          </Button>
        </Flex>
      </div>

      <Table
        size="small"
        bordered
        loading={loading}
        columns={columns}
        dataSource={data?.rows}
        rowKey="category_id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        sticky
        locale={{ emptyText: 'لا توجد بيانات في هذه الفترة' }}
        summary={() => {
          if (!data || data.rows.length === 0) return null
          return (
            <Table.Summary fixed>
              <Table.Summary.Row style={{ fontWeight: 700, background: 'var(--ant-color-fill-alter)' }}>
                <Table.Summary.Cell index={0} align="center">الإجمالي</Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.totals.debit)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{numFmt(data.totals.credit)}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {numFmt(data.totals.balance)}
                    <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 400, color: 'var(--ant-color-text-secondary)' }}>{sideLbl(data.totals.balance_side)}</span>
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </div>
  )
}
