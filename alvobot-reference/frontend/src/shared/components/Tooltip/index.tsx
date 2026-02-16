import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { clsx } from 'clsx'
import styles from './Tooltip.module.css'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
  className?: string
}

export function TooltipContent({
  className,
  side = 'top',
  sideOffset = 8,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        className={clsx(styles.tooltip, className)}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className={styles.arrow} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  disabled = false,
  className,
}: TooltipProps) {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span className={styles.trigger}>{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipContent side={position} className={className}>
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

// Export Provider for app-level usage (optional)
export const TooltipProvider = TooltipPrimitive.Provider
export const TooltipRoot = TooltipPrimitive.Root
export const TooltipTrigger = TooltipPrimitive.Trigger
