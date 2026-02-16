import { useCallback, useMemo, useEffect, useId } from 'react'
import { Settings2, Layers, Copy, Info, Calculator } from 'lucide-react'
import styles from './WizardSteps.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { CreativeDuplication } from '../../types/campaign'

const DUPLICATION_OPTIONS: Array<{ value: CreativeDuplication; label: string; description: string }> = [
  {
    value: 1,
    label: '1x (Sem duplicação)',
    description: 'Cada criativo aparece uma vez por conjunto',
  },
  {
    value: 2,
    label: '2x (Duplicado)',
    description: 'Cada criativo aparece duas vezes no mesmo conjunto',
  },
  {
    value: 3,
    label: '3x (Triplicado)',
    description: 'Cada criativo aparece três vezes no mesmo conjunto',
  },
]

export function StepAdSetsConfig() {
  const {
    selectedArticles,
    adSetsConfig,
    setAdSetsPerCampaign,
    setCreativeDuplication,
    markStepCompleted,
    markStepIncomplete,
    selectedImages,
  } = useMetaAdsWizardStore()
  const adSetsCountId = useId()

  // Calculate distribution preview
  const distributionPreview = useMemo(() => {
    const totalImages = selectedImages.length || 0 // Will be filled later in creative step
    const { adSetsPerCampaign, creativeDuplication } = adSetsConfig
    const articlesCount = selectedArticles.length

    // Assuming images will be distributed equally
    const imagesPerAdSet = totalImages > 0 ? Math.floor(totalImages / adSetsPerCampaign) : 0
    const creativesPerAdSet = imagesPerAdSet * creativeDuplication

    return {
      totalCampaigns: articlesCount,
      totalAdSets: articlesCount * adSetsPerCampaign,
      imagesPerAdSet,
      creativesPerAdSet,
      totalCreatives: articlesCount * adSetsPerCampaign * creativesPerAdSet,
    }
  }, [selectedArticles.length, adSetsConfig, selectedImages.length])

  const handleAdSetsChange = useCallback(
    (value: number) => {
      const validValue = Math.max(1, Math.min(50, value))
      setAdSetsPerCampaign(validValue)

      // Mark step as completed if valid
      if (validValue >= 1) {
        markStepCompleted('adsets_config')
      } else {
        markStepIncomplete('adsets_config')
      }
    },
    [setAdSetsPerCampaign, markStepCompleted, markStepIncomplete]
  )

  const handleDuplicationChange = useCallback(
    (value: CreativeDuplication) => {
      setCreativeDuplication(value)
      markStepCompleted('adsets_config')
    },
    [setCreativeDuplication, markStepCompleted]
  )

  // Auto-complete step on mount if config is valid
  useEffect(() => {
    if (adSetsConfig.adSetsPerCampaign >= 1) {
      markStepCompleted('adsets_config')
    }
  }, [adSetsConfig.adSetsPerCampaign, markStepCompleted])

  return (
    <div className={styles.stepContent}>
      {/* Introduction */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Settings2 size={20} />
          Configuração de Conjuntos de Anúncios
        </h3>
        <p className={styles.sectionDescription}>
          Configure quantos conjuntos de anúncios (Ad Sets) serão criados em cada campanha e como
          os criativos serão distribuídos.
        </p>
      </section>

      {/* Ad Sets per Campaign */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Layers size={18} />
          Conjuntos por Campanha
        </h3>
        <p className={styles.sectionDescription}>
          Quantos conjuntos de anúncios deseja criar dentro de cada campanha? Os criativos serão
          distribuídos entre os conjuntos.
        </p>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor={adSetsCountId}>Número de conjuntos</label>
          <div className={styles.rangeContainer}>
            <input
              type="range"
              className={styles.rangeInput}
              min={1}
              max={20}
              step={1}
              value={adSetsConfig.adSetsPerCampaign}
              onChange={(e) => handleAdSetsChange(Number(e.target.value))}
              aria-label="Número de conjuntos"
              style={{
                '--range-progress': `${((adSetsConfig.adSetsPerCampaign - 1) / (20 - 1)) * 100}%`,
              } as React.CSSProperties}
            />
            <input
              id={adSetsCountId}
              type="number"
              className={styles.input}
              style={{ width: '80px', textAlign: 'center' }}
              min={1}
              max={50}
              value={adSetsConfig.adSetsPerCampaign}
              onChange={(e) => handleAdSetsChange(Number(e.target.value))}
            />
          </div>
          <span className={styles.hint}>
            Recomendado: 5-15 conjuntos para melhor teste A/B de públicos
          </span>
        </div>
      </section>

      {/* Creative Duplication */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Copy size={18} />
          Duplicação de Criativos
        </h3>
        <p className={styles.sectionDescription}>
          Deseja duplicar o mesmo criativo dentro do mesmo conjunto? Alguns anunciantes relatam
          melhores resultados com criativos duplicados.
        </p>

        <div className={styles.optionsGrid}>
          {DUPLICATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.optionCard} ${
                adSetsConfig.creativeDuplication === option.value ? styles.selected : ''
              }`}
              onClick={() => handleDuplicationChange(option.value)}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}
              >
                <div
                  className={`${styles.checkboxIndicator} ${
                    adSetsConfig.creativeDuplication === option.value ? styles.checked : ''
                  }`}
                  style={{ borderRadius: '50%' }}
                >
                  {adSetsConfig.creativeDuplication === option.value && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'currentColor',
                      }}
                    />
                  )}
                </div>
                <div>
                  <span className={styles.optionLabel}>{option.label}</span>
                  <span className={styles.optionDescription}>{option.description}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Preview/Summary */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Calculator size={18} />
          Resumo da Estrutura
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--color-primary)',
              }}
            >
              {distributionPreview.totalCampaigns}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {distributionPreview.totalCampaigns === 1 ? 'Campanha' : 'Campanhas'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--color-info)',
              }}
            >
              {distributionPreview.totalAdSets}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Conjuntos totais
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--color-success)',
              }}
            >
              {adSetsConfig.adSetsPerCampaign}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Conjuntos/Campanha
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-4)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--color-warning)',
              }}
            >
              {adSetsConfig.creativeDuplication}x
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Duplicação
            </div>
          </div>
        </div>

        {/* Info box */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-info-alpha-10)',
            border: '1px solid var(--color-info-alpha-30)',
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-4)',
          }}
        >
          <Info size={18} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            <strong>Como funciona:</strong> Para cada artigo selecionado, será criada uma campanha.
            Dentro de cada campanha, serão criados{' '}
            <strong>{adSetsConfig.adSetsPerCampaign} conjuntos</strong>.
            Os criativos (imagens) serão distribuídos igualmente entre os conjuntos
            {adSetsConfig.creativeDuplication > 1 && (
              <>, e cada criativo será duplicado <strong>{adSetsConfig.creativeDuplication}x</strong>{' '}
              dentro do mesmo conjunto</>
            )}
            .
          </div>
        </div>
      </section>
    </div>
  )
}
