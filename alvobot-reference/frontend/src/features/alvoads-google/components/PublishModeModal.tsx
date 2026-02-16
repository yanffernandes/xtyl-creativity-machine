import { Zap, Settings, X, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './PublishModeModal.module.css'

export type PublishMode = 'auto' | 'semi-auto'

interface PublishModeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (mode: PublishMode) => void
  disableSemiAuto?: boolean
  semiAutoDisabledReason?: string
}

export function PublishModeModal({
  isOpen,
  onClose,
  onSelect,
  disableSemiAuto = false,
  semiAutoDisabledReason = 'Modo semi-automatico nao disponivel para multiplos artigos',
}: PublishModeModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <button className={styles.closeButton} onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <h2 className={styles.title}>Como deseja publicar sua campanha?</h2>
        <p className={styles.subtitle}>
          Escolha o modo de publicacao que melhor se adapta ao seu fluxo de trabalho
        </p>

        <div className={styles.options}>
          <button
            className={styles.optionCard}
            onClick={() => onSelect('auto')}
          >
            <div className={styles.optionIcon}>
              <Zap size={32} />
            </div>
            <div className={styles.optionContent}>
              <h3 className={styles.optionTitle}>Publicacao Automatica</h3>
              <p className={styles.optionDescription}>
                Gerar keywords, anuncios e extensoes automaticamente e publicar direto no Google Ads.
              </p>
              <span className={styles.optionTag}>Ideal para publicacao rapida</span>
            </div>
          </button>

          <button
            className={`${styles.optionCard} ${disableSemiAuto ? styles.disabled : ''}`}
            onClick={() => !disableSemiAuto && onSelect('semi-auto')}
            disabled={disableSemiAuto}
          >
            <div className={styles.optionIcon}>
              <Settings size={32} />
            </div>
            <div className={styles.optionContent}>
              <h3 className={styles.optionTitle}>Publicacao Semi-automatica</h3>
              <p className={styles.optionDescription}>
                Gerar conteudo automaticamente, mas revisar cada etapa antes de publicar.
              </p>
              {disableSemiAuto ? (
                <span className={styles.optionTagDisabled}>
                  <AlertCircle size={12} />
                  {semiAutoDisabledReason}
                </span>
              ) : (
                <span className={styles.optionTag}>Ideal para ajustes personalizados</span>
              )}
            </div>
          </button>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
