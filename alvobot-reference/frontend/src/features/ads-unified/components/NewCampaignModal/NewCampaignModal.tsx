import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { serviceIcons } from '@/assets/icons/services'
import { Modal, Button } from '@/shared/components'
import styles from './NewCampaignModal.module.css'

interface PlatformOption {
  id: 'google' | 'meta'
  label: string
  description: string
  iconKey: keyof typeof serviceIcons
  route: string
  color: string
}

const platformOptions: PlatformOption[] = [
  {
    id: 'google',
    label: 'Google Ads',
    description: 'Campanhas de pesquisa, display e YouTube',
    iconKey: 'ads',
    route: '/alvoads-google/wizard',
    color: '#4285F4',
  },
  {
    id: 'meta',
    label: 'Meta Ads',
    description: 'Campanhas para Facebook e Instagram',
    iconKey: 'meta_ads',
    route: '/alvoads-meta',
    color: '#0084FF',
  },
]

export interface NewCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  hasGoogleConnection: boolean
  hasMetaConnection: boolean
}

export function NewCampaignModal({
  isOpen,
  onClose,
  hasGoogleConnection,
  hasMetaConnection,
}: NewCampaignModalProps) {
  const navigate = useNavigate()

  const handleSelectPlatform = useCallback((option: PlatformOption) => {
    onClose()
    navigate(option.route)
  }, [navigate, onClose])

  const isPlatformAvailable = useCallback((id: 'google' | 'meta') => {
    if (id === 'google') return hasGoogleConnection
    if (id === 'meta') return hasMetaConnection
    return false
  }, [hasGoogleConnection, hasMetaConnection])

  const hasAnyConnection = hasGoogleConnection || hasMetaConnection

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Campanha"
      size="sm"
    >
      <div className={styles.content}>
        {!hasAnyConnection ? (
          <div className={styles.noConnections}>
            <p className={styles.noConnectionsText}>
              Você ainda não tem contas de anúncios conectadas.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                onClose()
                navigate('/connections')
              }}
            >
              Conectar Contas
            </Button>
          </div>
        ) : (
          <>
            <p className={styles.subtitle}>
              Selecione a plataforma para criar sua campanha
            </p>
            <div className={styles.optionsGrid}>
              {platformOptions.map((option) => {
                const isAvailable = isPlatformAvailable(option.id)
                const IconSrc = serviceIcons[option.iconKey]

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.optionCard} ${!isAvailable ? styles.optionCardDisabled : ''}`}
                    onClick={() => isAvailable && handleSelectPlatform(option)}
                    disabled={!isAvailable}
                  >
                    <div
                      className={styles.optionIcon}
                      style={{ backgroundColor: `${option.color}15` }}
                    >
                      <img
                        src={IconSrc}
                        alt={option.label}
                        className={styles.iconImage}
                      />
                    </div>
                    <div className={styles.optionInfo}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      <span className={styles.optionDescription}>
                        {isAvailable ? option.description : 'Conta não conectada'}
                      </span>
                    </div>
                    {!isAvailable && (
                      <span className={styles.connectLink}>
                        Conectar
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default NewCampaignModal
