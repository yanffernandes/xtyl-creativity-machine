/**
 * ObjectiveBadge Component
 *
 * Displays translated campaign objective and special ad category badges
 * for Meta Ads campaigns.
 */

import { Tooltip } from '@/shared/components'
import styles from './ObjectiveBadge.module.css'
import { getObjectiveInfo, getSpecialAdCategoryInfo } from '../../utils/metaTranslations'

interface ObjectiveBadgeProps {
  objective?: string
  specialAdCategories?: string[]
  platform?: 'google' | 'meta'
}

export function ObjectiveBadge({ objective, specialAdCategories, platform }: ObjectiveBadgeProps) {
  // Only show for Meta campaigns for now
  if (platform !== 'meta') return null

  const objectiveInfo = getObjectiveInfo(objective)
  const hasSpecialCategories = specialAdCategories && specialAdCategories.length > 0

  if (!objectiveInfo && !hasSpecialCategories) return null

  return (
    <div className={styles.badgeContainer}>
      {/* Objective badge */}
      {objectiveInfo && (
        <Tooltip content={objectiveInfo.description}>
          <span
            className={styles.objectiveBadge}
            style={{ backgroundColor: `${objectiveInfo.color}20`, color: objectiveInfo.color }}
          >
            {objectiveInfo.label}
          </span>
        </Tooltip>
      )}

      {/* Special ad category badges */}
      {hasSpecialCategories && specialAdCategories.map((category) => {
        const categoryInfo = getSpecialAdCategoryInfo(category)
        if (!categoryInfo) return null

        return (
          <Tooltip key={category} content={categoryInfo.description}>
            <span
              className={styles.specialCategoryBadge}
              style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
            >
              {categoryInfo.label}
            </span>
          </Tooltip>
        )
      })}
    </div>
  )
}
