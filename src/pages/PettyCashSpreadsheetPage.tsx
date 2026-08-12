import { useEffect, useRef, useState } from 'react'
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverSheetsCorePresetEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import '@univerjs/preset-sheets-core/lib/index.css'
import { Flex, Spin, Typography } from 'antd'
import { pettyCashApi, type PettyCashTransaction, type TransactionType } from '@/api/pettyCash'

const HEADERS = ['التاريخ', 'النوع', 'حالة الاعتماد', 'تاريخ اعتماد المدير', 'تاريخ التدقيق', 'المستفيد', 'الحساب المقابل', 'المبلغ', 'البيان']

const fmtDateTime = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : ''

const typeLabel = (t: PettyCashTransaction) => (t.type === 'expense' ? 'مصروف' : 'تغذية')

const statusLabel = (t: PettyCashTransaction) => {
  if (t.type !== 'expense') return ''
  return t.status === 'approved' ? 'معتمد' : 'بانتظار اعتماد المدير'
}

function buildSheetData(transactions: PettyCashTransaction[]) {
  const rows: (string | number)[][] = [HEADERS]

  for (const t of transactions) {
    rows.push([
      t.date,
      typeLabel(t),
      statusLabel(t),
      fmtDateTime(t.manager_approved_at),
      fmtDateTime(t.auditor_approved_at),
      t.beneficiary_name ?? '',
      t.contra_account.name,
      Number(t.amount),
      t.description ?? '',
    ])
  }

  return rows
}

function rowsToCellData(rows: (string | number)[][]) {
  return rows.map(row =>
    row.map(value => ({
      v: value,
      t: typeof value === 'number' ? 2 : 1, // 2=number, 1=string
    }))
  )
}

export default function PettyCashSpreadsheetPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<ReturnType<typeof createUniver> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const from = params.get('from') ?? ''
    const to   = params.get('to')   ?? ''
    const type = (params.get('type') as TransactionType | null) ?? undefined

    pettyCashApi
      .listTransactions({ from, to, type })
      .then(transactions => {
        if (!containerRef.current) return

        const rows     = buildSheetData(transactions)
        const cellData = rowsToCellData(rows)

        const { univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: UniverSheetsCorePresetEnUS },
          theme: defaultTheme,
          presets: [UniverSheetsCorePreset({ container: containerRef.current })],
        })

        univerRef.current = { univerAPI } as ReturnType<typeof createUniver>

        univerAPI.createUniverSheet({
          id: 'petty-cash-sheet',
          name: 'صندوق النثريات',
          locale: LocaleType.EN_US,
          sheets: {
            sheet1: {
              id: 'sheet1',
              name: 'الحركات',
              cellData: Object.fromEntries(
                cellData.map((row, ri) => [
                  ri,
                  Object.fromEntries(
                    row.map((cell, ci) => [ci, cell])
                  ),
                ])
              ),
              columnCount: HEADERS.length,
              rowCount: Math.max(cellData.length, 100),
              rowData: {
                0: { hd: 0, h: 28 },
              },
            },
          },
        })

        try {
          const workbook = univerAPI.getActiveWorkbook()
          const sheet    = workbook?.getActiveSheet()
          if (sheet) {
            const allRange = sheet.getRange(0, 0, cellData.length, HEADERS.length)
            allRange.setHorizontalAlignment('center')

            const headerRange = sheet.getRange(0, 0, 1, HEADERS.length)
            headerRange.setFontWeight('bold')
            headerRange.setBackground('#1565C0')
            headerRange.setFontColor('#FFFFFF')

            sheet.setColumnWidth(0, 100) // Date
            sheet.setColumnWidth(1, 80)  // Type
            sheet.setColumnWidth(2, 150) // Approval status
            sheet.setColumnWidth(3, 140) // Manager approval date
            sheet.setColumnWidth(4, 150) // Beneficiary
            sheet.setColumnWidth(5, 180) // Contra account
            sheet.setColumnWidth(6, 110) // Amount
            sheet.setColumnWidth(7, 220) // Description

            const amountRange = sheet.getRange(1, 6, Math.max(cellData.length - 1, 1), 1)
            amountRange.setNumberFormat('#,##0')
          }
        } catch {
          // Styling is optional — skip silently
        }
      })
      .catch(() => setError('فشل في تحميل حركات صندوق النثريات'))
      .finally(() => setLoading(false))

    return () => {
      try {
        // @ts-expect-error dispose if available
        univerRef.current?.univerAPI?.dispose?.()
      } catch {}
    }
  }, [])

  if (error) {
    return (
      <Flex align="center" justify="center" style={{ height: '100vh' }}>
        <Typography.Text type="danger">{error}</Typography.Text>
      </Flex>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {loading && (
        <Flex
          vertical align="center" justify="center" gap={16}
          style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'var(--ant-color-bg-container)' }}
        >
          <Spin size="large" />
          <Typography.Text type="secondary">جاري تحميل حركات صندوق النثريات...</Typography.Text>
        </Flex>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
