import { forwardRef, useId } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { clsx } from 'clsx'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** @deprecated Use onValueChange instead */
  onChange?: (e: { target: { value: string } }) => void
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
  disabled?: boolean
  required?: boolean
  name?: string
  id?: string
  className?: string
  style?: React.CSSProperties
  /** Size variant: 'sm' (32px), 'md' (36px), 'lg' (44px, default) */
  size?: 'sm' | 'md' | 'lg'
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      onChange,
      label,
      error,
      hint,
      options,
      placeholder = 'Selecione...',
      fullWidth = false,
      disabled,
      required,
      name,
      id,
      className,
      size = 'lg',
    },
    ref
  ) => {
    const generatedId = useId()
    const selectId = id || generatedId

    // Convert empty string to __empty__ for Radix compatibility
    const normalizeValue = (val: string | undefined) => (val === '' ? '__empty__' : val)
    const denormalizeValue = (val: string) => (val === '__empty__' ? '' : val)

    // Backward compatibility: support legacy onChange prop
    const handleValueChange = (newValue: string) => {
      const actualValue = denormalizeValue(newValue)
      onValueChange?.(actualValue)
      // Emit synthetic event for legacy onChange handlers
      onChange?.({ target: { value: actualValue } })
    }

    return (
      <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={normalizeValue(value)}
          defaultValue={normalizeValue(defaultValue)}
          onValueChange={handleValueChange}
          disabled={disabled}
          required={required}
          name={name}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={selectId}
            className={clsx(
              styles.trigger,
              size === 'sm' && styles.triggerSm,
              size === 'md' && styles.triggerMd,
              error && styles.hasError
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
            }
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon className={styles.icon}>
              <ChevronDown size={16} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content className={styles.content} position="popper" sideOffset={4}>
              <SelectPrimitive.ScrollUpButton className={styles.scrollButton}>
                <ChevronUp size={16} />
              </SelectPrimitive.ScrollUpButton>

              <SelectPrimitive.Viewport className={styles.viewport}>
                {options.map((option) => {
                  // Radix Select doesn't allow empty string values
                  // Use __empty__ as placeholder value for "all" options
                  const itemValue = option.value === '' ? '__empty__' : option.value
                  return (
                    <SelectPrimitive.Item
                      key={itemValue}
                      value={itemValue}
                      disabled={option.disabled}
                      className={styles.item}
                    >
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator className={styles.itemIndicator}>
                        <Check size={14} />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  )
                })}
              </SelectPrimitive.Viewport>

              <SelectPrimitive.ScrollDownButton className={styles.scrollButton}>
                <ChevronDown size={16} />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {error && (
          <span id={`${selectId}-error`} className={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${selectId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

// Export primitives for advanced composition
export const SelectRoot = SelectPrimitive.Root
export const SelectTrigger = SelectPrimitive.Trigger
export const SelectValue = SelectPrimitive.Value
export const SelectContent = SelectPrimitive.Content
export const SelectItem = SelectPrimitive.Item
export const SelectGroup = SelectPrimitive.Group
export const SelectLabel = SelectPrimitive.Label
export const SelectSeparator = SelectPrimitive.Separator
