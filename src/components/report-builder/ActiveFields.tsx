'use client'

import React, { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  X,
  ChevronDown,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
  Pencil,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FieldConfig, FieldType, AggregationType, DateGranularity } from '@/lib/query-engine/types'

const AGGREGATIONS: { value: AggregationType; label: string }[] = [
  { value: 'sum', label: 'SUM' },
  { value: 'avg', label: 'AVG' },
  { value: 'count', label: 'COUNT' },
  { value: 'distinct_count', label: 'COUNT DISTINCT' },
  { value: 'min', label: 'MIN' },
  { value: 'max', label: 'MAX' },
  { value: 'median', label: 'MEDIAN' },
  { value: 'stddev', label: 'STDDEV' },
]

const DATE_GRANULARITIES: { value: DateGranularity; label: string }[] = [
  { value: 'year', label: 'Year' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'hour', label: 'Hour' },
  { value: 'minute', label: 'Minute' },
]

const TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  string: <Type className="h-3.5 w-3.5 text-blue-500" />,
  number: <Hash className="h-3.5 w-3.5 text-green-500" />,
  date: <Calendar className="h-3.5 w-3.5 text-orange-500" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5 text-purple-500" />,
  array: <Type className="h-3.5 w-3.5 text-pink-500" />,
  json: <Type className="h-3.5 w-3.5 text-gray-500" />,
}

interface ActiveFieldsProps {
  fields: FieldConfig[]
  onRemove: (fieldId: string) => void
  onUpdate: (fieldId: string, updates: Partial<FieldConfig>) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export function ActiveFields({ fields, onRemove, onUpdate, onReorder }: ActiveFieldsProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    const fromIndex = fields.findIndex((f) => f.id === active.id)
    const toIndex = fields.findIndex((f) => f.id === over.id)
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex)
    }
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
        <div className="rounded-lg border-2 border-dashed p-6">
          <p className="font-medium">No fields selected</p>
          <p className="text-xs mt-1">Add fields from the picker below</p>
        </div>
      </div>
    )
  }

  const activeField = fields.find((f) => f.id === activeId)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1 p-2">
          {fields.map((field) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              onRemove={onRemove}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeField && (
          <div className="rounded border bg-background p-2 shadow-lg text-sm font-medium opacity-80">
            {activeField.label}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface SortableFieldRowProps {
  field: FieldConfig
  onRemove: (fieldId: string) => void
  onUpdate: (fieldId: string, updates: Partial<FieldConfig>) => void
}

function SortableFieldRow({ field, onRemove, onUpdate }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(field.label)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  const saveLabel = () => {
    if (editLabel.trim()) {
      onUpdate(field.id, { label: editLabel.trim() })
    } else {
      setEditLabel(field.label)
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 rounded border bg-card px-2 py-1.5 text-xs"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Type icon */}
      <span className="shrink-0">{TYPE_ICONS[field.type]}</span>

      {/* Label */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveLabel()
                if (e.key === 'Escape') {
                  setEditLabel(field.label)
                  setIsEditing(false)
                }
              }}
              className="h-5 px-1 py-0 text-xs"
              autoFocus
            />
            <button onClick={saveLabel} className="text-green-600 hover:text-green-700">
              <Check className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="truncate font-medium">{field.label}</span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="text-muted-foreground truncate">
          {field.tableName}.{field.columnName}
        </div>
      </div>

      {/* Config */}
      <div className="flex items-center gap-1">
        {field.isMeasure && (
          <Select
            value={field.aggregation ?? 'sum'}
            onValueChange={(v) => onUpdate(field.id, { aggregation: v as AggregationType })}
          >
            <SelectTrigger className="h-5 w-20 px-1.5 text-xs border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGGREGATIONS.map((a) => (
                <SelectItem key={a.value} value={a.value} className="text-xs">
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {field.type === 'date' && (
          <Select
            value={field.dateGranularity ?? 'day'}
            onValueChange={(v) => onUpdate(field.id, { dateGranularity: v as DateGranularity })}
          >
            <SelectTrigger className="h-5 w-20 px-1.5 text-xs border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_GRANULARITIES.map((g) => (
                <SelectItem key={g.value} value={g.value} className="text-xs">
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(field.id)}
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
