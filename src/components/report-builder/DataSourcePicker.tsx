'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Database, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { DataSource, ConnectorType } from '@/types/insightsforge'

const CONNECTOR_ICONS: Record<ConnectorType, string> = {
  postgresql: '🐘',
  mysql: '🐬',
  mssql: '🪟',
  bigquery: '🔵',
  snowflake: '❄️',
  redshift: '🔴',
  mongodb: '🍃',
  clickhouse: '🟡',
  sqlite: '📦',
  csv_upload: '📄',
  rest_api: '🌐',
  google_sheets: '📊',
  centre3: '🏢',
  opssense: '🔧',
}

interface DataSourcePickerProps {
  selectedSourceId: string
  onSelect: (sourceId: string) => void
  disabled?: boolean
}

async function fetchDataSources(): Promise<DataSource[]> {
  const res = await fetch('/api/v1/data-sources')
  if (!res.ok) throw new Error('Failed to fetch data sources')
  const data = await res.json()
  return data.data ?? []
}

export function DataSourcePicker({ selectedSourceId, onSelect, disabled }: DataSourcePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['data-sources'],
    queryFn: fetchDataSources,
  })

  const selected = sources.find((s) => s.id === selectedSourceId)

  const filtered = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.type.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-8 max-w-[220px] justify-between gap-1 px-2 text-xs font-normal',
            !selected && 'text-muted-foreground'
          )}
        >
          <Database className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {selected ? (
              <>
                {CONNECTOR_ICONS[selected.type]} {selected.name}
              </>
            ) : (
              'Select data source'
            )}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Input
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {isLoading ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No data sources found
            </div>
          ) : (
            filtered.map((source) => (
              <button
                key={source.id}
                onClick={() => {
                  onSelect(source.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                  source.id === selectedSourceId && 'bg-accent'
                )}
              >
                <span className="text-base">{CONNECTOR_ICONS[source.type]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{source.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {source.type.replace('_', ' ')}
                  </div>
                </div>
                {source.id === selectedSourceId && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
                {!source.isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
