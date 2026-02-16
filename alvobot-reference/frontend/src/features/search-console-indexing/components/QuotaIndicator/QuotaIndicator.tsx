import styles from './QuotaIndicator.module.css'
import type { QuotaInfo } from '../../types'

interface Props {
  quota?: QuotaInfo | null
}

export function QuotaIndicator({ quota }: Props) {
  if (!quota) return null

  return (
    <div className={styles.container}>
      <div className={styles.item}>
        <span className={styles.label}>Indexação</span>
        <span className={styles.value}>{quota.publish_quota_used}/{quota.publish_quota_limit}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>Inspeções</span>
        <span className={styles.value}>{quota.inspection_quota_used}/{quota.inspection_quota_limit}</span>
      </div>
    </div>
  )
}
