import * as React from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type ExportFormat = 'csv' | 'xlsx'

export interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void
  isExporting?: boolean
  disabled?: boolean
  className?: string
  formats?: ExportFormat[]
}

const FORMAT_CONFIG: Record<
  ExportFormat,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  csv: { label: 'Exportar CSV', icon: FileText },
  xlsx: { label: 'Exportar Excel', icon: FileSpreadsheet },
}

export function ExportDropdown({
  onExport,
  isExporting = false,
  disabled = false,
  className,
  formats = ['csv', 'xlsx'],
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2', className)}
          disabled={disabled || isExporting}
        >
          <Download className={cn('size-4', isExporting && 'animate-pulse')} />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        {formats.map((format) => {
          const config = FORMAT_CONFIG[format]
          const Icon = config.icon
          return (
            <DropdownMenuItem
              key={format}
              onClick={() => onExport(format)}
              className="gap-2"
            >
              <Icon className="size-4" />
              {config.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
