import type { ReactNode } from 'react'
import styles from './MasonryGrid.module.css'

interface MasonryGridProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  keyExtractor: (item: T) => string
  className?: string
}

export function MasonryGrid<T>({
  items,
  renderItem,
  keyExtractor,
  className,
}: MasonryGridProps<T>) {
  return (
    <div className={`${styles.grid} ${className || ''}`}>
      {items.map((item, index) => (
        <div key={keyExtractor(item)} className={styles.gridItem}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
