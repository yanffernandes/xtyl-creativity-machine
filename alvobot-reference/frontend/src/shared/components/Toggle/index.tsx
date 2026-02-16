import { forwardRef, useId } from 'react'
import * as Switch from '@radix-ui/react-switch'
import { clsx } from 'clsx'
import styles from './Toggle.module.css'

export interface ToggleProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** @deprecated Use onCheckedChange instead */
  onChange?: (e: { target: { checked: boolean } }) => void
  label?: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
  density?: 'default' | 'compact'
  error?: string
  disabled?: boolean
  required?: boolean
  name?: string
  value?: string
  id?: string
  className?: string
}

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      checked,
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
    const toggleId = id || generatedId

    // Backward compatibility: support legacy onChange prop
    const handleCheckedChange = (newChecked: boolean) => {
      onCheckedChange?.(newChecked)
      // Emit synthetic event for legacy onChange handlers
      onChange?.({ target: { checked: newChecked } })
    }

    return (
      <div className={clsx(styles.container, density === 'compact' && styles.compact, disabled && styles.disabled, className)}>
        <div className={styles.wrapper}>
          <Switch.Root
            ref={ref}
            id={toggleId}
            checked={checked}
            defaultChecked={defaultChecked}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            required={required}
            name={name}
            value={value}
            className={clsx(styles.root, styles[size])}
          >
            <Switch.Thumb className={styles.thumb} />
          </Switch.Root>
          {(label || description) && (
            <label htmlFor={toggleId} className={styles.content}>
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
)

Toggle.displayName = 'Toggle'
