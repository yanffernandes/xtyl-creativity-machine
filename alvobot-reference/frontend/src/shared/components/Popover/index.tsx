import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import styles from './Popover.module.css'

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  showCloseButton?: boolean
  className?: string
  contentClassName?: string
  contentStyle?: CSSProperties
  open?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}

export function PopoverContent({
  className,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  collisionPadding = 16,
  ...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={clsx(styles.popover, className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export function Popover({
  trigger,
  children,
  position = 'bottom',
  align = 'center',
  showCloseButton = false,
  className,
  contentClassName,
  contentStyle,
  open,
  onOpenChange,
  modal = false,
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <PopoverPrimitive.Trigger asChild>
        <span className={clsx(styles.trigger, className)}>{trigger}</span>
      </PopoverPrimitive.Trigger>
      <PopoverContent
        side={position}
        align={align}
        className={contentClassName}
        style={contentStyle}
      >
        {showCloseButton && (
          <PopoverPrimitive.Close asChild>
            <button className={styles.closeButton} aria-label="Fechar">
              <X size={16} />
            </button>
          </PopoverPrimitive.Close>
        )}
        {children}
        <PopoverPrimitive.Arrow className={styles.arrow} />
      </PopoverContent>
    </PopoverPrimitive.Root>
  )
}

// Export primitives for advanced composition
export const PopoverRoot = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close
export const PopoverAnchor = PopoverPrimitive.Anchor
