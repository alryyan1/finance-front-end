import { useEffect, useState } from 'react'
import {
  Alert, Button, Divider, Flex, InputNumber, Spin, Typography,
} from 'antd'
import HelpButton from '@/components/common/HelpButton'
import { Save } from 'lucide-react'
import api from '@/lib/axios'
import FiscalYearSelector from '@/components/FiscalYearSelector'
import { useToast } from '@/lib/toast'

const { Title, Text } = Typography

interface OBRow {
  account_id: number
  code: string
  name: string
  type: string
  debit: string
  credit: string
}

type EditRow = OBRow & { _debit: string; _credit: string }

const TYPE_LABELS: Record<string, string> = {
  asset:     'أصول',
  liability: 'خصوم',
  equity:    'حقوق الملكية',
}
const TYPE_ORDER = ['asset', 'liability', 'equity']

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

export default function OpeningBalancesPage() {
  const toast = useToast()
  const [rows, setRows]             = useState<EditRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [fiscalYearId, setFiscalYearId] = useState<number | null>(null)
  const [periodLabel, setPeriodLabel]   = useState<string>('')

  const load = (fyId: number | null) => {
    setLoading(true)
    const params = fyId ? { fiscal_year_id: fyId } : {}
    api.get<OBRow[]>('/api/opening-balances', { params })
      .then(r => setRows(r.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      }))))
      .catch(() => toast.error('تعذّر تحميل الأرصدة'))
      .finally(() => setLoading(false))
  }

  const handlePeriodChange = (fyId: number | null, from: string, to: string) => {
    setFiscalYearId(fyId)
    setPeriodLabel(fyId ? `${from} — ${to}` : 'أرصدة عامة')
    load(fyId)
  }

  const setDebit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _debit: val, _credit: val ? '' : r._credit } : r))

  const setCredit = (id: number, val: string) =>
    setRows(prev => prev.map(r => r.account_id === id
      ? { ...r, _credit: val, _debit: val ? '' : r._debit } : r))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        fiscal_year_id: fiscalYearId,
        rows: rows.map(r => ({
          account_id: r.account_id,
          debit:  parseFloat(r._debit)  || 0,
          credit: parseFloat(r._credit) || 0,
        })),
      }
      const res = await api.put<OBRow[]>('/api/opening-balances', payload)
      setRows(res.data.map(row => ({
        ...row,
        _debit:  Number(row.debit)  > 0 ? String(Number(row.debit))  : '',
        _credit: Number(row.credit) > 0 ? String(Number(row.credit)) : '',
      })))
      toast.success('تم حفظ الأرصدة الافتتاحية بنجاح')
    } catch {
      toast.error('تعذّر الحفظ، يرجى المحاولة مجدداً')
    } finally {
      setSaving(false)
    }
  }

  const totalDebit  = rows.reduce((s, r) => s + (parseFloat(r._debit)  || 0), 0)
  const totalCredit = rows.reduce((s, r) => s + (parseFloat(r._credit) || 0), 0)
  const diff        = Math.abs(totalDebit - totalCredit)
  const isBalanced  = diff < 0.005

  const grouped = TYPE_ORDER.map(type => ({
    type,
    label: TYPE_LABELS[type],
    rows:  rows.filter(r => r.type === type),
  })).filter(g => g.rows.length > 0)

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>الأرصدة الافتتاحية</Title>
          <Text type="secondary">
            {periodLabel || 'اختر الفترة المحاسبية لعرض أرصدتها الافتتاحية'}
          </Text>
        </div>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام الأرصدة الافتتاحية">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي الأرصدة الافتتاحية؟</Title>
                <Text>الأرصدة الافتتاحية هي أرصدة الحسابات في بداية الفترة المالية. تُسجَّل عند بدء استخدام النظام لنقل الأرصدة من النظام القديم.</Text></div>
              <div><Title level={5}>كيفية الإدخال</Title>
                <Text>اختر الفترة المالية من منتقي السنة، ثم أدخل الرصيد الافتتاحي لكل حساب مع تحديد الجهة (مدين/دائن). اضغط "حفظ الأرصدة" عند الانتهاء.</Text></div>
              <div><Title level={5}>تنبيه مهم</Title>
                <Text>تأكد أن مجموع أرصدة المدين يساوي مجموع أرصدة الدائن قبل الحفظ. الأرصدة الافتتاحية غير المتوازنة ستؤثر على دقة جميع التقارير.</Text></div>
            </Flex>
          </HelpButton>
          <Button
            type="primary"
            icon={saving ? <Spin size="small" /> : <Save size={16} />}
            onClick={handleSave}
            disabled={saving || loading || rows.length === 0}
          >
            حفظ الأرصدة
          </Button>
        </Flex>
      </Flex>

      {/* Period selector */}
      <div style={{ padding: 16, marginBottom: 24, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
        <Flex align="flex-end" gap={16} wrap="wrap">
          <FiscalYearSelector
            onChange={handlePeriodChange}
            defaultFrom={`${new Date().getFullYear()}-01-01`}
            defaultTo={today()}
          />
          {periodLabel && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              النطاق: {periodLabel}
            </Text>
          )}
        </Flex>
      </div>

      {loading && (
        <Flex justify="center" style={{ padding: '64px 0' }}>
          <Spin size="large" />
        </Flex>
      )}

      {!loading && rows.length === 0 && (
        <Alert type="info" showIcon message="اختر فترة محاسبية لعرض الأرصدة الافتتاحية" />
      )}

      {!loading && rows.length > 0 && (
        <>
          <div style={{ marginBottom: 16, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--ant-color-fill-alter)' }}>
                  <th style={cellStyle('right', 90)}>الرمز</th>
                  <th style={cellStyle('right')}>اسم الحساب</th>
                  <th style={cellStyle('center', 160)}>مدين</th>
                  <th style={cellStyle('center', 160)}>دائن</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(({ type, label, rows: groupRows }) => (
                  <>
                    <tr key={`hdr-${type}`} style={{ background: 'var(--ant-color-fill-secondary)' }}>
                      <td colSpan={4} style={{ padding: '6px 12px' }}>
                        <Text style={{ fontWeight: 700, fontSize: 12 }} type="secondary">
                          {label}
                        </Text>
                      </td>
                    </tr>
                    {groupRows.map(row => (
                      <tr key={row.account_id} style={{ borderTop: '1px solid var(--ant-color-border-secondary)' }}>
                        <td style={cellStyle('right')}><Text type="secondary">{row.code}</Text></td>
                        <td style={cellStyle('right')}>{row.name}</td>
                        <td style={{ padding: 8 }}>
                          <InputNumber
                            size="small" min={0} step={0.01} style={{ width: 140, direction: 'ltr' }}
                            value={row._debit === '' ? null : Number(row._debit)}
                            onChange={val => setDebit(row.account_id, val == null ? '' : String(val))}
                            placeholder="0"
                          />
                        </td>
                        <td style={{ padding: 8 }}>
                          <InputNumber
                            size="small" min={0} step={0.01} style={{ width: 140, direction: 'ltr' }}
                            value={row._credit === '' ? null : Number(row._credit)}
                            onChange={val => setCredit(row.account_id, val == null ? '' : String(val))}
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: 20, border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
            <Divider style={{ margin: '0 0 16px' }} />
            <Flex justify="flex-end" align="center" gap={32}>
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
                  {numFmt(diff)}
                </Text>
              </div>
              <div style={{
                padding: '6px 16px', borderRadius: 6,
                background: isBalanced ? 'var(--ant-color-success-bg)' : 'var(--ant-color-error-bg)',
                color:      isBalanced ? 'var(--ant-color-success)'    : 'var(--ant-color-error)',
              }}>
                <Text style={{ fontWeight: 700, color: 'inherit' }}>
                  {isBalanced ? 'متوازن' : 'غير متوازن'}
                </Text>
              </div>
            </Flex>
          </div>
        </>
      )}
    </div>
  )
}

function cellStyle(align: 'right' | 'center', width?: number): React.CSSProperties {
  return {
    padding: '8px 12px',
    textAlign: align,
    fontWeight: 600,
    fontSize: 12,
    color: 'var(--ant-color-text-secondary)',
    width,
  }
}
