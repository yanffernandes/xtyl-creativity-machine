import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import styles from './Glass.module.css'

export interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  variant?: 'light' | 'dark' | 'frosted' | 'subtle' | 'tinted'
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  gradientBorder?: boolean
  glow?: boolean
  noise?: boolean
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'nav'
  className?: string
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(
  (
    {
      children,
      variant = 'light',
      blur = 'md',
      rounded = 'lg',
      shadow = 'md',
      gradientBorder = false,
      glow = false,
      noise = false,
      as: Component = 'div',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={clsx(
          styles.glass,
          styles[variant],
          styles[`blur-${blur}`],
          styles[`rounded-${rounded}`],
          styles[`shadow-${shadow}`],
          gradientBorder && styles.gradientBorder,
          glow && styles.glow,
          noise && styles.noise,
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Glass.displayName = 'Glass'

// Preset components for common use cases

export interface GlassCardProps extends Omit<GlassProps, 'as'> {
  children?: ReactNode
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <Glass
      as="article"
      className={clsx(styles.glassCard, className)}
      {...props}
    >
      {children}
    </Glass>
  )
}

export interface GlassPanelProps extends Omit<GlassProps, 'as'> {
  children?: ReactNode
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <Glass
      as="aside"
      className={clsx(styles.glassPanel, className)}
      {...props}
    >
      {children}
    </Glass>
  )
}

export interface GlassButtonProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode
  variant?: 'light' | 'dark' | 'frosted' | 'subtle' | 'tinted'
  disabled?: boolean
}

export function GlassButton({
  children,
  variant = 'light',
  disabled = false,
  className,
  ...props
}: GlassButtonProps) {
  return (
    <button
      className={clsx(
        styles.glass,
        styles[variant],
        styles['blur-md'],
        styles.glassButton,
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export interface GlassInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'light' | 'frosted' | 'subtle'
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ variant = 'light', className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={clsx(
          styles.glass,
          styles[variant],
          styles['blur-md'],
          styles.glassInput,
          className
        )}
        {...props}
      />
    )
  }
)

GlassInput.displayName = 'GlassInput'

export interface GlassBadgeProps {
  children?: ReactNode
  variant?: 'light' | 'dark' | 'frosted' | 'subtle' | 'tinted'
  className?: string
}

export function GlassBadge({
  children,
  variant = 'light',
  className,
}: GlassBadgeProps) {
  return (
    <span
      className={clsx(
        styles.glass,
        styles[variant],
        styles['blur-sm'],
        styles.glassBadge,
        className
      )}
    >
      {children}
    </span>
  )
}

export interface GlassOverlayProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
}

export function GlassOverlay({
  children,
  className,
  ...props
}: GlassOverlayProps) {
  return (
    <div className={clsx(styles.glassOverlay, className)} {...props}>
      {children}
    </div>
  )
}
