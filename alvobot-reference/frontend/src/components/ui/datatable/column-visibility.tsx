import * as React from 'react'
import { Columns3, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface ColumnConfig {
  id: string
  label: string
  defaultVisible?: boolean
}

export interface ColumnVisibilityProps {
  columns: ColumnConfig[]
  visibleColumns: string[]
  onChange: (visibleColumns: string[]) => void
  className?: string
  disabled?: boolean
}

export function ColumnVisibility({
  columns,
  visibleColumns,
  onChange,
  className,
  disabled = false,
}: ColumnVisibilityProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleToggle = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      onChange(visibleColumns.filter((id) => id !== columnId))
    } else {
      onChange([...visibleColumns, columnId])
    }
  }

  const handleReset = () => {
    const defaultVisible = columns
      .filter((col) => col.defaultVisible !== false)
      .map((col) => col.id)
    onChange(defaultVisible)
  }

  const handleSelectAll = () => {
    if (visibleColumns.length === columns.length) {
      // Keep at least one column visible
      onChange([columns[0].id])
    } else {
      onChange(columns.map((col) => col.id))
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2', className)}
          disabled={disabled}
        >
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">Colunas</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {visibleColumns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="end">
        {/* Header */}
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Colunas visíveis</p>
        </div>

        {/* Select All */}
        <div className="border-b px-3 py-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex w-full items-center gap-2 text-sm hover:text-primary"
          >
            <Checkbox
              checked={visibleColumns.length === columns.length}
              className="pointer-events-none"
            />
            <span>
              {visibleColumns.length === columns.length
                ? 'Desmarcar todas'
                : 'Selecionar todas'}
            </span>
          </button>
        </div>

        {/* Column list */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {columns.map((column) => (
            <button
              key={column.id}
              type="button"
              onClick={() => handleToggle(column.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                visibleColumns.includes(column.id) && 'text-foreground',
                !visibleColumns.includes(column.id) && 'text-muted-foreground'
              )}
            >
              <Checkbox
                checked={visibleColumns.includes(column.id)}
                className="pointer-events-none"
              />
              <span className="flex-1 text-left">{column.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="w-full justify-center gap-2"
          >
            <RotateCcw className="size-3" />
            Restaurar padrão
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
