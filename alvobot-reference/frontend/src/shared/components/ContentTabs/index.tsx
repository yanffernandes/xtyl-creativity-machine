import { type ReactNode, useCallback, useRef, type KeyboardEvent } from 'react'
import styles from './ContentTabs.module.css'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

export interface ContentTabsProps {
  /** Array of tab configurations */
  tabs: Tab[]
  /** Currently active tab ID */
  activeTab: string
  /** Callback when tab is clicked */
  onTabChange: (tabId: string) => void
  /** Optional class name */
  className?: string
  /** ARIA label for the tab list */
  ariaLabel?: string
  /** Optional content to render on the right side (e.g., action buttons) */
  rightContent?: ReactNode
}

/**
 * ContentTabs - Standard tabs component for page navigation
 * 
 * Based on CLAUDE.md Blueprint Section 4:
 * - Optional component (only when page needs view segmentation)
 * - Never mix with filters
 * - Can contain tabs or toggles
 * 
 * Accessibility (WCAG):
 * - role="tablist" for container
 * - role="tab" for each tab button
 * - aria-selected for current tab
 * - Arrow key navigation between tabs
 */
export function ContentTabs({ 
  tabs, 
  activeTab, 
  onTabChange,
  className,
  ariaLabel = 'Navegação por abas',
  rightContent,
}: ContentTabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null)
  
  // Arrow key navigation for tabs (WCAG 2.1.1 Keyboard)
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let newIndex: number | null = null
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault()
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = tabs.length - 1
        break
    }
    
    if (newIndex !== null) {
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      if (buttons?.[newIndex]) {
        buttons[newIndex].focus()
        onTabChange(tabs[newIndex].id)
      }
    }
  }, [tabs, onTabChange])
  
  return (
    <div className={`${styles.tabsContainer} ${className || ''}`}>
      <div 
        ref={tabListRef}
        className={styles.tabs}
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.icon && <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>}
              {tab.label}
            </button>
          )
        })}
      </div>
      {rightContent && (
        <div className={styles.rightContent}>
          {rightContent}
        </div>
      )}
    </div>
  )
}

export default ContentTabs
