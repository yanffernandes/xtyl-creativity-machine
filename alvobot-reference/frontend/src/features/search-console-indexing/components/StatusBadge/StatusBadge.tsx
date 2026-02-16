import type { ComponentType } from 'react'
import { CheckCircle, Clock, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'
import { Badge } from '@/shared/components'
import styles from './StatusBadge.module.css'
import type { IndexingStatus } from '../../types'

const statusConfig: Record<IndexingStatus, { label: string; icon: ComponentType<{ size?: number }>; variant: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
  indexed: { label: 'Indexada', icon: CheckCircle, variant: 'success' },
  in_progress: { label: 'Em progresso', icon: Clock, variant: 'info' },
  not_indexed: { label: 'Não indexada', icon: XCircle, variant: 'error' },
  error: { label: 'Erro', icon: AlertTriangle, variant: 'warning' },
  not_checked: { label: 'Não verificada', icon: HelpCircle, variant: 'default' },
}

export function StatusBadge({ status }: { status: IndexingStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} size="sm" className={styles.badge}>
      <Icon size={14} />
      <span>{config.label}</span>
    </Badge>
  )
}
