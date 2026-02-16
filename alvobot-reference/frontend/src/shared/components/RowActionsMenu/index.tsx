import type { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '../Button'
import styles from './RowActionsMenu.module.css'

export type RowActionItem =
  | {
      type?: 'item'
      label: string
      onSelect: () => void
      icon?: ReactNode
      disabled?: boolean
      destructive?: boolean
    }
  | {
      type: 'separator'
    }

export interface RowActionsMenuProps {
  items: RowActionItem[]
  ariaLabel?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  stopPropagation?: boolean
}

export function RowActionsMenu({
  items,
  ariaLabel = 'Ações',
  align = 'end',
  side = 'bottom',
  className,
  stopPropagation = true,
}: RowActionsMenuProps) {
  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  const handleTriggerPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-md"
          className={styles.trigger}
          aria-label={ariaLabel}
          onClick={handleTriggerClick}
          onPointerDown={handleTriggerPointerDown}
        >
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={className}>
        {items.map((item, index) => {
          if (item.type === 'separator') {
            return <DropdownMenuSeparator key={`separator-${index}`} />
          }

          return (
            <DropdownMenuItem
              key={`${item.label}-${index}`}
              onClick={item.onSelect}
              disabled={item.disabled}
              variant={item.destructive ? 'destructive' : 'default'}
            >
              {item.icon && <span className={styles.menuItemIcon}>{item.icon}</span>}
              {item.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
