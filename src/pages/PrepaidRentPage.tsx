import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverSheetsCorePresetEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import '@univerjs/preset-sheets-core/lib/index.css'
import { Button, Flex, Input, Typography } from 'antd'
import { ArrowLeft, Calculator, Plus, Trash2 } from 'lucide-react'
import DateInput from '@/components/common/DateInput'

const { Title } = Typography

// ── constants ─────────────────────────────────────────────────────────────────
const MONTH_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const FIXED_HEADERS = ['#', 'الوصف', 'من', 'إلى', 'المبلغ الكلي']

// ── types ─────────────────────────────────────────────────────────────────────
interface InputRow { id: number; description: string; from: string; to: string; total: string }

interface RentEntry { idx: number; description: string; from: Date; to: Date; total: number }

type ColDef =
  | { type: 'month';     year: number; month: number }
  | { type: 'yearTotal'; year: number }
  | { type: 'remaining'; afterYear: number }

// ── helpers ───────────────────────────────────────────────────────────────────
function parseDate(s: string): Date | null {
  const dmy = s.trim().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1])
  const ymd = s.trim().match(/^(\d{4})[\/\-](\d{2})[\/\-](\d{2})$/)
  if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3])
  return null
}

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`
}

function monthsBetween(from: Date, to: Date) {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth() + 1)
}

function isMonthIn(y: number, m: number, from: Date, to: Date) {
  if (y < from.getFullYear() || y > to.getFullYear()) return false
  if (y === from.getFullYear() && m < from.getMonth()) return false
  if (y === to.getFullYear() && m > to.getMonth()) return false
  return true
}

function buildColDefs(entries: RentEntry[]): ColDef[] {
  if (!entries.length) return []
  const minDate = entries.reduce((a, e) => e.from < a ? e.from : a, entries[0].from)
  const maxDate = entries.reduce((a, e) => e.to   > a ? e.to   : a, entries[0].to)

  const cols: ColDef[] = []
  let y = minDate.getFullYear(), m = minDate.getMonth(), curY = y
  while (y < maxDate.getFullYear() || (y === maxDate.getFullYear() && m <= maxDate.getMonth())) {
    if (y !== curY) {
      cols.push({ type: 'yearTotal', year: curY })
      cols.push({ type: 'remaining', afterYear: curY })
      curY = y
    }
    cols.push({ type: 'month', year: y, month: m })
    if (++m > 11) { m = 0; y++ }
  }
  cols.push({ type: 'yearTotal', year: curY })
  cols.push({ type: 'remaining', afterYear: curY })
  return cols
}

function colHeader(col: ColDef) {
  if (col.type === 'remaining')  return 'المتبقي'
  if (col.type === 'yearTotal')  return `إجمالي ${col.year}`
  return `${MONTH_AR[col.month]}-${String(col.year).slice(2)}`
}

function calcEntry(e: RentEntry, cols: ColDef[]): (number | '')[] {
  const perMonth = e.total / monthsBetween(e.from, e.to)
  const yearMap  = new Map<number, number>() // year → allocated in that year

  const monthVals = cols.map(col => {
    if (col.type !== 'month' || !isMonthIn(col.year, col.month, e.from, e.to)) return null
    yearMap.set(col.year, (yearMap.get(col.year) ?? 0) + perMonth)
    return perMonth
  })

  // cumulative allocated up to and including each year
  const years = [...new Set(cols.filter(c => c.type === 'month').map(c => (c as { year: number }).year))].sort((a, b) => a - b)
  const cumulativeByYear = new Map<number, number>()
  let cum = 0
  for (const y of years) { cum += yearMap.get(y) ?? 0; cumulativeByYear.set(y, cum) }

  return cols.map((col, i) => {
    if (col.type === 'month')     return monthVals[i] === null ? '' : (monthVals[i] as number)
    if (col.type === 'yearTotal') { const v = yearMap.get(col.year) ?? 0; return v > 0 ? v : '' }
    // remaining after this year
    const allocated = cumulativeByYear.get(col.afterYear) ?? 0
    const rem = e.total - allocated
    return Math.abs(rem) < 0.01 ? 0 : rem
  })
}

function buildSheetRows(entries: RentEntry[], cols: ColDef[]) {
  const headers: (string | number)[] = [...FIXED_HEADERS, ...cols.map(colHeader)]

  const dataRows = entries.map((e, i) => [
    i + 1, e.description, fmtDate(e.from), fmtDate(e.to), e.total,
    ...calcEntry(e, cols),
  ] as (string | number)[])

  // totals row
  const grandTotal = entries.reduce((s, e) => s + e.total, 0)
  const colTotals  = cols.map((col, ci) =>
    entries.reduce((s, e) => {
      const v = calcEntry(e, cols)[ci]
      return s + (typeof v === 'number' ? v : 0)
    }, 0)
  )
  dataRows.push(['الإجمالي', '', '', '', grandTotal, ...colTotals] as (string | number)[])

  return [headers, ...dataRows]
}

function toCellData(rows: (string | number)[][]) {
  return Object.fromEntries(
    rows.map((row, ri) => [
      ri,
      Object.fromEntries(row.map((v, ci) => [ci, { v, t: typeof v === 'number' ? 2 : 1 }])),
    ])
  )
}

// ── Univer init ───────────────────────────────────────────────────────────────
function initUniver(container: HTMLDivElement, entries: RentEntry[]) {
  const cols    = buildColDefs(entries)
  const rows    = buildSheetRows(entries, cols)
  const nCols   = FIXED_HEADERS.length + cols.length

  const { univerAPI } = createUniver({
    locale: LocaleType.EN_US,
    locales: { [LocaleType.EN_US]: UniverSheetsCorePresetEnUS },
    theme: defaultTheme,
    presets: [UniverSheetsCorePreset({ container })],
  })

  univerAPI.createUniverSheet({
    id: 'prepaid-rent',
    name: 'توزيع الإيجار المقدم',
    locale: LocaleType.EN_US,
    sheets: {
      sheet1: {
        id: 'sheet1',
        name: 'التوزيع الشهري',
        cellData: toCellData(rows),
        columnCount: nCols + 5,
        rowCount: rows.length + 10,
        freeze: { startRow: 1, startColumn: 5, ySplit: 1, xSplit: 5 },
      },
    },
  })

  try {
    const sheet = univerAPI.getActiveWorkbook()?.getActiveSheet()
    if (!sheet) return univerAPI

    // Center all
    sheet.getRange(0, 0, rows.length, nCols).setHorizontalAlignment('center')

    // Header
    sheet.getRange(0, 0, 1, nCols).setFontWeight('bold').setBackground('#1565C0').setFontColor('#FFFFFF')
    sheet.getRange(0, 0, 1, FIXED_HEADERS.length).setBackground('#1976D2')

    // Year-total & remaining column styles
    cols.forEach((col, ci) => {
      const c = FIXED_HEADERS.length + ci
      if (col.type === 'yearTotal') {
        sheet.getRange(0, c, 1, 1).setBackground('#00695C')
        sheet.getRange(1, c, entries.length + 1, 1).setBackground('#E0F2F1').setFontWeight('bold')
      }
      if (col.type === 'remaining') {
        sheet.getRange(0, c, 1, 1).setBackground('#4A148C')
        sheet.getRange(1, c, entries.length + 1, 1).setFontWeight('bold')
      }
    })

    // Totals row
    sheet.getRange(rows.length - 1, 0, 1, nCols).setFontWeight('bold').setBackground('#E3F2FD')

    // Number format
    if (entries.length > 0) {
      sheet.getRange(1, 4, rows.length, 1).setNumberFormat('#,##0')
      sheet.getRange(1, FIXED_HEADERS.length, rows.length, cols.length).setNumberFormat('#,##0')
    }

    // Column widths
    sheet.setColumnWidth(0, 40)
    sheet.setColumnWidth(1, 200)
    sheet.setColumnWidth(2, 120)
    sheet.setColumnWidth(3, 120)
    sheet.setColumnWidth(4, 120)
    cols.forEach((col, ci) => {
      sheet.setColumnWidth(FIXED_HEADERS.length + ci, col.type === 'month' ? 95 : 110)
    })
  } catch { /* styling optional */ }

  return univerAPI
}

// ── component ─────────────────────────────────────────────────────────────────
let nextId = 1

function emptyRow(): InputRow {
  return { id: nextId++, description: '', from: '', to: '', total: '' }
}

export default function PrepaidRentPage() {
  const navigate     = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef       = useRef<ReturnType<typeof initUniver> | null>(null)

  const [rows, setRows] = useState<InputRow[]>(() => Array.from({ length: 5 }, emptyRow))

  // Mount: empty sheet (placeholder)
  useEffect(() => {
    if (!containerRef.current) return
    apiRef.current = initUniver(containerRef.current, [])
    return () => { try { apiRef.current?.dispose?.() } catch {} }
  }, [])

  const handleCalculate = useCallback(() => {
    const entries: RentEntry[] = []
    rows.forEach((row, i) => {
      const from  = parseDate(row.from)
      const to    = parseDate(row.to)
      const total = parseFloat(row.total.replace(/,/g, ''))
      if (!from || !to || !total || total <= 0) return
      entries.push({ idx: i, description: row.description, from, to, total })
    })
    if (!entries.length || !containerRef.current) return

    // Clear container and reinitialize
    try { apiRef.current?.dispose?.() } catch {}
    containerRef.current.innerHTML = ''
    apiRef.current = initUniver(containerRef.current, entries)
  }, [rows])

  const updateRow = (id: number, field: keyof InputRow, value: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))

  const addRow    = () => setRows(prev => [...prev, emptyRow()])
  const removeRow = (id: number) => setRows(prev => prev.filter(r => r.id !== id))

  return (
    <Flex vertical style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <Flex align="center" gap={12} style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--ant-color-border-secondary)',
        background: 'var(--ant-color-bg-container)', flexShrink: 0,
      }}>
        <Button size="small" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>رجوع</Button>
        <Title level={5} style={{ margin: 0, flex: 1 }}>توزيع الإيجار المقدم على الأشهر</Title>
        <Button type="primary" icon={<Calculator size={16} />} onClick={handleCalculate}>
          احسب التوزيع
        </Button>
      </Flex>

      {/* ── Input table ── */}
      <div style={{ flexShrink: 0, padding: 12, borderBottom: '1px solid var(--ant-color-border-secondary)', background: 'var(--ant-color-fill-alter)' }}>
        <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid var(--ant-color-border-secondary)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1976D2' }}>
                <th style={inputHeadStyle(40)}>#</th>
                <th style={inputHeadStyle(220)}>الوصف</th>
                <th style={inputHeadStyle(140)}>من</th>
                <th style={inputHeadStyle(140)}>إلى</th>
                <th style={inputHeadStyle(140)}>المبلغ الكلي</th>
                <th style={inputHeadStyle(48)} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ background: i % 2 === 1 ? 'var(--ant-color-fill-alter)' : undefined }}>
                  <td style={{ textAlign: 'center', color: 'var(--ant-color-text-secondary)', fontSize: 12, padding: 6 }}>{i + 1}</td>
                  <td style={{ padding: 4 }}>
                    <Input
                      size="small" variant="borderless"
                      placeholder="وصف الإيجار"
                      value={row.description}
                      onChange={e => updateRow(row.id, 'description', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <DateInput
                      size="small" variant="borderless"
                      value={row.from}
                      onChange={e => updateRow(row.id, 'from', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <DateInput
                      size="small" variant="borderless"
                      value={row.to}
                      onChange={e => updateRow(row.id, 'to', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <Input
                      size="small" variant="borderless"
                      placeholder="120000"
                      value={row.total}
                      onChange={e => updateRow(row.id, 'total', e.target.value)}
                    />
                  </td>
                  <td style={{ textAlign: 'center', padding: 4 }}>
                    <Button type="text" shape="circle" size="small" danger onClick={() => removeRow(row.id)} icon={<Trash2 size={14} />} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button size="small" icon={<Plus size={14} />} onClick={addRow} style={{ marginTop: 8 }}>
          إضافة سطر
        </Button>
      </div>

      {/* ── Univer spreadsheet result ── */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

    </Flex>
  )
}

function inputHeadStyle(width: number): React.CSSProperties {
  return { width, padding: '6px 8px', color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 12 }
}
