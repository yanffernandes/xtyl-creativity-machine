import { Zap, Settings, Check } from 'lucide-react'
import styles from './StepInstallationType.module.css'

type InstallationType = 'fast' | 'custom'

interface InstallationConfig {
  createAuthors: boolean
  createLogo: boolean
  updateTitle: boolean
}

interface StepInstallationTypeProps {
  installationType: InstallationType
  config: InstallationConfig
  onTypeChange: (type: InstallationType) => void
  onConfigChange: (config: InstallationConfig) => void
}

export function StepInstallationType({
  installationType,
  config,
  onTypeChange,
  onConfigChange,
}: StepInstallationTypeProps) {
  const handleToggle = (key: keyof InstallationConfig) => {
    onConfigChange({
      ...config,
      [key]: !config[key],
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Tipo de Instalação</h2>
        <p className={styles.description}>
          Escolha como deseja configurar a estrutura do seu blog
        </p>
      </div>

      <div className={styles.typeCards}>
        <button
          type="button"
          className={`${styles.typeCard} ${installationType === 'fast' ? styles.selected : ''}`}
          onClick={() => onTypeChange('fast')}
        >
          <div className={styles.typeIcon}>
            <Zap size={32} />
          </div>
          <div className={styles.typeContent}>
            <h3 className={styles.typeName}>Instalação Rápida</h3>
            <p className={styles.typeDescription}>
              Configuração automática com valores padrão otimizados. Ideal para começar rapidamente.
            </p>
          </div>
          {installationType === 'fast' && (
            <div className={styles.selectedBadge}>
              <Check size={16} />
            </div>
          )}
        </button>

        <button
          type="button"
          className={`${styles.typeCard} ${installationType === 'custom' ? styles.selected : ''}`}
          onClick={() => onTypeChange('custom')}
        >
          <div className={styles.typeIcon}>
            <Settings size={32} />
          </div>
          <div className={styles.typeContent}>
            <h3 className={styles.typeName}>Instalação Personalizada</h3>
            <p className={styles.typeDescription}>
              Configure cada opção manualmente para ter controle total sobre a estrutura.
            </p>
          </div>
          {installationType === 'custom' && (
            <div className={styles.selectedBadge}>
              <Check size={16} />
            </div>
          )}
        </button>
      </div>

      {installationType === 'custom' && (
        <div className={styles.configSection}>
          <h3 className={styles.configTitle}>Opções de Configuração</h3>

          <div className={styles.toggleList}>
            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Criar Autor</span>
                <span className={styles.toggleDescription}>
                  Criar perfil de autor com nome e bio gerados por IA
                </span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${config.createAuthors ? styles.toggleOn : ''}`}
                onClick={() => handleToggle('createAuthors')}
                role="switch"
                aria-checked={config.createAuthors}
              >
                <span className={styles.toggleHandle} />
              </button>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Criar Logo</span>
                <span className={styles.toggleDescription}>
                  Gerar logo automaticamente com ícone, fonte e cor baseados no nicho
                </span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${config.createLogo ? styles.toggleOn : ''}`}
                onClick={() => handleToggle('createLogo')}
                role="switch"
                aria-checked={config.createLogo}
              >
                <span className={styles.toggleHandle} />
              </button>
            </div>

            <div className={styles.toggleItem}>
              <div className={styles.toggleInfo}>
                <span className={styles.toggleLabel}>Título e Descrição</span>
                <span className={styles.toggleDescription}>
                  Atualizar título e descrição do blog no WordPress
                </span>
              </div>
              <button
                type="button"
                className={`${styles.toggle} ${config.updateTitle ? styles.toggleOn : ''}`}
                onClick={() => handleToggle('updateTitle')}
                role="switch"
                aria-checked={config.updateTitle}
              >
                <span className={styles.toggleHandle} />
              </button>
            </div>
          </div>
        </div>
      )}

      {installationType === 'fast' && (
        <div className={styles.quickInfo}>
          <h4>A instalação rápida irá:</h4>
          <ul>
            <li>Criar perfil de autor com nome e bio gerados por IA</li>
            <li>Gerar logo do blog automaticamente</li>
            <li>Atualizar título e descrição do blog</li>
          </ul>
        </div>
      )}
    </div>
  )
}
