import * as React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface AccountOption {
  id: string
  name: string
  platform?: string
  disabled?: boolean
}

export interface AccountGroup {
  label: string
  platform: string
  icon?: React.ReactNode
  options: AccountOption[]
}

export interface AccountFilterProps {
  groups: AccountGroup[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  showSearch?: boolean
  maxDisplayItems?: number
}

export function AccountFilter({
  groups,
  selectedIds,
  onChange,
  placeholder = 'Selecionar contas',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhuma conta encontrada',
  className,
  disabled = false,
  showSearch = true,
  maxDisplayItems = 2,
}: AccountFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  // Flatten all options for counting
  const allOptions = React.useMemo(
    () => groups.flatMap((g) => g.options),
    [groups]
  )

  // Filter options by search
  const filteredGroups = React.useMemo(() => {
    if (!search.trim()) return groups

    const searchLower = search.toLowerCase()
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((opt) =>
          opt.name.toLowerCase().includes(searchLower)
        ),
      }))
      .filter((group) => group.options.length > 0)
  }, [groups, search])

  // Toggle single option
  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  // Select all options in a group
  const handleSelectGroup = (group: AccountGroup, selected: boolean) => {
    const groupIds = group.options.map((o) => o.id)
    if (selected) {
      onChange([...new Set([...selectedIds, ...groupIds])])
    } else {
      onChange(selectedIds.filter((id) => !groupIds.includes(id)))
    }
  }

  // Check if all options in a group are selected
  const isGroupSelected = (group: AccountGroup) =>
    group.options.every((o) => selectedIds.includes(o.id))

  // Check if some options in a group are selected
  const isGroupIndeterminate = (group: AccountGroup) =>
    group.options.some((o) => selectedIds.includes(o.id)) && !isGroupSelected(group)

  // Select/deselect all
  const handleSelectAll = () => {
    if (selectedIds.length === allOptions.length) {
      onChange([])
    } else {
      onChange(allOptions.map((o) => o.id))
    }
  }

  // Display text for trigger
  const displayText = React.useMemo(() => {
    if (selectedIds.length === 0) return placeholder
    if (selectedIds.length === allOptions.length) return 'Todas as contas'

    const selectedOptions = allOptions.filter((o) => selectedIds.includes(o.id))
    if (selectedOptions.length <= maxDisplayItems) {
      return selectedOptions.map((o) => o.name).join(', ')
    }
    return `${selectedIds.length} contas selecionadas`
  }, [selectedIds, allOptions, placeholder, maxDisplayItems])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 min-w-[200px] justify-between gap-2 text-left font-normal',
            selectedIds.length === 0 && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {/* Search */}
        {showSearch && (
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Select All */}
        <div className="border-b p-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox
              checked={selectedIds.length === allOptions.length}
              className="pointer-events-none"
            />
            <span className="flex-1 text-left">
              {selectedIds.length === allOptions.length
                ? 'Desmarcar todas'
                : 'Selecionar todas'}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedIds.length}/{allOptions.length}
            </span>
          </button>
        </div>

        {/* Groups */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.platform} className="mb-3 last:mb-0">
                {/* Group header */}
                <button
                  type="button"
                  onClick={() =>
                    handleSelectGroup(group, !isGroupSelected(group))
                  }
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent"
                >
                  <Checkbox
                    checked={isGroupSelected(group)}
                    className={cn(
                      'pointer-events-none',
                      isGroupIndeterminate(group) && 'data-[state=checked]:bg-muted'
                    )}
                  />
                  {group.icon}
                  <span>{group.label}</span>
                  <span className="ml-auto text-[10px] font-normal">
                    {group.options.filter((o) => selectedIds.includes(o.id)).length}/
                    {group.options.length}
                  </span>
                </button>

                {/* Group options */}
                <div className="ml-4 mt-1 space-y-0.5">
                  {group.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleToggle(option.id)}
                      disabled={option.disabled}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                        option.disabled && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.includes(option.id)}
                        disabled={option.disabled}
                        className="pointer-events-none"
                      />
                      <span className="flex-1 truncate text-left">
                        {option.name}
                      </span>
                      {selectedIds.includes(option.id) && (
                        <Check className="size-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
