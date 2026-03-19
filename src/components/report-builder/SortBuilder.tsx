'use client'

import { ArrowUp, ArrowDown, Trash2, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { FieldConfig, SortConfig } from '@/lib/query-engine/types'

interface SortBuilderProps {
  fields: FieldConfig[]
  sorts: SortConfig[]
  onChange: (sorts: SortConfig[]) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reorder<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...arr]
  const [item] = next.splice(fromIndex, 1)
  if (item !== undefined) next.splice(toIndex, 0, item)
  return next
}

function withPriorities(sorts: SortConfig[]): SortConfig[] {
  return sorts.map((s, i) => ({ ...s, priority: i }))
}

// ---------------------------------------------------------------------------
// SortBuilder
// ---------------------------------------------------------------------------

export function SortBuilder({ fields, sorts, onChange }: SortBuilderProps) {
  // Fields that are not yet in the sort list (for the "Add sort" picker)
  const unusedFields = fields.filter(
    (f) => !sorts.some((s) => s.fieldId === f.id),
  )

  function handleAddSort() {
    const first = unusedFields[0]
    if (!first) return
    const newSort: SortConfig = {
      fieldId: first.id,
      field: first.columnName,
      direction: 'asc',
      priority: sorts.length,
    }
    onChange(withPriorities([...sorts, newSort]))
  }

  function handleRemove(fieldId: string) {
    onChange(withPriorities(sorts.filter((s) => s.fieldId !== fieldId)))
  }

  function handleDirectionToggle(fieldId: string) {
    onChange(
      sorts.map((s) =>
        s.fieldId === fieldId
          ? { ...s, direction: s.direction === 'asc' ? 'desc' : 'asc' }
          : s,
      ),
    )
  }

  function handleFieldChange(fieldId: string, newFieldId: string) {
    const newField = fields.find((f) => f.id === newFieldId)
    if (!newField) return
    onChange(
      sorts.map((s) =>
        s.fieldId === fieldId
          ? { ...s, fieldId: newField.id, field: newField.columnName }
          : s,
      ),
    )
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    onChange(withPriorities(reorder(sorts, index, index - 1)))
  }

  function handleMoveDown(index: number) {
    if (index === sorts.length - 1) return
    onChange(withPriorities(reorder(sorts, index, index + 1)))
  }

  return (
    <div className="flex flex-col gap-3">
      {sorts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No sorts configured. Add a sort to order your results.
        </p>
      )}

      {sorts.map((sort, index) => {
        const field = fields.find((f) => f.id === sort.fieldId)
        // Available choices for this row: the currently selected field + all unused ones
        const availableForRow = [
          ...(field ? [field] : []),
          ...unusedFields,
        ]

        return (
          <div
            key={sort.fieldId}
            className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
          >
            {/* Reorder arrows */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className={cn(
                  'rounded p-0.5 transition-colors hover:bg-accent',
                  index === 0 && 'cursor-not-allowed opacity-30',
                )}
                aria-label="Move sort up"
              >
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === sorts.length - 1}
                className={cn(
                  'rounded p-0.5 transition-colors hover:bg-accent',
                  index === sorts.length - 1 && 'cursor-not-allowed opacity-30',
                )}
                aria-label="Move sort down"
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Priority badge */}
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>

            {/* Field selector */}
            <Select
              value={sort.fieldId}
              onValueChange={(val) => handleFieldChange(sort.fieldId, val)}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="Select field…" />
              </SelectTrigger>
              <SelectContent>
                {availableForRow.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Direction toggle */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 px-2 text-xs"
              onClick={() => handleDirectionToggle(sort.fieldId)}
              aria-label={`Sort direction: ${sort.direction}`}
            >
              {sort.direction === 'asc' ? (
                <>
                  <ArrowUp className="h-3.5 w-3.5" />
                  ASC
                </>
              ) : (
                <>
                  <ArrowDown className="h-3.5 w-3.5" />
                  DESC
                </>
              )}
            </Button>

            {/* Remove */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(sort.fieldId)}
              aria-label="Remove sort"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      {/* Add sort */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        disabled={unusedFields.length === 0}
        onClick={handleAddSort}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Add Sort
      </Button>
    </div>
  )
}
