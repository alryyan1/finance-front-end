import { useEffect, useState } from 'react'
import {
  Alert, Button, Divider, Flex, InputNumber, Modal, Select, Spin, Table, Tag, Tooltip, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import { useToast } from '@/lib/toast'
import { Lock, LockOpen, Plus } from 'lucide-react'
import api from '@/lib/axios'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types/account'

const { Title, Text } = Typography

interface FiscalYear {
  id: number
  name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed'
  closed_at: string | null
  closing_entry_id: number | null
  unposted_count: number
  net_profit: string
  is_profit: boolean
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

const numFmt = (v: string | number) => Math.round(Number(v)).toLocaleString('en-US')

const currentYear = new Date().getFullYear()

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0)   // day 0 of next month = last day of this month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export default function FiscalYearsPage() {
  const toast = useToast()
  const [years, setYears]       = useState<FiscalYear[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)

  // Monthly form
  const [monthYear,  setMonthYear]  = useState(currentYear)
  const [monthMonth, setMonthMonth] = useState(new Date().getMonth() + 1)

  const [creating, setCreating] = useState(false)

  // Close dialog
  const [closeTarget, setCloseTarget]   = useState<FiscalYear | null>(null)
  const [retainedAcct, setRetainedAcct] = useState<Account | null>(null)
  const [closing, setClosing]           = useState(false)

  // Reopen dialog
  const [reopenTarget, setReopenTarget] = useState<FiscalYear | null>(null)
  const [reopening, setReopening]       = useState(false)

  const load = () => {
    setLoading(true)
    api.get<FiscalYear[]>('/api/fiscal-years')
      .then(r => setYears(r.data))
      .catch(() => toast.error('تعذّر تحميل البيانات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    accountsApi.list().then(setAccounts)
  }, [])

  const equityAccounts = accounts.filter(a => a.type === 'equity')

  // Monthly period preview
  const monthlyName      = monthMonth === 0
    ? `جميع أشهر ${monthYear} (12 شهراً)`
    : `${ARABIC_MONTHS[monthMonth - 1]} ${monthYear}`
  const monthlyStartDate = monthMonth > 0 ? firstDayOfMonth(monthYear, monthMonth) : ''
  const monthlyEndDate   = monthMonth > 0 ? lastDayOfMonth(monthYear, monthMonth)  : ''

  const openCreateDialog = () => {
    setMonthYear(currentYear)
    setMonthMonth(new Date().getMonth() + 1)
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      if (monthMonth === 0) {
        // Bulk: create all 12 months
        const res = await api.post('/api/fiscal-years/bulk-months', { year: monthYear })
        const { created, skipped } = res.data
        if (skipped > 0) {
          toast.warning(`تم إنشاء ${created} شهراً — تم تخطي ${skipped} شهراً لأنها موجودة مسبقاً`)
        } else {
          toast.success(`تم إنشاء ${created} شهراً`)
        }
      } else {
        // Single month
        await api.post('/api/fiscal-years', {
          name:       `${ARABIC_MONTHS[monthMonth - 1]} ${monthYear}`,
          start_date: monthlyStartDate,
          end_date:   monthlyEndDate,
        })
        toast.success('تم إنشاء الفترة المالية')
      }
      setCreateOpen(false)
      load()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر الإنشاء')
    } finally {
      setCreating(false)
    }
  }

  const handleClose = async () => {
    if (!closeTarget || !retainedAcct) return
    setClosing(true)
    try {
      await api.post(`/api/fiscal-years/${closeTarget.id}/close`, {
        retained_earnings_account_id: retainedAcct.id,
      })
      setCloseTarget(null)
      setRetainedAcct(null)
      load()
      toast.success('تم إغلاق الفترة المالية')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر الإغلاق')
    } finally {
      setClosing(false)
    }
  }

  const handleReopen = async () => {
    if (!reopenTarget) return
    setReopening(true)
    try {
      await api.post(`/api/fiscal-years/${reopenTarget.id}/reopen`)
      setReopenTarget(null)
      load()
      toast.success('تم إعادة فتح الفترة المالية')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'تعذّر إعادة الفتح')
    } finally {
      setReopening(false)
    }
  }

  const createDisabled = creating

  const columns: ColumnsType<FiscalYear> = [
    { title: 'اسم الفترة', dataIndex: 'name', render: (v: string) => <Text style={{ fontWeight: 600 }}>{v}</Text> },
    { title: 'من', dataIndex: 'start_date', align: 'center', render: (v: string) => <span style={{ direction: 'ltr', fontSize: 12 }}>{v}</span> },
    { title: 'إلى', dataIndex: 'end_date', align: 'center', render: (v: string) => <span style={{ direction: 'ltr', fontSize: 12 }}>{v}</span> },
    {
      title: 'الحالة', align: 'center',
      render: (_: unknown, y) => y.status === 'open'
        ? <Tag color="success">مفتوحة</Tag>
        : <Tag icon={<Lock size={12} />}>مغلقة</Tag>,
    },
    {
      title: 'قيود غير مرحّلة', align: 'center',
      render: (_: unknown, y) => y.unposted_count > 0
        ? <Tag color="warning">{y.unposted_count}</Tag>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'صافي الربح / الخسارة', align: 'center',
      render: (_: unknown, y) => (
        <Text style={{ fontWeight: 600, direction: 'ltr' }} type={y.is_profit ? 'success' : 'danger'}>
          {y.is_profit ? '+' : '-'}{numFmt(Math.abs(Number(y.net_profit)))}
        </Text>
      ),
    },
    {
      title: 'تاريخ الإغلاق', align: 'center',
      render: (_: unknown, y) => (
        <span style={{ color: 'var(--ant-color-text-secondary)', direction: 'ltr', fontSize: 12 }}>
          {y.closed_at ? new Date(y.closed_at).toLocaleDateString('en-GB') : '—'}
        </span>
      ),
    },
    {
      title: 'إجراءات', width: 70, align: 'center',
      render: (_: unknown, y) => y.status === 'open' ? (
        <Tooltip title="إغلاق الفترة">
          <Button type="text" shape="circle" size="small" onClick={() => setCloseTarget(y)} icon={<Lock size={15} color="var(--ant-color-warning)" />} />
        </Tooltip>
      ) : (
        <Tooltip title="إعادة فتح الفترة">
          <Button type="text" shape="circle" size="small" onClick={() => setReopenTarget(y)} icon={<LockOpen size={15} color="var(--ant-color-primary)" />} />
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>الفترات المالية</Title>
          <Text type="secondary">إدارة الفترات المالية الشهرية</Text>
        </div>
        <Flex gap={8} align="center">
          <HelpButton title="دليل استخدام الفترات المالية">
            <Flex vertical gap={16}>
              <div><Title level={5}>ما هي الفترة المالية؟</Title>
                <Text>الفترة المالية هي النطاق الزمني الذي يُسجَّل فيه النشاط المحاسبي، وتكون فترة شهرية واحدة.</Text></div>
              <div><Title level={5}>إنشاء فترة جديدة</Title>
                <Text>اضغط "فترة جديدة"، اختر الشهر والسنة. يمكن أيضاً إنشاء جميع أشهر السنة دفعة واحدة.</Text></div>
              <div><Title level={5}>قفل الفترة</Title>
                <Text>بعد إغلاق الفترة المالية اضغط أيقونة القفل لمنع إضافة أو تعديل أي قيود فيها. الفترات المقفولة محمية من التغيير.</Text></div>
              <div><Title level={5}>الفترة النشطة</Title>
                <Text>الفترة المحددة في منتقي السنة المالية هي التي تُستخدم في جميع صفحات النظام تلقائياً عند عرض البيانات.</Text></div>
            </Flex>
          </HelpButton>
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreateDialog}>
            فترة جديدة
          </Button>
        </Flex>
      </Flex>

      {loading ? (
        <Flex justify="center" style={{ padding: '64px 0' }}><Spin size="large" /></Flex>
      ) : (
        <Table
          size="small"
          columns={columns}
          dataSource={years}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: 'لا توجد فترات مالية — أنشئ فترة جديدة للبدء' }}
        />
      )}

      {/* ── Create dialog ── */}
      <Modal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        width={420}
        title="إنشاء فترة مالية جديدة"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button type="primary" onClick={handleCreate} disabled={createDisabled} icon={creating ? <Spin size="small" /> : <Plus size={16} />}>
              {monthMonth === 0 ? 'إنشاء 12 شهراً' : 'إنشاء'}
            </Button>
          </Flex>
        }
      >
        <Flex vertical gap={16} style={{ paddingTop: 8 }}>
          <Flex gap={12}>
            <InputNumber min={2000} max={2100} value={monthYear} onChange={v => setMonthYear(Number(v))} style={{ width: 110 }} />
            <Select
              value={monthMonth}
              onChange={setMonthMonth}
              style={{ flex: 1 }}
              options={[
                { value: 0, label: <Flex align="center" gap={8}><Tag color="blue">12</Tag> جميع الأشهر</Flex> },
                ...ARABIC_MONTHS.map((name, i) => ({ value: i + 1, label: name })),
              ]}
            />
          </Flex>

          {/* Preview box */}
          <div style={{ padding: 12, background: 'var(--ant-color-fill-alter)', borderRadius: 6, border: '1px solid var(--ant-color-border-secondary)' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>معاينة:</Text>
            <div style={{ fontWeight: 600, marginTop: 2 }}>{monthlyName}</div>
            {monthMonth > 0 && (
              <Text type="secondary" style={{ direction: 'ltr', display: 'block', fontSize: 12 }}>
                {monthlyStartDate} — {monthlyEndDate}
              </Text>
            )}
            {monthMonth === 0 && (
              <Text style={{ color: 'var(--ant-color-primary)', display: 'block', fontSize: 12 }}>
                سيتم إنشاء 12 فترة شهرية — الأشهر الموجودة مسبقاً ستُتخطى تلقائياً
              </Text>
            )}
          </div>
        </Flex>
      </Modal>

      {/* ── Close dialog ── */}
      <Modal
        open={!!closeTarget}
        onCancel={() => setCloseTarget(null)}
        width={480}
        title="إغلاق الفترة المالية"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setCloseTarget(null)}>إلغاء</Button>
            <Button
              type="primary" style={{ background: 'var(--ant-color-warning)' }}
              onClick={handleClose} disabled={closing || !retainedAcct}
              icon={closing ? <Spin size="small" /> : <Lock size={16} />}
            >
              إغلاق الفترة
            </Button>
          </Flex>
        }
      >
        {closeTarget && (
          <Flex vertical gap={16} style={{ paddingTop: 8 }}>
            <div style={{ padding: 12, background: 'var(--ant-color-fill-alter)', borderRadius: 6 }}>
              <Text style={{ fontWeight: 600, display: 'block' }}>{closeTarget.name}</Text>
              <Text type="secondary" style={{ direction: 'ltr', display: 'block', fontSize: 12 }}>
                {closeTarget.start_date} — {closeTarget.end_date}
              </Text>
            </div>

            <div style={{
              padding: 16, borderRadius: 6,
              background: closeTarget.is_profit ? 'var(--ant-color-success-bg)' : 'var(--ant-color-error-bg)',
              border: `1px solid ${closeTarget.is_profit ? 'var(--ant-color-success-border)' : 'var(--ant-color-error-border)'}`,
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {closeTarget.is_profit ? 'صافي الربح المحقق' : 'صافي الخسارة'}
              </Text>
              <Title level={5} style={{ margin: 0, direction: 'ltr' }} type={closeTarget.is_profit ? 'success' : 'danger'}>
                {numFmt(Math.abs(Number(closeTarget.net_profit)))}
              </Title>
            </div>

            {closeTarget.unposted_count > 0 && (
              <Alert type="warning" showIcon message={`يوجد ${closeTarget.unposted_count} قيد غير مرحَّل — لن يُدرج في قيد الإقفال`} />
            )}

            <Divider style={{ margin: 0 }} />
            <div>
              <Text style={{ display: 'block', marginBottom: 8 }}>اختر حساب الأرباح المحتجزة:</Text>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="حساب الأرباح المحتجزة"
                value={retainedAcct?.id}
                onChange={v => setRetainedAcct(equityAccounts.find(a => a.id === v) ?? null)}
                notFoundContent="لا توجد حسابات حقوق ملكية"
                filterOption={(input, option) => (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                options={equityAccounts.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
              />
            </div>
            <Text style={{ fontSize: 13 }}>
              سيتم إنشاء قيد إقفال مرحَّل يُصفّر حسابات الإيرادات والمصروفات.
            </Text>
          </Flex>
        )}
      </Modal>

      {/* ── Reopen dialog ── */}
      <Modal
        open={!!reopenTarget}
        onCancel={() => setReopenTarget(null)}
        width={400}
        title="إعادة فتح الفترة المالية"
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={() => setReopenTarget(null)}>إلغاء</Button>
            <Button type="primary" danger onClick={handleReopen} disabled={reopening} icon={reopening ? <Spin size="small" /> : <LockOpen size={16} />}>
              إعادة الفتح
            </Button>
          </Flex>
        }
      >
        <Text>سيتم حذف قيد الإقفال وإعادة فتح الفترة للتعديل.</Text>
        {reopenTarget && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--ant-color-fill-alter)', borderRadius: 6 }}>
            <Text style={{ fontWeight: 600 }}>{reopenTarget.name}</Text>
          </div>
        )}
      </Modal>
    </div>
  )
}
