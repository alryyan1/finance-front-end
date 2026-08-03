import { Flex, Skeleton, Typography } from 'antd'
import { useThemeMode } from '@/context/ThemeModeContext'
import { formatCurrency } from '@/lib/constants'

const { Text } = Typography

export interface TopExpenseAccount {
  account_id: number
  name: string
  net_expense: number
}

interface Props {
  data: TopExpenseAccount[]
  loading: boolean
}

export default function TopExpenseAccountsChart({ data, loading }: Props) {
  const { mode } = useThemeMode()
  const color = mode === 'dark' ? '#e66767' : '#e34948'

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  if (data.length === 0) {
    return <Text type="secondary">لا توجد مصروفات مسجّلة</Text>
  }

  const max = Math.max(...data.map(d => d.net_expense), 1)

  return (
    <Flex vertical gap={12}>
      {data.map(account => {
        const percent = Math.max(2, Math.round((account.net_expense / max) * 100))
        return (
          <div key={account.account_id}>
            <Flex justify="space-between" style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 13 }}>{account.name}</Text>
              <Text style={{ fontSize: 13, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(account.net_expense)}
              </Text>
            </Flex>
            <div style={{ height: 10, borderRadius: 5, background: mode === 'dark' ? '#2c2c2a' : '#e1e0d9', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: 5 }} />
            </div>
          </div>
        )
      })}
    </Flex>
  )
}
