import { useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Flex, Skeleton, Typography } from 'antd'
import { useThemeMode } from '@/context/ThemeModeContext'
import { formatCurrency } from '@/lib/constants'

const { Text } = Typography

export interface MonthlyTrendPoint {
  month: string
  revenue: number
  expense: number
  net: number
}

interface Props {
  data: MonthlyTrendPoint[]
  loading: boolean
}

const WIDTH = 640
const HEIGHT = 240
const PADDING = { top: 12, right: 12, bottom: 28, left: 48 }

function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

export default function MonthlyTrendChart({ data, loading }: Props) {
  const { mode } = useThemeMode()
  const dark = mode === 'dark'
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const colors = {
    revenue: dark ? '#3987e5' : '#2a78d6',
    expense: dark ? '#e66767' : '#e34948',
    grid: dark ? '#2c2c2a' : '#e1e0d9',
    axis: dark ? '#383835' : '#c3c2b7',
    muted: '#898781',
  }

  const plotWidth = WIDTH - PADDING.left - PADDING.right
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom

  const maxValue = useMemo(() => {
    const max = Math.max(1, ...data.map(d => Math.max(d.revenue, d.expense)))
    return niceMax(max)
  }, [data])

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxValue * f))

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  if (data.length === 0) {
    return <Text type="secondary">لا توجد بيانات كافية</Text>
  }

  const groupWidth = plotWidth / data.length
  const barWidth = Math.min(22, groupWidth / 2 - 6)

  return (
    <div style={{ direction: 'ltr' }}>
      <Flex gap={16} style={{ marginBottom: 8 }}>
        <Flex align="center" gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: colors.revenue, display: 'inline-block' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>الإيرادات</Text>
        </Flex>
        <Flex align="center" gap={6}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: colors.expense, display: 'inline-block' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>المصروفات</Text>
        </Flex>
      </Flex>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Gridlines + y ticks */}
        {ticks.map(tick => {
          const y = PADDING.top + plotHeight - (tick / maxValue) * plotHeight
          return (
            <g key={tick}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke={colors.grid} strokeWidth={1} />
              <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill={colors.muted}>
                {formatCurrency(tick)}
              </text>
            </g>
          )
        })}
        {/* Baseline */}
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={PADDING.top + plotHeight}
          y2={PADDING.top + plotHeight}
          stroke={colors.axis}
          strokeWidth={1}
        />

        {data.map((point, i) => {
          const groupX = PADDING.left + i * groupWidth
          const revHeight = (point.revenue / maxValue) * plotHeight
          const expHeight = (point.expense / maxValue) * plotHeight
          const baseY = PADDING.top + plotHeight
          const revX = groupX + groupWidth / 2 - barWidth - 1
          const expX = groupX + groupWidth / 2 + 1
          const isHovered = hoverIndex === i

          return (
            <g
              key={point.month}
              onMouseEnter={() => setHoverIndex(i)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={groupX}
                y={PADDING.top}
                width={groupWidth}
                height={plotHeight}
                fill="transparent"
              />
              <rect
                x={revX}
                y={baseY - revHeight}
                width={barWidth}
                height={Math.max(revHeight, 1)}
                rx={4}
                fill={colors.revenue}
                opacity={isHovered ? 1 : 0.9}
              />
              <rect
                x={expX}
                y={baseY - expHeight}
                width={barWidth}
                height={Math.max(expHeight, 1)}
                rx={4}
                fill={colors.expense}
                opacity={isHovered ? 1 : 0.9}
              />
              <text
                x={groupX + groupWidth / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={11}
                fill={colors.muted}
              >
                {dayjs(`${point.month}-01`).format('MMM')}
              </text>
            </g>
          )
        })}
      </svg>

      {hoverIndex !== null && (
        <Flex justify="space-between" style={{ marginTop: 8, padding: '6px 10px', background: dark ? '#1a1a19' : '#f9f9f7', borderRadius: 6 }}>
          <Text strong style={{ fontSize: 12 }}>{dayjs(`${data[hoverIndex].month}-01`).format('MMMM YYYY')}</Text>
          <Flex gap={16}>
            <Text style={{ fontSize: 12 }}>
              الإيرادات: <Text strong style={{ fontSize: 12 }}>{formatCurrency(data[hoverIndex].revenue)}</Text>
            </Text>
            <Text style={{ fontSize: 12 }}>
              المصروفات: <Text strong style={{ fontSize: 12 }}>{formatCurrency(data[hoverIndex].expense)}</Text>
            </Text>
            <Text style={{ fontSize: 12 }}>
              الصافي: <Text strong style={{ fontSize: 12, color: data[hoverIndex].net >= 0 ? colors.revenue : colors.expense }}>{formatCurrency(data[hoverIndex].net)}</Text>
            </Text>
          </Flex>
        </Flex>
      )}
    </div>
  )
}
