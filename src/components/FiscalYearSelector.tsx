import { useEffect, useState } from 'react'
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import type { FiscalYear } from '@/api/fiscalYears'
import { useFiscalYears } from '@/context/FiscalYearsContext'

interface Props {
  /** Called when selection changes. fiscalYearId=null means "custom / no period" */
  onChange: (fiscalYearId: number | null, from: string, to: string) => void
  defaultFrom: string
  defaultTo: string
  size?: 'small' | 'medium'
}

const today     = () => new Date().toISOString().slice(0, 10)
const yearStart = () => `${new Date().getFullYear()}-01-01`

export default function FiscalYearSelector({ onChange, defaultFrom, defaultTo, size = 'small' }: Props) {
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

  const handleChange = (e: SelectChangeEvent) => {
    const val = e.target.value
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
    <FormControl size={size} sx={{ minWidth: 220 }}>
      <InputLabel>الفترة المحاسبية</InputLabel>
      <Select value={selected} label="الفترة المحاسبية" onChange={handleChange}>
        <MenuItem value="custom">
          <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            نطاق مخصص
          </Box>
        </MenuItem>
        {years.map(fy => (
          <MenuItem key={fy.id} value={String(fy.id)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box component="span" sx={{ flex: 1 }}>{fy.name}</Box>
              <Box component="span" sx={{ fontSize: 11, color: statusColor(fy), fontWeight: 600 }}>
                {statusLabel(fy)}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
