import styles from './SidebarSkeleton.module.css'

interface SidebarSkeletonProps {
  sections?: number
  itemsPerSection?: number[]
}

/**
 * Skeleton loading component for the sidebar.
 * Shows a placeholder while menu visibility config is loading.
 */
export function SidebarSkeleton({
  sections = 4,
  itemsPerSection = [4, 2, 2, 9],
}: SidebarSkeletonProps) {
  const textWidths = ['short', 'medium', 'long'] as const

  return (
    <div className={styles.skeleton}>
      {/* Logo placeholder */}
      <div className={styles.header}>
        <div className={styles.logoSkeleton} />
      </div>

      {/* Section placeholders */}
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div key={sectionIndex} className={styles.section}>
          <div className={styles.sectionTitle} />
          <div className={styles.navList}>
            {Array.from({ length: itemsPerSection[sectionIndex] || 3 }).map(
              (_, itemIndex) => (
                <div key={itemIndex} className={styles.navItem}>
                  <div className={styles.iconSkeleton} />
                  <div
                    className={`${styles.textSkeleton} ${
                      styles[textWidths[(sectionIndex + itemIndex) % 3]]
                    }`}
                  />
                </div>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
