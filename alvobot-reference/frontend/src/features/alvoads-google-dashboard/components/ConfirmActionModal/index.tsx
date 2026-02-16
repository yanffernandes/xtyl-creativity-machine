import { Modal, Button } from '@/shared/components'
import styles from './ConfirmActionModal.module.css'
import type { CampaignMetrics } from '../../types'

interface ConfirmActionModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: CampaignMetrics
  action: 'pause' | 'enable'
  onConfirm: () => Promise<void>
  isLoading?: boolean
}

export function ConfirmActionModal({
  isOpen,
  onClose,
  campaign,
  action,
  onConfirm,
  isLoading,
}: ConfirmActionModalProps) {
  const isPause = action === 'pause'

  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPause ? 'Pausar Campanha' : 'Ativar Campanha'}
    >
      <div className={styles.content}>
        <div className={`${styles.icon} ${isPause ? styles.iconPause : styles.iconEnable}`}>
          {isPause ? '⏸' : '▶'}
        </div>

        <div className={styles.message}>
          <p>
            Tem certeza que deseja <strong>{isPause ? 'pausar' : 'ativar'}</strong> a campanha:
          </p>
          <p className={styles.campaignName}>{campaign.name}</p>
        </div>

        {isPause && (
          <div className={styles.warning}>
            <strong>Atenção:</strong> Pausar a campanha irá interromper imediatamente a
            veiculação dos anúncios. Você pode reativá-la a qualquer momento.
          </div>
        )}

        {!isPause && (
          <div className={styles.info}>
            <strong>Info:</strong> Ao ativar a campanha, ela voltará a veicular anúncios
            de acordo com as configurações de orçamento e lances definidos.
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant={isPause ? 'danger' : 'primary'}
          onClick={handleConfirm}
          isLoading={isLoading}
        >
          {isPause ? 'Pausar Campanha' : 'Ativar Campanha'}
        </Button>
      </div>
    </Modal>
  )
}
