import { CheckCircle, Clock, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import { Card } from '@/shared/components'
import styles from './IndexingSummaryCards.module.css'
import type { IndexingStats } from '../../types'

interface Props {
  stats?: IndexingStats
  isLoading?: boolean
}

const cardConfigs = [
  { key: 'indexed', label: 'Indexadas', icon: CheckCircle, iconClass: styles.statusSuccess },
  { key: 'in_progress', label: 'Em progresso', icon: Clock, iconClass: styles.statusInfo },
  { key: 'not_indexed', label: 'Não indexadas', icon: XCircle, iconClass: styles.statusError },
  { key: 'error', label: 'Erros', icon: AlertTriangle, iconClass: styles.statusWarning },
  { key: 'not_checked', label: 'Não verificadas', icon: HelpCircle, iconClass: styles.statusMuted },
] as const

export function IndexingSummaryCards({ stats, isLoading }: Props) {
  return (
    <div className={styles.grid}>
      {cardConfigs.map((config) => {
        const Icon = config.icon
        const value = stats ? stats[config.key as keyof IndexingStats] as number : 0
        const percent = stats ? stats[`${config.key}_percent` as keyof IndexingStats] as number : 0

        return (
          <Card key={config.key} className={styles.card}>
            <div className={styles.cardHeader}>
            <div className={`${styles.icon} ${config.iconClass}`}>
                <Icon size={16} />
              </div>
              <span className={styles.label}>{config.label}</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.value}>{isLoading ? '—' : value}</span>
              <span className={styles.percent}>{isLoading ? '' : `${percent}%`}</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
