/**
 * SummaryCardsGrid Component
 *
 * A standardized grid of metric summary cards for dashboards.
 * Used by Revenue Dashboard, Ads Dashboard, and any future metric dashboards.
 *
 * Features:
 * - Responsive 6-column grid (6 → 3 → 2 → 1 columns)
 * - Skeleton loading state
 * - Configurable cards with icons and colors
 * - Optional currency info message
 * - Memoized for performance
 */

import { memo, type ReactNode, type ComponentType } from 'react'
import styles from './SummaryCardsGrid.module.css'
import type { LucideProps } from 'lucide-react'

export interface CardConfig {
  /** Lucide icon component */
  icon: ComponentType<LucideProps>
  /** Card label (e.g., "Receita", "Impressões") */
  label: string
  /** Formatted value to display */
  value: string
  /** Icon background/text color (hex) */
  color: string
  /** Optional tooltip text */
  tooltip?: string
}

export interface SummaryCardsGridProps {
  /** Array of card configurations */
  cards: CardConfig[]
  /** Show skeleton loading state */
  isLoading?: boolean
  /** Optional info message displayed above cards (e.g., currency conversion info) */
  infoMessage?: ReactNode
  /** Optional className for the container */
  className?: string
}

function SkeletonCard() {
  return (
    <div className={`${styles.card} ${styles.skeleton}`}>
      <div className={styles.skeletonIcon} />
      <div className={styles.cardContent}>
        <div className={styles.skeletonLabel} />
        <div className={styles.skeletonValue} />
      </div>
    </div>
  )
}

export const SummaryCardsGrid = memo(function SummaryCardsGrid({
  cards,
  isLoading = false,
  infoMessage,
  className,
}: SummaryCardsGridProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <div className={styles.container}>
          {Array.from({ length: cards.length || 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {infoMessage && <div className={styles.infoMessage}>{infoMessage}</div>}
      <div className={styles.container}>
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={styles.card}
              title={card.tooltip}
            >
              <div
                className={styles.cardIcon}
                style={{
                  backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)`,
                  color: card.color,
                }}
              >
                <Icon size={20} />
              </div>
              <div className={styles.cardContent}>
                <span className={styles.cardLabel}>{card.label}</span>
                <span className={styles.cardValue}>{card.value}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default SummaryCardsGrid
