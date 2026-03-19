'use client'

import { useState } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QueryResult, QueryResultColumn } from '@/lib/query-engine/types'

const PAGE_SIZE = 50

interface TableChartProps {
  data: QueryResult
}

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

function formatValue(value: unknown, column: QueryResultColumn): string {
  if (value === null || value === undefined) return '—'

  switch (column.type) {
    case 'number': {
      const num = Number(value)
      if (Number.isNaN(num)) return String(value)
      // Use locale-appropriate number formatting
      return num.toLocaleString(undefined, {
        maximumFractionDigits: column.aggregation ? 2 : 0,
      })
    }

    case 'date': {
      try {
        const d = typeof value === 'string' ? parseISO(value) : new Date(value as number)
        if (isValid(d)) {
          return format(d, 'dd MMM yyyy, HH:mm')
        }
      } catch {
        // fall through
      }
      return String(value)
    }

    case 'boolean':
      return value ? 'Yes' : 'No'

    default:
      return String(value)
  }
}

// ---------------------------------------------------------------------------
// TableChart
// ---------------------------------------------------------------------------

export function TableChart({ data }: TableChartProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(data.rows.length / PAGE_SIZE))
  const startIdx = page * PAGE_SIZE
  const pageRows = data.rows.slice(startIdx, startIdx + PAGE_SIZE)

  const hasPrev = page > 0
  const hasNext = page < totalPages - 1

  if (data.columns.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        No columns to display.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            {data.columns.map((col) => (
              <TableHead
                key={col.id}
                className={
                  col.type === 'number'
                    ? 'text-right'
                    : col.type === 'boolean'
                      ? 'text-center'
                      : 'text-left'
                }
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {pageRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={data.columns.length}
                className="py-12 text-center text-sm text-muted-foreground"
              >
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {data.columns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={
                      col.type === 'number'
                        ? 'text-right font-mono text-sm'
                        : col.type === 'boolean'
                          ? 'text-center'
                          : ''
                    }
                  >
                    {formatValue(row[col.field], col)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-2 pt-2 text-sm text-muted-foreground">
          <span>
            Rows {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, data.rows.length)} of{' '}
            {data.rows.length.toLocaleString()}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
