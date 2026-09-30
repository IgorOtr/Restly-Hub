import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { EmptyState, ErrorState, Skeleton } from './States'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string
  isLoading?: boolean
  error?: unknown
  onRetry?: () => void
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  empty?: ReactNode
  skeletonRows?: number
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  onRowClick,
  rowClassName,
  empty,
  skeletonRows = 6,
}: DataTableProps<T>) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (!isLoading && rows && rows.length === 0) return <>{empty ?? <EmptyState title="Nenhum registro encontrado" />}</>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('px-4 py-2.5 text-left text-xs font-medium tracking-wide whitespace-nowrap text-muted uppercase', c.headerClassName)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            : rows?.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn('transition-colors', onRowClick && 'cursor-pointer hover:bg-surface-2', rowClassName?.(row))}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}
