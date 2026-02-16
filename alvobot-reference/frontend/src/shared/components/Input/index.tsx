import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'
import styles from './Input.module.css'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
  /** Size variant: 'sm' (32px), 'md' (36px), 'lg' (44px, default) */
  size?: 'sm' | 'md' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, fullWidth = false, size = 'lg', className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={clsx(styles.inputWrapper, error && styles.hasError)}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              styles.input,
              size === 'sm' && styles.inputSm,
              size === 'md' && styles.inputMd,
              leftIcon && styles.withLeftIcon,
              rightIcon && styles.withRightIcon
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>
        {error && (
          <span id={`${inputId}-error`} className={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${inputId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
