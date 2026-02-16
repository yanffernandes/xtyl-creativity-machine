import { useState, useRef, useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import styles from './Tabs.module.css'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  badge?: string | number
}

export interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  onChange?: (tabId: string) => void
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(activeTab || tabs[0]?.id)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
  const tabsRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const active = activeTab !== undefined ? activeTab : internalActive

  const handleTabClick = (tabId: string) => {
    if (activeTab === undefined) {
      setInternalActive(tabId)
    }
    onChange?.(tabId)
  }

  useEffect(() => {
    const activeTabElement = tabRefs.current.get(active)
    if (activeTabElement && tabsRef.current) {
      const containerRect = tabsRef.current.getBoundingClientRect()
      const tabRect = activeTabElement.getBoundingClientRect()
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      })
    }
  }, [active, tabs])

  return (
    <div
      ref={tabsRef}
      className={clsx(
        styles.tabs,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el)
          }}
          className={clsx(
            styles.tab,
            active === tab.id && styles.active,
            tab.disabled && styles.disabled
          )}
          onClick={() => !tab.disabled && handleTabClick(tab.id)}
          disabled={tab.disabled}
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
        >
          {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
          <span className={styles.label}>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={styles.badge}>{tab.badge}</span>
          )}
        </button>
      ))}
      {variant === 'underline' && (
        <span
          className={styles.indicator}
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      )}
    </div>
  )
}

// Tab Panel
export interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  if (id !== activeTab) return null

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={id}
      className={clsx(styles.panel, className)}
    >
      {children}
    </div>
  )
}
