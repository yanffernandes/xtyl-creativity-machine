import { useState, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { ChevronDown } from 'lucide-react'
import styles from './Accordion.module.css'

export interface AccordionItemData {
  id: string
  title: string
  content: ReactNode
  icon?: ReactNode
  disabled?: boolean
}

export interface AccordionProps {
  items: AccordionItemData[]
  defaultExpanded?: string[]
  allowMultiple?: boolean
  variant?: 'default' | 'bordered' | 'separated'
  className?: string
}

export function Accordion({
  items,
  defaultExpanded = [],
  allowMultiple = false,
  variant = 'default',
  className,
}: AccordionProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(defaultExpanded)

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId)
      }
      if (allowMultiple) {
        return [...prev, itemId]
      }
      return [itemId]
    })
  }

  return (
    <div className={clsx(styles.accordion, styles[variant], className)}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          {...item}
          isExpanded={expandedItems.includes(item.id)}
          onToggle={() => !item.disabled && toggleItem(item.id)}
        />
      ))}
    </div>
  )
}

// Single Accordion Item
interface AccordionItemProps extends AccordionItemData {
  isExpanded: boolean
  onToggle: () => void
}

function AccordionItem({
  id,
  title,
  content,
  icon,
  disabled,
  isExpanded,
  onToggle,
}: AccordionItemProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={clsx(
        styles.item,
        isExpanded && styles.expanded,
        disabled && styles.disabled
      )}
    >
      <button
        className={styles.trigger}
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${id}`}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        <ChevronDown
          size={20}
          className={clsx(styles.chevron, isExpanded && styles.chevronRotated)}
        />
      </button>
      <div
        id={`accordion-content-${id}`}
        ref={contentRef}
        className={styles.contentWrapper}
        style={{
          maxHeight: isExpanded ? contentRef.current?.scrollHeight : 0,
        }}
        role="region"
        aria-labelledby={id}
      >
        <div className={styles.content}>{content}</div>
      </div>
    </div>
  )
}

// Controlled single accordion item for custom usage
export interface AccordionPanelProps {
  title: string
  children: ReactNode
  icon?: ReactNode
  defaultExpanded?: boolean
  disabled?: boolean
  className?: string
}

export function AccordionPanel({
  title,
  children,
  icon,
  defaultExpanded = false,
  disabled = false,
  className,
}: AccordionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={clsx(
        styles.item,
        styles.standalone,
        isExpanded && styles.expanded,
        disabled && styles.disabled,
        className
      )}
    >
      <button
        className={styles.trigger}
        onClick={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled}
        aria-expanded={isExpanded}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        <ChevronDown
          size={20}
          className={clsx(styles.chevron, isExpanded && styles.chevronRotated)}
        />
      </button>
      <div
        ref={contentRef}
        className={styles.contentWrapper}
        style={{
          maxHeight: isExpanded ? contentRef.current?.scrollHeight : 0,
        }}
      >
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
