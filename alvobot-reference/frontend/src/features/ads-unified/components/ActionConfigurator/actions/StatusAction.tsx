/**
 * StatusAction — pause / start
 *
 * No parameters needed. Shows an informational message
 * describing what the action will do.
 */

import { Pause, Play } from 'lucide-react'
import type { AutomationActionType } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface StatusActionProps {
  action: Extract<AutomationActionType, 'pause' | 'start'>
}

export function StatusAction({ action }: StatusActionProps) {
  const isPause = action === 'pause'

  return (
    <div className={styles.statusInfo}>
      <div className={styles.statusIcon}>
        {isPause ? <Pause size={16} /> : <Play size={16} />}
      </div>
      <span>
        {isPause
          ? 'Esta ação irá pausar as entidades que atenderem às condições.'
          : 'Esta ação irá ativar as entidades que atenderem às condições.'}
      </span>
    </div>
  )
}
