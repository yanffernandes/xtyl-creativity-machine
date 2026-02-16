import { useEffect, useState, useMemo } from 'react'
import { AlertCircle, Loader2, Check, X, Aperture, Search, ChevronDown, RefreshCw, Zap, Target } from 'lucide-react'
import { Button, Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useMetaPixels } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import {
  META_CONVERSION_EVENTS,
  ECOMMERCE_EVENT_PRIORITY,
  LEADGEN_EVENT_PRIORITY,
  type MetaConversionEvent,
} from '../../types/campaign'

export function PixelStep() {
  const {
    accounts,
    selectedPixel,
    setPixel,
    clearPixel,
    markStepCompleted,
    destinationType,
    objective,
    optimizationGoal,
    conversionEvent,
    setConversionEvent,
    customEventStr,
    setCustomEventStr,
  } = useMetaAdsWizardStore()

  const adAccount = accounts[0]
  // Use accountId (Meta's numeric ID) not id (database UUID) for API calls
  const adAccountId = adAccount?.accountId

  const {
    data: pixels,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useMetaPixels(adAccountId)

  const [pixelSearch, setPixelSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Determine if conversion event is required
  const needsConversionEvent = selectedPixel && (
    destinationType === 'WEBSITE' ||
    optimizationGoal === 'OFFSITE_CONVERSIONS' ||
    optimizationGoal === 'VALUE'
  )

  useEffect(() => {
    // Pixel step is optional, but if pixel is selected AND optimization requires a conversion event,
    // the event must be selected before allowing the user to proceed.
    if (needsConversionEvent && !conversionEvent) {
      // Don't block — just mark as incomplete so ReviewStep shows warning
      // The wizard still allows moving forward since pixel is optional
      markStepCompleted('pixel')
    } else {
      markStepCompleted('pixel')
    }
  }, [markStepCompleted, needsConversionEvent, conversionEvent])

  useEffect(() => {
    if (!adAccountId) {
      clearPixel()
      return
    }

    if (selectedPixel && pixels && !pixels.some((pixel) => pixel.id === selectedPixel.id)) {
      clearPixel()
    }
  }, [adAccountId, pixels, selectedPixel, clearPixel])

  // Separate active and inactive pixels - must be before early return to follow rules of hooks
  const pixelList = useMemo(() => pixels || [], [pixels])
  const { activePixels, inactivePixels } = useMemo(() => {
    if (!adAccountId) {
      return { activePixels: [], inactivePixels: [] }
    }
    const filtered = pixelList.filter((pixel) => {
      if (!pixelSearch.trim()) return true
      const term = pixelSearch.toLowerCase()
      return pixel.name.toLowerCase().includes(term) || pixel.id.toLowerCase().includes(term)
    })

    return {
      activePixels: filtered.filter(pixel => {
        const isUnavailable = pixel.isUnavailable === true
        const isActive = pixel.isActive !== undefined ? pixel.isActive : !isUnavailable
        return isActive
      }),
      inactivePixels: filtered.filter(pixel => {
        const isUnavailable = pixel.isUnavailable === true
        const isActive = pixel.isActive !== undefined ? pixel.isActive : !isUnavailable
        return !isActive
      }),
    }
  }, [adAccountId, pixelList, pixelSearch])

  if (!adAccountId) {
    return (
      <div className={styles.stepContent}>
        <section className={styles.section}>
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <h4>Selecione uma conta de anúncios primeiro</h4>
            <p>Você precisa selecionar pelo menos uma conta de anúncios na etapa anterior.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-2)' }}>Selecione o Pixel (opcional)</h3>
            <p className={styles.sectionDescription} style={{ marginBottom: 0 }}>
              Escolha o pixel que será usado em todas as contas selecionadas.
              {adAccount && (
                <span style={{ display: 'block', marginTop: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
                  Conta base: {adAccount.name || adAccount.accountId}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            leftIcon={<RefreshCw size={14} className={isFetching ? styles.spinner : ''} />}
          >
            {isFetching ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>

        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando pixels...</span>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={24} />
            <span>Erro ao carregar pixels. Tente novamente mais tarde.</span>
          </div>
        ) : (
          <>
            <Input
              className={styles.searchInput}
              placeholder="Buscar por nome ou ID do pixel..."
              value={pixelSearch}
              onChange={(event) => setPixelSearch(event.target.value)}
              leftIcon={<Search size={16} />}
              size="md"
            />

            <div className={styles.optionsGrid}>
              <button
                type="button"
                className={`${styles.optionCard} ${styles.pixelCard} ${!selectedPixel ? styles.selected : ''}`}
                onClick={() => clearPixel()}
              >
                <div className={styles.pixelCardContent}>
                  <div className={`${styles.checkboxIndicator} ${!selectedPixel ? styles.checked : ''}`}>
                    {!selectedPixel && <Check size={14} />}
                  </div>
                  <div className={styles.pixelInfo}>
                    <span className={styles.pixelName}>Não usar pixel</span>
                    <span className={styles.pixelDescription}>
                      A campanha será criada sem pixel.
                    </span>
                  </div>
                </div>
              </button>

              {pixelList.length === 0 ? (
                <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                  <Aperture size={32} className={styles.emptyIcon} />
                  <h4>Nenhum pixel encontrado</h4>
                  <p>Esta conta não possui pixels disponíveis.</p>
                </div>
              ) : activePixels.length === 0 && inactivePixels.length === 0 ? (
                <div className={styles.emptyState} style={{ gridColumn: '1 / -1' }}>
                  <Aperture size={32} className={styles.emptyIcon} />
                  <h4>Nenhum pixel encontrado</h4>
                  <p>Refine sua busca ou limpe o filtro.</p>
                </div>
              ) : (
                activePixels.map((pixel) => {
                  const isSelected = selectedPixel?.id === pixel.id

                  return (
                    <button
                      key={pixel.id}
                      type="button"
                      className={`${styles.optionCard} ${styles.pixelCard} ${isSelected ? styles.selected : ''}`}
                      onClick={() => setPixel(pixel)}
                    >
                      <div className={styles.pixelCardContent}>
                        <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                        <div className={styles.pixelInfo}>
                          <span className={styles.pixelName}>{pixel.name}</span>
                          <div className={styles.pixelMeta}>
                            <span className={styles.pixelId}>ID: {pixel.id}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            {/* Inactive pixels collapsible section */}
            {inactivePixels.length > 0 && (
              <div className={styles.inactiveSection}>
                <button
                  type="button"
                  className={styles.inactiveToggle}
                  onClick={() => setShowInactive(!showInactive)}
                >
                  <ChevronDown
                    size={16}
                    className={`${styles.inactiveToggleIcon} ${showInactive ? styles.expanded : ''}`}
                  />
                  <span className={styles.inactiveToggleText}>
                    Pixels indisponíveis
                  </span>
                  <span className={styles.inactiveToggleCount}>
                    {inactivePixels.length}
                  </span>
                </button>

                <div className={`${styles.inactiveContent} ${showInactive ? styles.expanded : ''}`}>
                  <p className={styles.inactiveLabel}>
                    Estes pixels não estão disponíveis para uso
                  </p>
                  <div className={styles.inactiveGrid}>
                    {inactivePixels.map((pixel) => (
                      <div
                        key={pixel.id}
                        className={`${styles.optionCard} ${styles.pixelCard} ${styles.inactive}`}
                      >
                        <div className={styles.pixelCardContent}>
                          <div className={styles.checkboxIndicator} />
                          <div className={styles.pixelInfo}>
                            <span className={styles.pixelName}>{pixel.name}</span>
                            <div className={styles.pixelMeta}>
                              <span className={styles.pixelId}>ID: {pixel.id}</span>
                              <span className={styles.inactiveBadge}>Indisponível</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {selectedPixel && (
        <section className={styles.section}>
          <div className={styles.selectionCounter}>
            <Aperture size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>1</strong> pixel selecionado
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={() => clearPixel()}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Conversion Event Selector - shown when pixel is selected and needs conversion event */}
      {selectedPixel && (destinationType === 'WEBSITE' || optimizationGoal === 'OFFSITE_CONVERSIONS' || optimizationGoal === 'VALUE') && (
        <>
          <ConversionEventSelector
            objective={objective}
            selectedEvent={conversionEvent}
            onSelectEvent={setConversionEvent}
            customEventStr={customEventStr}
            onCustomEventStrChange={setCustomEventStr}
          />
          {!conversionEvent && (
            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--color-warning-alpha-10, rgba(245, 158, 11, 0.1))',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}>
              <AlertCircle size={16} />
              <span>
                Selecione um evento de conversão acima. Se não selecionar, será usado o padrão
                {objective === 'OUTCOME_SALES' ? ' "Compra" (Purchase)' : ' "Lead"'} automaticamente.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ========================
// Conversion Event Selector Sub-Component
// ========================

function ConversionEventSelector({
  objective,
  selectedEvent,
  onSelectEvent,
  customEventStr,
  onCustomEventStrChange,
}: {
  objective: string
  selectedEvent: MetaConversionEvent | null
  onSelectEvent: (event: MetaConversionEvent | null) => void
  customEventStr: string | null
  onCustomEventStrChange: (str: string | null) => void
}) {
  const [eventSearch, setEventSearch] = useState('')

  // Determine recommended events based on objective
  const recommendedEvents = useMemo(() => {
    if (objective === 'OUTCOME_SALES') return ECOMMERCE_EVENT_PRIORITY
    if (objective === 'OUTCOME_LEADS') return LEADGEN_EVENT_PRIORITY
    return ECOMMERCE_EVENT_PRIORITY
  }, [objective])

  // Sort events: recommended first, then alphabetical
  const sortedEvents = useMemo(() => {
    const filtered = META_CONVERSION_EVENTS.filter((evt) => {
      if (!eventSearch.trim()) return true
      const term = eventSearch.toLowerCase()
      return evt.label.toLowerCase().includes(term) || evt.value.toLowerCase().includes(term)
    })

    return filtered.sort((a, b) => {
      const aIdx = recommendedEvents.indexOf(a.value)
      const bIdx = recommendedEvents.indexOf(b.value)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return a.label.localeCompare(b.label)
    })
  }, [eventSearch, recommendedEvents])

  const isRecommended = (event: MetaConversionEvent) => recommendedEvents.includes(event)

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Evento de Conversão</h3>
      <p className={styles.sectionDescription}>
        Selecione qual evento do Pixel o algoritmo deve otimizar.
        Corresponde ao campo <code>promoted_object.custom_event_type</code> da API.
      </p>

      <Input
        className={styles.searchInput}
        placeholder="Buscar evento de conversão..."
        value={eventSearch}
        onChange={(event) => setEventSearch(event.target.value)}
        leftIcon={<Search size={16} />}
        size="md"
      />

      <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {sortedEvents.map((evt) => {
          const isSelected = selectedEvent === evt.value
          const recommended = isRecommended(evt.value)

          return (
            <button
              key={evt.value}
              type="button"
              className={`${styles.optionCard} ${styles.pixelCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => {
                if (evt.value === 'OTHER') {
                  onSelectEvent(evt.value)
                } else {
                  onSelectEvent(evt.value)
                  onCustomEventStrChange(null)
                }
              }}
            >
              <div className={styles.pixelCardContent}>
                <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                  {isSelected && <Check size={14} />}
                </div>
                <div className={styles.pixelInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <span className={styles.pixelName}>{evt.label}</span>
                    {recommended && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        padding: '1px 6px',
                        background: 'var(--color-primary-alpha-10)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '10px',
                        fontWeight: 500,
                        color: 'var(--color-primary)',
                      }}>
                        <Zap size={9} />
                        Recomendado
                      </span>
                    )}
                  </div>
                  <span className={styles.pixelDescription} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                    {evt.pixelCode}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom event string input */}
      {selectedEvent === 'OTHER' && (
        <div className={styles.formGroup} style={{ marginTop: 'var(--space-3)' }}>
          <label htmlFor="custom-event-name" className={styles.label}>Nome do Evento Customizado</label>
          <input
            id="custom-event-name"
            type="text"
            className={styles.input}
            value={customEventStr || ''}
            onChange={(e) => onCustomEventStrChange(e.target.value)}
            placeholder="MeuEventoCustomizado"
            maxLength={50}
          />
          <span className={styles.hint}>
            Deve ser o nome exato do evento customizado configurado no seu Pixel
            (ex: <code>fbq('trackCustom', 'MeuEvento')</code>)
          </span>
        </div>
      )}

      {/* AEM Info */}
      {selectedEvent && (
        <div style={{
          marginTop: 'var(--space-3)',
          padding: 'var(--space-3)',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
            <Target size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--color-text-primary)' }}>Medição Agregada de Eventos (AEM)</strong>
              <p style={{ margin: 'var(--space-1) 0 0', lineHeight: '1.5' }}>
                Devido ao iOS 14+, cada domínio pode ter no máximo 8 eventos priorizados.
                O evento selecionado aqui deve estar configurado como prioritário no Gerenciador de Eventos do Meta.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
