import { memo, forwardRef, useId, useState, useCallback } from 'react'
import { clsx } from 'clsx'
import { Check, Minus } from 'lucide-react'
import styles from './Checkbox.module.css'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  /** @deprecated Use onCheckedChange instead */
  onChange?: (e: { target: { checked: boolean } }) => void
  label?: string
  description?: string
  size?: 'sm' | 'md'
  density?: 'default' | 'compact'
  error?: string
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
}

function getState(checked: boolean | 'indeterminate' | undefined): string {
  if (checked === 'indeterminate') return 'indeterminate'
  return checked ? 'checked' : 'unchecked'
}

export const Checkbox = memo(forwardRef<HTMLButtonElement, CheckboxProps>(
  (
    {
      checked: checkedProp,
      defaultChecked,
      onCheckedChange,
      onChange,
      label,
      description,
      size = 'md',
      density = 'default',
      error,
      disabled,
      required,
      name,
      value,
      id,
      className,
    },
    ref
  ) => {
    const generatedId = useId()
    const checkboxId = id || generatedId

    // Internal state for uncontrolled mode
    const [internalChecked, setInternalChecked] = useState<boolean | 'indeterminate'>(
      defaultChecked ?? false
    )

    const isControlled = checkedProp !== undefined
    const checked = isControlled ? checkedProp : internalChecked

    const handleClick = useCallback(() => {
      if (disabled) return

      const newChecked = checked === 'indeterminate' ? true : !checked

      if (!isControlled) {
        setInternalChecked(newChecked)
      }

      onCheckedChange?.(newChecked)
      if (typeof newChecked === 'boolean') {
        onChange?.({ target: { checked: newChecked } })
      }
    }, [disabled, checked, isControlled, onCheckedChange, onChange])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleClick()
      }
    }, [handleClick])

    const iconSize = size === 'sm' ? 12 : 14
    const dataState = getState(checked)
    const isCheckedOrIndeterminate = checked === true || checked === 'indeterminate'

    return (
      <div className={clsx(styles.wrapper, styles[size], density === 'compact' && styles.compact, className)}>
        <div className={clsx(styles.container, disabled && styles.disabled)}>
          <button
            ref={ref}
            type="button"
            role="checkbox"
            aria-checked={checked === 'indeterminate' ? 'mixed' : !!checked}
            aria-required={required}
            data-state={dataState}
            data-disabled={disabled ? '' : undefined}
            disabled={disabled}
            id={checkboxId}
            name={name}
            value={value}
            className={clsx(styles.checkbox, styles[size], error && styles.hasError)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
          >
            {isCheckedOrIndeterminate && (
              <span className={styles.indicator}>
                {checked === 'indeterminate' ? (
                  <Minus size={iconSize} className={styles.icon} />
                ) : (
                  <Check size={iconSize} className={styles.icon} />
                )}
              </span>
            )}
          </button>
          {(label || description) && (
            <label htmlFor={checkboxId} className={styles.content}>
              {label && <span className={styles.label}>{label}</span>}
              {description && <span className={styles.description}>{description}</span>}
            </label>
          )}
        </div>
        {error && (
          <span className={styles.error} role="alert">
            {error}
          </span>
        )}
      </div>
    )
  }
))

Checkbox.displayName = 'Checkbox'
