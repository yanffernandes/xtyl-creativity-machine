/**
 * ConfirmActionModal Component
 *
 * Generic confirmation modal for campaign actions (pause, enable, delete).
 * Displays campaign info and action consequences before confirmation.
 */

import { AlertTriangle, Pause, Play, Trash2 } from 'lucide-react'
import { Modal, Button } from '@/shared/components'
import { PlatformBadge } from '../PlatformBadge'
import styles from './ConfirmActionModal.module.css'
import type { UnifiedCampaign } from '../../types'

export type ActionType = 'pause' | 'enable' | 'delete'

export interface ConfirmActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  campaign: UnifiedCampaign | null
  actionType: ActionType
  isLoading?: boolean
}

const ACTION_CONFIG: Record<
  ActionType,
  {
    title: string
    icon: React.ReactNode
    buttonText: string
    buttonVariant: 'primary' | 'danger' | 'secondary'
    message: (name: string) => string
    warning?: string
  }
> = {
  pause: {
    title: 'Pausar Campanha',
    icon: <Pause size={20} />,
    buttonText: 'Pausar Campanha',
    buttonVariant: 'primary',
    message: (name) => `Tem certeza que deseja pausar a campanha "${name}"?`,
    warning: 'A campanha deixará de veicular anúncios até ser reativada.',
  },
  enable: {
    title: 'Ativar Campanha',
    icon: <Play size={20} />,
    buttonText: 'Ativar Campanha',
    buttonVariant: 'primary',
    message: (name) => `Tem certeza que deseja ativar a campanha "${name}"?`,
    warning: 'A campanha começará a veicular anúncios e consumir orçamento.',
  },
  delete: {
    title: 'Excluir Campanha',
    icon: <Trash2 size={20} />,
    buttonText: 'Excluir Campanha',
    buttonVariant: 'danger',
    message: (name) => `Tem certeza que deseja excluir a campanha "${name}"?`,
    warning: 'Esta ação não pode ser desfeita. Todos os dados da campanha serão perdidos.',
  },
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  campaign,
  actionType,
  isLoading = false,
}: ConfirmActionModalProps) {
  if (!campaign) return null

  const config = ACTION_CONFIG[actionType]

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.headerContent}>
        <span className={`${styles.icon} ${styles[actionType]}`}>{config.icon}</span>
        <span>{config.title}</span>
      </div>

      <div className={styles.content}>
        {/* Campaign Info */}
        <div className={styles.campaignInfo}>
          <PlatformBadge platform={campaign.platform} size="sm" />
          <div className={styles.campaignDetails}>
            <span className={styles.campaignName}>{campaign.name}</span>
            <span className={styles.campaignId}>ID: {campaign.id}</span>
          </div>
        </div>

        {/* Confirmation Message */}
        <p className={styles.message}>{config.message(campaign.name)}</p>

        {/* Warning */}
        {config.warning && (
          <div className={styles.warning}>
            <AlertTriangle size={16} />
            <span>{config.warning}</span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {config.buttonText}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmActionModal
