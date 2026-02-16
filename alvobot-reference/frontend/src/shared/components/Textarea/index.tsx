import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import styles from './Textarea.module.css'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  fullWidth?: boolean
  resize?: 'none' | 'vertical' | 'horizontal' | 'both'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth = false, resize = 'vertical', className, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(styles.textarea, error && styles.hasError)}
          style={{ resize }}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error && (
          <span id={`${textareaId}-error`} className={styles.error} role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${textareaId}-hint`} className={styles.hint}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
