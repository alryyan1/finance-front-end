import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box, Card, CardContent, Chip, CircularProgress,
  Divider, Paper, Skeleton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Typography,
} from '@mui/material'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import type { SvgIconProps } from '@mui/material'
import type { ComponentType } from 'react'
import api from '@/lib/axios'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency } from '@/lib/constants'

interface RecentEntry {
  id: number
  date: string
  reference: string | null
  description: string
  is_posted: boolean
  lines_sum_debit: string | null
}

interface DashboardData {
  accounts_count: number
  parties_count: number
  entries_this_month: number
  total_movement: string
  net_profit: number
  recent_entries: RecentEntry[]
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: ComponentType<SvgIconProps>
  color: string
  loading: boolean
}

function StatCard({ label, value, sub, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} gutterBottom>
              {label}
            </Typography>
            {loading ? (
              <Skeleton width={100} height={36} />
            ) : (
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
            )}
            {sub && !loading && (
              <Typography variant="caption" color="text.secondary">{sub}</Typography>
            )}
          </Box>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2,
            bgcolor: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color, flexShrink: 0, mt: 0.5,
          }}>
            <Icon fontSize="small" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardData>('/api/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  const movement = data ? Number(data.total_movement) : 0
  const profit   = data?.net_profit ?? 0

  const stats = [
    {
      label: 'حركة هذا الشهر',
      value: formatCurrency(movement),
      sub: `${data?.entries_this_month ?? 0} قيد مرحَّل`,
      icon: SwapHorizOutlinedIcon,
      color: '#2563eb',
    },
    {
      label: 'صافي الربح',
      value: formatCurrency(Math.abs(profit)),
      sub: profit >= 0 ? 'ربح' : 'خسارة',
      icon: TrendingUpOutlinedIcon,
      color: profit >= 0 ? '#16a34a' : '#dc2626',
    },
    {
      label: 'الأطراف النشطة',
      value: (data?.parties_count ?? 0).toLocaleString('en-US'),
      icon: PeopleOutlinedIcon,
      color: '#7c3aed',
    },
    {
      label: 'الحسابات',
      value: (data?.accounts_count ?? 0).toLocaleString('en-US'),
      icon: AccountBalanceWalletOutlinedIcon,
      color: '#d97706',
    },
  ]

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
        مرحباً، {user?.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ملخص النشاط المالي لشهر {new Date().toLocaleDateString('ar-SA-u-nu-latn', { month: 'long', year: 'numeric' })}
      </Typography>

      {/* Stat cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: '1fr 1fr 1fr 1fr' },
        gap: 3,
        mb: 4,
      }}>
        {stats.map(s => (
          <StatCard key={s.label} {...s} loading={loading} />
        ))}
      </Box>

      {/* Recent entries */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        آخر القيود
      </Typography>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={48} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوصف</TableCell>
                <TableCell>المرجع</TableCell>
                <TableCell align="left">إجمالي المدين</TableCell>
                <TableCell align="center">الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.recent_entries ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    لا توجد قيود بعد
                  </TableCell>
                </TableRow>
              )}
              {(data?.recent_entries ?? []).map(entry => (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/transactions/${entry.id}/edit`)}
                >
                  <TableCell sx={{ direction: 'ltr', textAlign: 'right', color: 'text.secondary' }}>
                    {entry.date}
                  </TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{entry.reference || '—'}</TableCell>
                  <TableCell align="left" sx={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                    {entry.lines_sum_debit
                      ? Number(entry.lines_sum_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : '0.00'}
                  </TableCell>
                  <TableCell align="center">
                    {entry.is_posted
                      ? <Chip label="مرحَّل" color="success" size="small" />
                      : <Chip label="مسودة" color="default" size="small" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {!loading && (data?.recent_entries?.length ?? 0) > 0 && (
        <Box sx={{ mt: 1, textAlign: 'left' }}>
          <Typography
            variant="caption"
            color="primary"
            sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={() => navigate('/transactions')}
          >
            عرض كل القيود ←
          </Typography>
        </Box>
      )}
    </Box>
  )
}
