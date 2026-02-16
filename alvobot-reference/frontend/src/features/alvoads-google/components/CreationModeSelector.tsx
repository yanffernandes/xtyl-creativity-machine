import { Plus, MapPin, FileSpreadsheet, Copy, Sparkles } from 'lucide-react'
import { Modal } from '@/shared/components'
import styles from './CreationModeSelector.module.css'
import { CAMPAIGN_CREATION_MODES, type CampaignCreationMode  } from '../types/campaign'

interface CreationModeSelectorProps {
  isOpen: boolean
  onSelect: (mode: CampaignCreationMode) => void
  onCancel: () => void
}

const ICONS = {
  Plus,
  MapPin,
  FileSpreadsheet,
  Copy,
}

export function CreationModeSelector({ isOpen, onSelect, onCancel }: CreationModeSelectorProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="" size="lg">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Sparkles size={24} />
          </div>
          <h2 className={styles.title}>Como você quer criar sua campanha?</h2>
          <p className={styles.subtitle}>
            Escolha o método que melhor se adapta às suas necessidades
          </p>
        </div>

        <div className={styles.options}>
          {CAMPAIGN_CREATION_MODES.map((mode) => {
            const Icon = ICONS[mode.icon as keyof typeof ICONS]
            const isRecommended = 'recommended' in mode && mode.recommended
            const badge = 'badge' in mode ? mode.badge : undefined
            const isDisabled = 'disabled' in mode && mode.disabled
            return (
              <button
                key={mode.value}
                type="button"
                className={`${styles.optionCard} ${isRecommended ? styles.recommended : ''} ${isDisabled ? styles.disabled : ''}`}
                onClick={() => !isDisabled && onSelect(mode.value)}
                disabled={isDisabled}
              >
                {isRecommended && (
                  <span className={styles.recommendedBadge}>Recomendado</span>
                )}
                {badge && !isRecommended && (
                  <span className={styles.badge}>{badge}</span>
                )}
                <div className={styles.iconWrapper}>
                  <Icon size={24} />
                </div>
                <div className={styles.optionContent}>
                  <h3 className={styles.optionLabel}>{mode.label}</h3>
                  <p className={styles.optionDescription}>{mode.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  )
}
