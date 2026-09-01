import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Col, Flex, Row, Skeleton, Tag, Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import HelpButton from '@/components/common/HelpButton'
import ResponsiveTable from '@/components/common/ResponsiveTable'
import { useResponsive } from '@/hooks/useResponsive'
import MonthlyTrendChart, { type MonthlyTrendPoint } from '@/components/dashboard/MonthlyTrendChart'
import TopExpenseAccountsChart, { type TopExpenseAccount } from '@/components/dashboard/TopExpenseAccountsChart'
import { AlertTriangle, ArrowLeftRight, CalendarClock, ClipboardCheck, TrendingUp, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import api from '@/lib/axios'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/constants'

const { Title, Text } = Typography

interface RecentEntry {
  id: number
  date: string
  reference: string | null
  description: string
  is_posted: boolean
  lines_sum_debit: string | null
}

interface FiscalYearSummary {
  id: number
  name: string
  status: 'open' | 'closed'
  start_date: string
  end_date: string
}

interface DashboardData {
  accounts_count: number
  parties_count: number
  entries_this_month: number
  total_movement: string
  net_profit: number
  recent_entries: RecentEntry[]
  pending_approvals_count: number
  awaiting_manager_count: number
  fiscal_year: FiscalYearSummary | null
  monthly_trend: MonthlyTrendPoint[]
  top_expense_accounts: TopExpenseAccount[]
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: LucideIcon
  color: string
  loading: boolean
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card styles={{ body: { padding: 20 } }}>
      <Flex justify="space-between" align="flex-start">
        <div style={{ flexGrow: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            {label}
          </Text>
          {loading ? (
            <Skeleton.Input active size="small" style={{ width: 100, height: 36 }} />
          ) : (
            <Title level={4} style={{ margin: 0 }}>{value}</Title>
          )}
          {sub && !loading && (
            <Text type="secondary" style={{ fontSize: 12 }}>{sub}</Text>
          )}
        </div>
        <Flex align="center" justify="center" style={{
          width: 44, height: 44, borderRadius: 8,
          background: `${color}18`,
          color, flexShrink: 0, marginTop: 4,
        }}>
          <Icon size={18} />
        </Flex>
      </Flex>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const blockGap = isMobile ? 16 : 32

  useEffect(() => {
    api.get<DashboardData>('/api/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const movement = data ? Number(data.total_movement) : 0
  const profit   = data?.net_profit ?? 0

  const stats: StatCardProps[] = [
    {
      label: 'حركة هذا الشهر',
      value: formatCurrency(movement),
      sub: `${data?.entries_this_month ?? 0} قيد مرحَّل`,
      icon: ArrowLeftRight,
      color: '#2563eb',
      loading,
    },
    {
      label: 'صافي الربح',
      value: formatCurrency(Math.abs(profit)),
      sub: profit >= 0 ? 'ربح' : 'خسارة',
      icon: TrendingUp,
      color: profit >= 0 ? '#16a34a' : '#dc2626',
      loading,
    },
    {
      label: 'الأطراف النشطة',
      value: (data?.parties_count ?? 0).toLocaleString('en-US'),
      icon: Users,
      color: '#7c3aed',
      loading,
    },
    {
      label: 'الحسابات',
      value: (data?.accounts_count ?? 0).toLocaleString('en-US'),
      icon: Wallet,
      color: '#d97706',
      loading,
    },
    {
      label: 'موافقات نثريات معلّقة',
      value: (data?.pending_approvals_count ?? 0).toLocaleString('en-US'),
      sub: (data?.pending_approvals_count ?? 0) > 0 ? 'بحاجة إلى مراجعة' : 'لا يوجد معلّق',
      icon: ClipboardCheck,
      color: (data?.pending_approvals_count ?? 0) > 0 ? '#dc2626' : '#16a34a',
      loading,
    },
  ]

  const columns: ColumnsType<RecentEntry> = [
    {
      title: 'التاريخ',
      dataIndex: 'date',
      render: (date: string) => <span style={{ direction: 'ltr', color: 'var(--ant-color-text-secondary)' }}>{date}</span>,
    },
    { title: 'الوصف', dataIndex: 'description' },
    {
      title: 'المرجع',
      dataIndex: 'reference',
      render: (ref: string | null) => <Text type="secondary">{ref || '—'}</Text>,
    },
    {
      title: 'إجمالي المدين',
      dataIndex: 'lines_sum_debit',
      align: 'left',
      render: (v: string | null) => (
        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
          {v ? Number(v).toLocaleString('en-US') : '0'}
        </span>
      ),
    },
    {
      title: 'الحالة',
      dataIndex: 'is_posted',
      align: 'center',
      render: (posted: boolean) => posted
        ? <Tag color="success">مرحَّل</Tag>
        : <Tag>مسودة</Tag>,
    },
  ]

  return (
    <div>
      <Flex justify="space-between" align="flex-start" style={{ marginBottom: 4 }}>
        <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
          مرحباً، {user?.name}
        </Title>
        <HelpButton title="دليل استخدام لوحة التحكم">
          <Flex vertical gap={16}>
            <div><Title level={5}>لوحة التحكم</Title>
              <Text>لوحة التحكم تُقدّم ملخصاً سريعاً للوضع المالي الحالي: إجمالي الأصول، الخصوم، الإيرادات والمصروفات لهذا الشهر.</Text></div>
            <div><Title level={5}>بطاقات الإحصاء</Title>
              <Text>كل بطاقة تُظهر قيمة مالية إجمالية. اضغط على البطاقة للانتقال إلى الصفحة التفصيلية المقابلة.</Text></div>
            <div><Title level={5}>الإيرادات والمصروفات وأعلى الحسابات</Title>
              <Text>رسم بياني يقارن الإيرادات والمصروفات خلال آخر 6 أشهر، بجانب أعلى حسابات المصروفات خلال نفس الفترة. مرّر المؤشر فوق الأعمدة لعرض التفاصيل.</Text></div>
            <div><Title level={5}>آخر القيود</Title>
              <Text>يُعرض في أسفل الصفحة جدول بآخر القيود المحاسبية المسجّلة. للمزيد من التفاصيل انتقل لصفحة "القيود".</Text></div>
            <div><Title level={5}>التنقل في النظام</Title>
              <Text>استخدم القائمة الجانبية للتنقل بين صفحات النظام. الأقسام: المحاسبة، التقارير، النثريات، الإعدادات.</Text></div>
          </Flex>
        </HelpButton>
      </Flex>
      <Text type="secondary" style={{ display: 'block', marginBottom: blockGap }}>
        ملخص النشاط المالي لشهر {new Date().toLocaleDateString('ar-SA-u-nu-latn', { month: 'long', year: 'numeric' })}
      </Text>

      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: blockGap }}>
        {stats.map(s => (
          <Col key={s.label} xs={24} sm={12} lg={6}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      {/* Fiscal year status */}
      <Row gutter={[16, 16]} style={{ marginBottom: blockGap }}>
        <Col xs={24}>
          <Card title="السنة المالية الحالية" styles={{ body: { padding: 20 } }}>
            {loading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : !data?.fiscal_year ? (
              <Flex align="center" gap={8}>
                <AlertTriangle size={16} color="#dc2626" />
                <Text type="secondary">لا توجد سنة مالية مفتوحة لهذا التاريخ</Text>
              </Flex>
            ) : (
              <Flex vertical gap={8}>
                <Flex align="center" gap={8}>
                  <CalendarClock size={16} />
                  <Text strong>{data.fiscal_year.name}</Text>
                  <Tag color={data.fiscal_year.status === 'open' ? 'success' : 'default'}>
                    {data.fiscal_year.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ direction: 'ltr', fontSize: 12 }}>
                  {data.fiscal_year.start_date} → {data.fiscal_year.end_date}
                </Text>
              </Flex>
            )}
          </Card>
        </Col>
      </Row>

      {/* Trend & top expense accounts */}
      <Row gutter={[16, 16]} style={{ marginBottom: blockGap }}>
        <Col xs={24} lg={16}>
          <Card title="الإيرادات والمصروفات - آخر 6 أشهر" styles={{ body: { padding: 20 } }}>
            <MonthlyTrendChart data={data?.monthly_trend ?? []} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="أعلى حسابات المصروفات" styles={{ body: { padding: 20 } }}>
            <TopExpenseAccountsChart data={data?.top_expense_accounts ?? []} loading={loading} />
          </Card>
        </Col>
      </Row>

      {/* Recent entries */}
      <Title level={5} style={{ marginBottom: 16 }}>
        آخر القيود
      </Title>

      <ResponsiveTable<RecentEntry>
        size="small"
        columns={columns}
        dataSource={data?.recent_entries ?? []}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: 'لا توجد قيود بعد' }}
        onRow={entry => ({
          style: { cursor: 'pointer' },
          onClick: () => navigate(`/transactions/${entry.id}/edit`),
        })}
        cardKey={e => e.id}
        renderCard={entry => (
          <Card
            size="small"
            styles={{ body: { padding: 12 } }}
            onClick={() => navigate(`/transactions/${entry.id}/edit`)}
          >
            <Flex justify="space-between" align="flex-start" gap={8}>
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: 'block' }}>{entry.description}</Text>
                <Text type="secondary" style={{ fontSize: 12, direction: 'ltr' }}>
                  {entry.date}{entry.reference ? ` · ${entry.reference}` : ''}
                </Text>
              </div>
              {entry.is_posted ? <Tag color="success">مرحَّل</Tag> : <Tag>مسودة</Tag>}
            </Flex>
            <Text strong style={{ display: 'block', marginTop: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
              {entry.lines_sum_debit ? Number(entry.lines_sum_debit).toLocaleString('en-US') : '0'}
            </Text>
          </Card>
        )}
      />

      {!loading && (data?.recent_entries?.length ?? 0) > 0 && (
        <div style={{ marginTop: 8, textAlign: 'left' }}>
          <Text
            type="secondary"
            style={{ cursor: 'pointer', fontSize: 12 }}
            onClick={() => navigate('/transactions')}
          >
            عرض كل القيود ←
          </Text>
        </div>
      )}
    </div>
  )
}
