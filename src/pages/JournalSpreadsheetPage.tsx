import { useEffect, useRef, useState } from 'react'
import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverSheetsCorePresetEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import '@univerjs/preset-sheets-core/lib/index.css'
import { Box, CircularProgress, Typography } from '@mui/material'
import { journalApi } from '@/api/journal'
import type { JournalEntry } from '@/types/journal'

const HEADERS = ['التاريخ', 'المرجع', 'البيان', 'كود الحساب', 'اسم الحساب', 'مدين', 'دائن', 'الحالة']

function buildSheetData(entries: JournalEntry[]) {
  const rows: (string | number)[][] = [HEADERS]

  for (const entry of entries) {
    const lines = entry.lines ?? []
    for (const line of lines) {
      rows.push([
        entry.date,
        entry.reference ?? '',
        entry.description,
        line.account?.code ?? '',
        line.account?.name ?? '',
        Number(line.debit) > 0 ? Number(line.debit) : '',
        Number(line.credit) > 0 ? Number(line.credit) : '',
        entry.is_posted ? 'مرحَّل' : 'مسودة',
      ])
    }
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

export default function JournalSpreadsheetPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const univerRef = useRef<ReturnType<typeof createUniver> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const from   = params.get('from')   ?? undefined
    const to     = params.get('to')     ?? undefined
    const search = params.get('search') ?? undefined
    const status = params.get('status') ?? undefined

    journalApi
      .list({ from, to, search, status })
      .then(entries => {
        if (!containerRef.current) return

        const rows     = buildSheetData(entries)
        const cellData = rowsToCellData(rows)

        const { univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: { [LocaleType.EN_US]: UniverSheetsCorePresetEnUS },
          theme: defaultTheme,
          presets: [UniverSheetsCorePreset({ container: containerRef.current })],
        })

        univerRef.current = { univerAPI } as ReturnType<typeof createUniver>

        univerAPI.createUniverSheet({
          id: 'journal-sheet',
          name: 'القيود المحاسبية',
          locale: LocaleType.EN_US,
          sheets: {
            sheet1: {
              id: 'sheet1',
              name: 'القيود',
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
              // Style the header row
              rowData: {
                0: { hd: 0, h: 28 },
              },
            },
          },
        })

        // Apply header styles via the facade API
        try {
          const workbook = univerAPI.getActiveWorkbook()
          const sheet    = workbook?.getActiveSheet()
          if (sheet) {
            // Center all cells
            const allRange = sheet.getRange(0, 0, cellData.length, HEADERS.length)
            allRange.setHorizontalAlignment('center')

            // Bold + background for header row
            const headerRange = sheet.getRange(0, 0, 1, HEADERS.length)
            headerRange.setFontWeight('bold')
            headerRange.setBackground('#1565C0')
            headerRange.setFontColor('#FFFFFF')

            // Auto-fit columns
            sheet.setColumnWidth(0, 100) // Date
            sheet.setColumnWidth(1, 90)  // Reference
            sheet.setColumnWidth(2, 220) // Description
            sheet.setColumnWidth(3, 90)  // Account code
            sheet.setColumnWidth(4, 180) // Account name
            sheet.setColumnWidth(5, 110) // Debit
            sheet.setColumnWidth(6, 110) // Credit
            sheet.setColumnWidth(7, 80)  // Status

            // Number format for debit/credit columns
            const debitRange  = sheet.getRange(1, 5, cellData.length - 1, 1)
            const creditRange = sheet.getRange(1, 6, cellData.length - 1, 1)
            debitRange.setNumberFormat('#,##0.00')
            creditRange.setNumberFormat('#,##0.00')

            // Alternating row colors for entry groups
            let currentEntryId = -1
            let altRow = false
            let dataRowIndex = 1
            for (const entry of entries) {
              const lines = entry.lines ?? []
              if (entry.id !== currentEntryId) {
                currentEntryId = entry.id
                altRow = !altRow
              }
              for (let i = 0; i < lines.length; i++) {
                const rowRange = sheet.getRange(dataRowIndex, 0, 1, HEADERS.length)
                if (altRow) rowRange.setBackground('#F5F5F5')
                dataRowIndex++
              }
            }
          }
        } catch {
          // Styling is optional — skip silently
        }
      })
      .catch(() => setError('فشل في تحميل القيود المحاسبية'))
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {loading && (
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', gap: 2, zIndex: 10,
          bgcolor: 'background.paper',
        }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">جاري تحميل القيود...</Typography>
        </Box>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </Box>
  )
}
