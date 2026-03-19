'use client'

import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { JoinConfig as JoinConfigType, JoinType, JoinCondition } from '@/lib/query-engine/types'
import { DataSource } from '@/types/insightsforge'
import { v4 as uuidv4 } from 'uuid'

const JOIN_TYPES: { value: JoinType; label: string; description: string }[] = [
  { value: 'inner', label: 'INNER JOIN', description: 'Only matching rows' },
  { value: 'left', label: 'LEFT JOIN', description: 'All left rows + matching right' },
  { value: 'right', label: 'RIGHT JOIN', description: 'Matching left + all right rows' },
  { value: 'full', label: 'FULL JOIN', description: 'All rows from both tables' },
]

const JOIN_OPERATORS = ['=', '!=', '<', '>', '<=', '>='] as const

interface JoinConfigProps {
  joins: JoinConfigType[]
  primarySourceId: string
  availableSources: DataSource[]
  onUpdate: (joins: JoinConfigType[]) => void
}

export function JoinConfig({ joins, primarySourceId, availableSources, onUpdate }: JoinConfigProps) {
  const addJoin = () => {
    if (joins.length >= 3) return
    const otherSource = availableSources.find((s) => s.id !== primarySourceId)
    if (!otherSource) return
    const newJoin: JoinConfigType = {
      id: uuidv4(),
      leftSourceId: primarySourceId,
      rightSourceId: otherSource.id,
      joinType: 'left',
      conditions: [
        {
          leftField: '',
          rightField: '',
          operator: '=',
        },
      ],
    }
    onUpdate([...joins, newJoin])
  }

  const removeJoin = (joinId: string) => {
    onUpdate(joins.filter((j) => j.id !== joinId))
  }

  const updateJoin = (joinId: string, updates: Partial<JoinConfigType>) => {
    onUpdate(joins.map((j) => (j.id === joinId ? { ...j, ...updates } : j)))
  }

  const addCondition = (joinId: string) => {
    updateJoin(joinId, {
      conditions: [
        ...(joins.find((j) => j.id === joinId)?.conditions ?? []),
        { leftField: '', rightField: '', operator: '=' },
      ],
    })
  }

  const removeCondition = (joinId: string, condIdx: number) => {
    const join = joins.find((j) => j.id === joinId)
    if (!join) return
    updateJoin(joinId, {
      conditions: join.conditions.filter((_, i) => i !== condIdx),
    })
  }

  const updateCondition = (joinId: string, condIdx: number, updates: Partial<JoinCondition>) => {
    const join = joins.find((j) => j.id === joinId)
    if (!join) return
    updateJoin(joinId, {
      conditions: join.conditions.map((c, i) => (i === condIdx ? { ...c, ...updates } : c)),
    })
  }

  return (
    <div className="space-y-3 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">SOURCE JOINS</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={addJoin}
          disabled={joins.length >= 3 || availableSources.length < 2}
          className="h-7 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Join
        </Button>
      </div>

      {joins.length === 0 ? (
        <div className="rounded border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
          No joins configured. Click "Add Join" to join another data source.
        </div>
      ) : (
        <div className="space-y-3">
          {joins.map((join, joinIdx) => (
            <JoinRow
              key={join.id}
              join={join}
              joinIdx={joinIdx}
              availableSources={availableSources}
              primarySourceId={primarySourceId}
              onRemove={() => removeJoin(join.id)}
              onUpdate={(updates) => updateJoin(join.id, updates)}
              onAddCondition={() => addCondition(join.id)}
              onRemoveCondition={(condIdx) => removeCondition(join.id, condIdx)}
              onUpdateCondition={(condIdx, updates) => updateCondition(join.id, condIdx, updates)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface JoinRowProps {
  join: JoinConfigType
  joinIdx: number
  availableSources: DataSource[]
  primarySourceId: string
  onRemove: () => void
  onUpdate: (updates: Partial<JoinConfigType>) => void
  onAddCondition: () => void
  onRemoveCondition: (condIdx: number) => void
  onUpdateCondition: (condIdx: number, updates: Partial<JoinCondition>) => void
}

function JoinRow({
  join,
  joinIdx,
  availableSources,
  primarySourceId,
  onRemove,
  onUpdate,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
}: JoinRowProps) {
  const [expanded, setExpanded] = useState(true)
  const leftSource = availableSources.find((s) => s.id === join.leftSourceId)
  const rightSource = availableSources.find((s) => s.id === join.rightSourceId)

  return (
    <div className="rounded border bg-card">
      <div
        className="flex cursor-pointer items-center gap-2 p-2"
        onClick={() => setExpanded((e) => !e)}
      >
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', !expanded && '-rotate-90')}
        />
        <Badge variant="outline" className="text-xs font-mono">
          {join.joinType.toUpperCase()} JOIN
        </Badge>
        <span className="text-xs text-muted-foreground">
          {leftSource?.name ?? 'Source'} → {rightSource?.name ?? 'Target'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="border-t p-2 space-y-2">
          {/* Join type */}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Type</span>
            <Select
              value={join.joinType}
              onValueChange={(v) => onUpdate({ joinType: v as JoinType })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOIN_TYPES.map((jt) => (
                  <SelectItem key={jt.value} value={jt.value} className="text-xs">
                    <span className="font-mono font-medium">{jt.label}</span>
                    <span className="ml-2 text-muted-foreground">{jt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right source */}
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">Source</span>
            <Select
              value={join.rightSourceId}
              onValueChange={(v) => onUpdate({ rightSourceId: v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Select source…" />
              </SelectTrigger>
              <SelectContent>
                {availableSources
                  .filter((s) => s.id !== primarySourceId)
                  .map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground font-medium">Join conditions</span>
            {join.conditions.map((cond, condIdx) => (
              <div key={condIdx} className="flex items-center gap-1">
                {condIdx > 0 && (
                  <span className="w-6 text-center text-xs font-semibold text-muted-foreground">
                    AND
                  </span>
                )}
                <Input
                  placeholder="left.field"
                  value={cond.leftField}
                  onChange={(e) => onUpdateCondition(condIdx, { leftField: e.target.value })}
                  className="h-6 text-xs font-mono"
                />
                <Select
                  value={cond.operator}
                  onValueChange={(v) =>
                    onUpdateCondition(condIdx, {
                      operator: v as JoinCondition['operator'],
                    })
                  }
                >
                  <SelectTrigger className="h-6 w-14 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOIN_OPERATORS.map((op) => (
                      <SelectItem key={op} value={op} className="text-xs font-mono">
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="right.field"
                  value={cond.rightField}
                  onChange={(e) => onUpdateCondition(condIdx, { rightField: e.target.value })}
                  className="h-6 text-xs font-mono"
                />
                {join.conditions.length > 1 && (
                  <button
                    onClick={() => onRemoveCondition(condIdx)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={onAddCondition}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              Add condition
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
