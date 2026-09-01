import { useEffect, useState } from 'react'
import { Flex, Select, Typography } from 'antd'
import type { FiscalYear } from '@/api/fiscalYears'
import { useFiscalYears } from '@/context/FiscalYearsContext'

const { Text } = Typography

interface Props {
  /** Called when selection changes. fiscalYearId=null means "custom / no period" */
  onChange: (fiscalYearId: number | null, from: string, to: string) => void
  defaultFrom: string
  defaultTo: string
  size?: 'small' | 'middle'
  /** Stretch to fill the container (mobile filter sheets). */
  block?: boolean
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function FiscalYearSelector({ onChange, defaultFrom, defaultTo, size = 'small', block = false }: Props) {
  const { years } = useFiscalYears()
  const [selected, setSelected] = useState<string>('custom')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (years.length === 0 || initialized) return
    setInitialized(true)
    const todayStr = today()
    const current = years.find(
      y => y.status === 'open' && y.start_date <= todayStr && y.end_date >= todayStr
    )
    if (current) {
      setSelected(String(current.id))
      onChange(current.id, current.start_date, current.end_date)
    } else {
      onChange(null, defaultFrom, defaultTo)
    }
  }, [years])

  const handleChange = (val: string) => {
    setSelected(val)
    if (val === 'custom') {
      onChange(null, defaultFrom, defaultTo)
    } else {
      const fy = years.find(y => String(y.id) === val)!
      onChange(fy.id, fy.start_date, fy.end_date)
    }
  }

  const statusLabel = (fy: FiscalYear) => fy.status === 'open' ? 'مفتوحة' : 'مغلقة'
  const statusColor = (fy: FiscalYear) => fy.status === 'open' ? '#16a34a' : '#6b7280'

  return (
    <Flex vertical gap={4} style={{ minWidth: block ? undefined : 220, width: block ? '100%' : undefined }}>
      <Text type="secondary" style={{ fontSize: 12 }}>الفترة المحاسبية</Text>
      <Select
        size={size}
        style={block ? { width: '100%' } : undefined}
        value={selected}
        onChange={handleChange}
        options={[
          {
            value: 'custom',
            label: <span style={{ color: 'var(--ant-color-text-secondary)', fontStyle: 'italic' }}>نطاق مخصص</span>,
          },
          ...years.map(fy => ({
            value: String(fy.id),
            label: (
              <Flex align="center" gap={8} style={{ width: '100%' }}>
                <span style={{ flex: 1 }}>{fy.name}</span>
                <span style={{ fontSize: 11, color: statusColor(fy), fontWeight: 600 }}>
                  {statusLabel(fy)}
                </span>
              </Flex>
            ),
          })),
        ]}
      />
    </Flex>
  )
}
