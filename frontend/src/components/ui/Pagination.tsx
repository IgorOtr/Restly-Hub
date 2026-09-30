import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './IconButton'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
      <span>
        {total} registro{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Anterior" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} />
        <span className="px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <IconButton icon={ChevronRight} label="Próxima" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)} />
      </div>
    </div>
  )
}
