import { Flex, Pagination, Spin, Table, Typography } from 'antd'
import type { TableProps } from 'antd'
import { useResponsive } from '@/hooks/useResponsive'

const { Text } = Typography

interface ResponsiveTableProps<T> extends TableProps<T> {
  /** Card renderer for the mobile (`< lg`) layout. */
  renderCard: (record: T, index: number) => React.ReactNode
  cardKey: (record: T) => React.Key
  /** Optional footer rendered under the card list (e.g. a totals summary). */
  mobileSummary?: React.ReactNode
}

/**
 * Renders the normal antd `<Table>` on desktop and a stack of caller-provided
 * cards on mobile. All standard Table props (columns, dataSource, loading,
 * pagination, onRow …) pass straight through to the desktop table.
 */
export default function ResponsiveTable<T extends object>({
  renderCard, cardKey, mobileSummary, ...tableProps
}: ResponsiveTableProps<T>) {
  const { isDesktop } = useResponsive()

  if (isDesktop) return <Table<T> {...tableProps} />

  const rows = (tableProps.dataSource ?? []) as readonly T[]
  const emptyText = (tableProps.locale?.emptyText as React.ReactNode) ?? 'لا توجد بيانات'

  if (tableProps.loading) {
    return (
      <Flex justify="center" style={{ padding: 40 }}>
        <Spin />
      </Flex>
    )
  }

  if (rows.length === 0) {
    return (
      <Flex justify="center" style={{ padding: 32 }}>
        <Text type="secondary">{emptyText}</Text>
      </Flex>
    )
  }

  const pg = tableProps.pagination

  return (
    <Flex vertical gap={10}>
      {rows.map((record, i) => (
        <div key={cardKey(record)}>{renderCard(record, i)}</div>
      ))}
      {mobileSummary}
      {pg && typeof pg === 'object' && (pg.total ?? 0) > (pg.pageSize ?? 10) && (
        <Flex justify="center" style={{ marginTop: 4 }}>
          <Pagination
            size="small"
            simple
            current={pg.current}
            pageSize={pg.pageSize}
            total={pg.total}
            onChange={pg.onChange}
          />
        </Flex>
      )}
    </Flex>
  )
}
