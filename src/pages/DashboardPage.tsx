import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, ArrowLeftRight, Users, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'

const stats = [
  { label: 'إجمالي الرصيد',     value: formatCurrency(0), icon: Wallet,          color: 'text-blue-500' },
  { label: 'معاملات هذا الشهر', value: '٠',               icon: ArrowLeftRight,  color: 'text-green-500' },
  { label: 'الأطراف',           value: '٠',               icon: Users,           color: 'text-purple-500' },
  { label: 'صافي الربح',        value: formatCurrency(0), icon: TrendingUp,      color: 'text-orange-500' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً، {user?.name} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">
          هذا ملخص نشاطك المالي اليوم
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon size={18} className={color} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
