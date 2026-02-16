import { useState, type ReactNode } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { Check, ChevronDown } from 'lucide-react'
import styles from './DropdownSelect.module.css'

export interface DropdownSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface DropdownSelectGroup {
  id: string
  label: string
  options: DropdownSelectOption[]
}

export interface DropdownSelectProps {
  /** The trigger button content - can be an icon + text */
  trigger: ReactNode
  /** Optional badge/count to show on the trigger button */
  badge?: ReactNode
  /** Title shown in the dropdown header */
  title?: string
  /** Options to display (flat list) */
  options?: DropdownSelectOption[]
  /** Grouped options to display (with section headers) */
  groups?: DropdownSelectGroup[]
  /** Currently selected values */
  value: string[]
  /** Callback when selection changes */
  onChange: (values: string[]) => void
  /** Show "Select All" / "Deselect All" buttons in header */
  showSelectAllActions?: boolean
  /** Custom label for "Select All" */
  selectAllLabel?: string
  /** Custom label for "Deselect All" */
  deselectAllLabel?: string
  /** Show footer with reset button */
  showResetButton?: boolean
  /** Custom label for reset button */
  resetLabel?: string
  /** Callback when reset is clicked */
  onReset?: () => void
  /** Disabled state */
  disabled?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Tooltip for the trigger button */
  tooltip?: string
  /** Alignment of the dropdown */
  align?: 'start' | 'end'
  /** Min width of the dropdown */
  minWidth?: number
  /** Max height of options container */
  maxHeight?: number
  /** Class name for wrapper */
  className?: string
  /** Size variant: 'sm' (32px), 'md' (36px, default), 'lg' (44px) */
  size?: 'sm' | 'md' | 'lg'
}

export function DropdownSelect({
  trigger,
  badge,
  title,
  options = [],
  groups = [],
  value,
  onChange,
  showSelectAllActions = false,
  selectAllLabel = 'Todas',
  deselectAllLabel = 'Nenhuma',
  showResetButton = false,
  resetLabel = 'Restaurar padrão',
  onReset,
  disabled = false,
  isLoading = false,
  tooltip,
  align = 'end',
  minWidth = 200,
  maxHeight = 300,
  className,
  size = 'md',
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Get all options (flat list or from groups)
  const allOptions = groups.length > 0
    ? groups.flatMap(g => g.options)
    : options

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleSelectAll = () => {
    const allValues = allOptions.filter(o => !o.disabled).map(o => o.value)
    onChange(allValues)
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  const renderOption = (option: DropdownSelectOption) => {
    const isSelected = value.includes(option.value)
    return (
      <button
        key={option.value}
        type="button"
        className={clsx(
          styles.option,
          isSelected && styles.optionActive,
          option.disabled && styles.optionDisabled
        )}
        onClick={() => !option.disabled && handleToggle(option.value)}
        disabled={option.disabled}
      >
        <span className={styles.checkbox}>
          {isSelected && <Check size={14} />}
        </span>
        <span className={styles.optionLabel}>{option.label}</span>
      </button>
    )
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={clsx(
            styles.triggerButton,
            size === 'sm' && styles.triggerButtonSm,
            size === 'lg' && styles.triggerButtonLg,
            className
          )}
          disabled={disabled || isLoading}
          title={tooltip}
          data-state={isOpen ? 'open' : 'closed'}
        >
          {trigger}
          {badge !== undefined && (
            <span className={styles.badge}>{badge}</span>
          )}
          <ChevronDown
            size={14}
            className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
          />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align={align}
          sideOffset={8}
          collisionPadding={16}
          className={styles.dropdown}
          style={{ minWidth }}
        >
          {/* Header */}
          {(title || showSelectAllActions) && (
            <div className={styles.header}>
              {title && <span className={styles.title}>{title}</span>}
              {showSelectAllActions && (
                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleSelectAll}
                  >
                    {selectAllLabel}
                  </button>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={handleDeselectAll}
                  >
                    {deselectAllLabel}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className={styles.options} style={{ maxHeight }}>
            {groups.length > 0 ? (
              // Render grouped options
              groups.map((group) => (
                <div key={group.id} className={styles.group}>
                  <div className={styles.groupLabel}>{group.label}</div>
                  {group.options.map(renderOption)}
                </div>
              ))
            ) : (
              // Render flat options
              options.map(renderOption)
            )}
          </div>

          {/* Footer */}
          {showResetButton && onReset && (
            <div className={styles.footer}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={() => {
                  onReset()
                  setIsOpen(false)
                }}
              >
                {resetLabel}
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

DropdownSelect.displayName = 'DropdownSelect'
