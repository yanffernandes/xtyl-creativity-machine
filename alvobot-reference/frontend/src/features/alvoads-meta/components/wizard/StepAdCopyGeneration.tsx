import { useState, useCallback, useMemo, useEffect, useId } from 'react'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Spinner } from '@/shared/components/Spinner'
import styles from './StepAdCopyGeneration.module.css'
import { useGenerateAdCopy, useGenerateIceBreakers, useCreditsPreview } from '../../api/useCreatives'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { META_CTA_OPTIONS, isMessagingDestination } from '../../types/campaign'
import type { MetaCreativeCTA, GeneratedAdCopy, AdCopyApplyMode, GreetingConfig, IceBreakerEntry } from '../../types/creative'

// ========================
// Button Spinner (high contrast on yellow bg)
// ========================

const ButtonSpinner = () => <span className={styles.buttonSpinner} />

// ========================
// Icons
// ========================

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const CheckAllIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const TextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </svg>
)

// ========================
// Mode Toggle Component
// ========================

function ModeToggle({
  mode,
  onChange,
}: {
  mode: AdCopyApplyMode
  onChange: (mode: AdCopyApplyMode) => void
}) {
  return (
    <div className={styles.modeToggle}>
      <button
        type="button"
        className={`${styles.modeToggleBtn} ${mode === 'shared' ? styles.modeToggleBtnActive : ''}`}
        onClick={() => onChange('shared')}
      >
        Único p/ todos
      </button>
      <button
        type="button"
        className={`${styles.modeToggleBtn} ${mode === 'individual' ? styles.modeToggleBtnActive : ''}`}
        onClick={() => onChange('individual')}
      >
        Um p/ cada
      </button>
    </div>
  )
}

// ========================
// Ice Breakers Editor Component
// ========================

function IceBreakersEditor({
  iceBreakers,
  onChange,
}: {
  iceBreakers: IceBreakerEntry[]
  onChange: (iceBreakers: IceBreakerEntry[]) => void
}) {
  const updateIceBreaker = (index: number, field: keyof IceBreakerEntry, value: string) => {
    const updated = [...iceBreakers]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }

  const removeIceBreaker = (index: number) => {
    onChange(iceBreakers.filter((_, i) => i !== index))
  }

  const addIceBreaker = () => {
    if (iceBreakers.length >= 3) return
    onChange([...iceBreakers, { title: '', response: '' }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {iceBreakers.map((ib, idx) => (
        <div key={idx} className={styles.iceBreakerRow}>
          <span className={styles.iceBreakerNumber}>{idx + 1}</span>
          <div className={styles.iceBreakerFields}>
            <div className={styles.formField}>
              <label>Pergunta (max 80)</label>
              <input
                type="text"
                value={ib.title}
                onChange={(e) => updateIceBreaker(idx, 'title', e.target.value.slice(0, 80))}
                maxLength={80}
                placeholder="Ex: 💰 De 5.000 a 10.000 RON"
              />
              <span className={styles.charCount}>{ib.title.length}/80</span>
            </div>
            <div className={styles.formField}>
              <label>Resposta automática (max 300)</label>
              <textarea
                value={ib.response}
                onChange={(e) => updateIceBreaker(idx, 'response', e.target.value.slice(0, 300))}
                maxLength={300}
                rows={2}
                placeholder="Resposta que será enviada automaticamente..."
              />
              <span className={styles.charCount}>{ib.response.length}/300</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.removeIceBreakerBtn}
            onClick={() => removeIceBreaker(idx)}
            title="Remover"
          >
            <TrashIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        className={styles.addIceBreakerBtn}
        onClick={addIceBreaker}
        disabled={iceBreakers.length >= 3}
      >
        <PlusIcon />
        Adicionar pergunta ({iceBreakers.length}/3)
      </button>
    </div>
  )
}

// ========================
// Shared Greeting Form
// ========================

function SharedGreetingForm({
  greeting: config,
  onChange,
  onGenerate,
  isGenerating,
}: {
  greeting: GreetingConfig | null
  onChange: (config: GreetingConfig) => void
  onGenerate: () => void
  isGenerating: boolean
}) {
  const greetingTextId = useId()

  const currentConfig: GreetingConfig = config || {
    greeting: '',
    iceBreakers: [],
    status: 'pending',
  }

  const updateGreeting = (text: string) => {
    onChange({ ...currentConfig, greeting: text })
  }

  const updateIceBreakers = (iceBreakers: IceBreakerEntry[]) => {
    onChange({ ...currentConfig, iceBreakers })
  }

  const handleApprove = () => {
    onChange({ ...currentConfig, status: 'approved' })
  }

  const hasContent = currentConfig.greeting.trim() !== '' || currentConfig.iceBreakers.length > 0

  return (
    <div className={styles.sharedForm}>
      <div className={styles.formField}>
        <label htmlFor={greetingTextId}>Mensagem de saudação (max 300)</label>
        <textarea
          id={greetingTextId}
          value={currentConfig.greeting}
          onChange={(e) => updateGreeting(e.target.value.slice(0, 300))}
          maxLength={300}
          rows={3}
          placeholder="Ex: Olá {{user_first_name}}! 👋 Antes de continuarmos, me diga..."
        />
        <span className={styles.charCount}>{currentConfig.greeting.length}/300</span>
      </div>

      <div>
        <span className={styles.fieldLabel} style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
          Perguntas (Ice Breakers)
        </span>
        <IceBreakersEditor
          iceBreakers={currentConfig.iceBreakers}
          onChange={updateIceBreakers}
        />
      </div>

      <div className={styles.sharedFormActions}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <ButtonSpinner /> : <SparkleIcon />}
          {isGenerating ? 'Gerando...' : 'Gerar com IA'}
        </button>

        {hasContent && currentConfig.status !== 'approved' && (
          <button
            type="button"
            className={`${styles.iconButton} ${styles.approveButton}`}
            onClick={handleApprove}
          >
            <CheckIcon />
            Aprovar
          </button>
        )}

        {currentConfig.status === 'approved' && (
          <span className={styles.approvedBadge}>
            <CheckIcon /> Aprovado
          </span>
        )}
      </div>
    </div>
  )
}

// ========================
// Shared Ad Copy Form
// ========================

function SharedAdCopyForm({
  adCopy,
  onChange,
  onGenerate,
  onApprove,
  isGenerating,
}: {
  adCopy: GeneratedAdCopy | null
  onChange: (updates: Partial<GeneratedAdCopy>) => void
  onGenerate: () => void
  onApprove: () => void
  isGenerating: boolean
}) {
  const ptId = useId()
  const hlId = useId()
  const descId = useId()
  const ctaId = useId()

  const current = adCopy || {
    imageId: '__shared__',
    primaryText: '',
    headline: '',
    description: '',
    cta: 'LEARN_MORE' as MetaCreativeCTA,
    status: 'pending' as const,
  }

  return (
    <div className={styles.sharedForm}>
      <div className={styles.formField}>
        <label htmlFor={ptId}>Texto Principal (max 125)</label>
        <textarea
          id={ptId}
          value={current.primaryText}
          onChange={(e) => onChange({ primaryText: e.target.value.slice(0, 125) })}
          maxLength={125}
          rows={3}
          placeholder="Ex: Descubra como aumentar suas vendas..."
        />
        <span className={styles.charCount}>{current.primaryText.length}/125</span>
      </div>

      <div className={styles.formField}>
        <label htmlFor={hlId}>Título (max 27)</label>
        <input
          type="text"
          id={hlId}
          value={current.headline}
          onChange={(e) => onChange({ headline: e.target.value.slice(0, 27) })}
          maxLength={27}
          placeholder="Título do anúncio"
        />
        <span className={styles.charCount}>{current.headline.length}/27</span>
      </div>

      <div className={styles.formField}>
        <label htmlFor={descId}>Descrição (max 27)</label>
        <input
          type="text"
          id={descId}
          value={current.description}
          onChange={(e) => onChange({ description: e.target.value.slice(0, 27) })}
          maxLength={27}
          placeholder="Descrição curta"
        />
        <span className={styles.charCount}>{current.description.length}/27</span>
      </div>

      <div className={styles.formField}>
        <label htmlFor={ctaId}>CTA</label>
        <select
          id={ctaId}
          value={current.cta}
          onChange={(e) => onChange({ cta: e.target.value as MetaCreativeCTA })}
        >
          {META_CTA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.sharedFormActions}>
        <button
          type="button"
          className={styles.generateButton}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <ButtonSpinner /> : <SparkleIcon />}
          {isGenerating ? 'Gerando...' : 'Gerar com IA'}
        </button>

        {current.primaryText.trim() && current.status !== 'approved' && (
          <button
            type="button"
            className={`${styles.iconButton} ${styles.approveButton}`}
            onClick={onApprove}
          >
            <CheckIcon />
            Aprovar
          </button>
        )}

        {current.status === 'approved' && (
          <span className={styles.approvedBadge}>
            <CheckIcon /> Aprovado
          </span>
        )}
      </div>
    </div>
  )
}

// ========================
// Individual Ad Copy Card (per creative)
// ========================

interface AdCopyCardProps {
  imageUrl: string
  articleTitle: string
  adCopy: GeneratedAdCopy | undefined
  greetingConfig: GreetingConfig | undefined
  isGenerating: boolean
  isGeneratingGreeting: boolean
  isMessageAd: boolean
  onGenerate: () => void
  onUpdate: (updates: Partial<GeneratedAdCopy>) => void
  onApprove: () => void
  onGenerateGreeting: () => void
  onUpdateGreeting: (config: GreetingConfig) => void
}

function AdCopyCard({
  imageUrl,
  articleTitle,
  adCopy,
  greetingConfig,
  isGenerating,
  isGeneratingGreeting,
  isMessageAd,
  onGenerate,
  onUpdate,
  onApprove,
  onGenerateGreeting,
  onUpdateGreeting,
}: AdCopyCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const primaryTextId = useId()
  const headlineId = useId()
  const descriptionId = useId()
  const ctaId = useId()
  const [editValues, setEditValues] = useState({
    primaryText: adCopy?.primaryText || '',
    headline: adCopy?.headline || '',
    description: adCopy?.description || '',
    cta: adCopy?.cta || 'LEARN_MORE' as MetaCreativeCTA,
  })

  // Sync editValues when adCopy changes (after generation)
  useEffect(() => {
    if (adCopy) {
      setEditValues({
        primaryText: adCopy.primaryText || '',
        headline: adCopy.headline || '',
        description: adCopy.description || '',
        cta: adCopy.cta || 'LEARN_MORE',
      })
    }
  }, [adCopy])

  const handleSave = () => {
    onUpdate({
      primaryText: editValues.primaryText,
      headline: editValues.headline,
      description: editValues.description,
      cta: editValues.cta,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValues({
      primaryText: adCopy?.primaryText || '',
      headline: adCopy?.headline || '',
      description: adCopy?.description || '',
      cta: adCopy?.cta || 'LEARN_MORE',
    })
    setIsEditing(false)
  }

  // Card is fully approved when ad copy is approved AND (if message ad) greeting is approved
  const isFullyApproved = adCopy?.status === 'approved' &&
    (!isMessageAd || (greetingConfig && greetingConfig.status === 'approved'))

  return (
    <div className={styles.adCopyCard}>
      {/* Image Preview */}
      <div className={styles.imagePreview}>
        <img src={imageUrl} alt={articleTitle} />
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <h4 className={styles.articleTitle}>{articleTitle}</h4>

        {!adCopy && !isGenerating && (
          <div className={styles.emptyAdCopy}>
            <p>Nenhum texto gerado ainda</p>
            <button className={styles.generateButton} onClick={onGenerate}>
              <SparkleIcon />
              Gerar Textos
            </button>
          </div>
        )}

        {isGenerating && (
          <div className={styles.generating}>
            <Spinner size="sm" />
            <span>Gerando textos...</span>
          </div>
        )}

        {adCopy && !isEditing && (
          <div className={styles.adCopyContent}>
            <div className={styles.textField}>
              <span className={styles.fieldLabel}>Texto Principal</span>
              <p className={styles.textValue}>{adCopy.primaryText}</p>
            </div>
            <div className={styles.textField}>
              <span className={styles.fieldLabel}>Título</span>
              <p className={styles.textValue}>{adCopy.headline}</p>
            </div>
            <div className={styles.textField}>
              <span className={styles.fieldLabel}>Descrição</span>
              <p className={styles.textValue}>{adCopy.description}</p>
            </div>
            <div className={styles.textField}>
              <span className={styles.fieldLabel}>CTA</span>
              <p className={styles.textValue}>
                {META_CTA_OPTIONS.find((c) => c.value === adCopy.cta)?.label || adCopy.cta}
              </p>
            </div>

            <div className={styles.cardActions}>
              <button
                className={styles.iconButton}
                onClick={() => setIsEditing(true)}
                title="Editar"
              >
                <EditIcon />
              </button>
              <button
                className={styles.iconButton}
                onClick={onGenerate}
                title="Regenerar texto"
              >
                <RefreshIcon />
              </button>
              {!isFullyApproved && (
                <button
                  className={`${styles.iconButton} ${styles.approveButton}`}
                  onClick={onApprove}
                  title="Aprovar"
                >
                  <CheckIcon />
                  Aprovar
                </button>
              )}
              {isFullyApproved && (
                <span className={styles.approvedBadge}>
                  <CheckIcon /> Aprovado
                </span>
              )}
            </div>
          </div>
        )}

        {isEditing && (
          <div className={styles.editForm}>
            <div className={styles.formField}>
              <label htmlFor={primaryTextId}>Texto Principal (max 125)</label>
              <textarea
                id={primaryTextId}
                value={editValues.primaryText}
                onChange={(e) =>
                  setEditValues({ ...editValues, primaryText: e.target.value.slice(0, 125) })
                }
                maxLength={125}
                rows={3}
              />
              <span className={styles.charCount}>{editValues.primaryText.length}/125</span>
            </div>

            <div className={styles.formField}>
              <label htmlFor={headlineId}>Título (max 27)</label>
              <input
                type="text"
                id={headlineId}
                value={editValues.headline}
                onChange={(e) =>
                  setEditValues({ ...editValues, headline: e.target.value.slice(0, 27) })
                }
                maxLength={27}
              />
              <span className={styles.charCount}>{editValues.headline.length}/27</span>
            </div>

            <div className={styles.formField}>
              <label htmlFor={descriptionId}>Descrição (max 27)</label>
              <input
                type="text"
                id={descriptionId}
                value={editValues.description}
                onChange={(e) =>
                  setEditValues({ ...editValues, description: e.target.value.slice(0, 27) })
                }
                maxLength={27}
              />
              <span className={styles.charCount}>{editValues.description.length}/27</span>
            </div>

            <div className={styles.formField}>
              <label htmlFor={ctaId}>CTA</label>
              <select
                id={ctaId}
                value={editValues.cta}
                onChange={(e) =>
                  setEditValues({ ...editValues, cta: e.target.value as MetaCreativeCTA })
                }
              >
                {META_CTA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.editActions}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Cancelar
              </button>
              <button className={styles.saveButton} onClick={handleSave}>
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Greeting Section — always visible for message ads */}
        {isMessageAd && (
          <div className={styles.greetingSection}>
            <SharedGreetingForm
              greeting={greetingConfig || null}
              onChange={onUpdateGreeting}
              onGenerate={onGenerateGreeting}
              isGenerating={isGeneratingGreeting}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ========================
// Main Component
// ========================

export function StepAdCopyGeneration() {
  const workspaceId = useWorkspaceId()
  const {
    approvedImages,
    adCopyMap,
    destinationType,
    adCopyApplyMode,
    sharedAdCopy,
    sharedGreeting,
    greetingMap,
    setImageAdCopy,
    updateAdCopy,
    setContentApplyMode,
    setSharedAdCopy,
    updateSharedAdCopy,
    setSharedGreeting,
    setImageGreeting,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  const isMessageAd = isMessagingDestination(destinationType)

  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())
  const [generatingGreetingIds, setGeneratingGreetingIds] = useState<Set<string>>(new Set())
  const [isGeneratingSharedCopy, setIsGeneratingSharedCopy] = useState(false)
  const [isGeneratingSharedGreeting, setIsGeneratingSharedGreeting] = useState(false)
  const [isGeneratingEverything, setIsGeneratingEverything] = useState(false)

  const generateAdCopyMutation = useGenerateAdCopy()
  const generateIceBreakersMutation = useGenerateIceBreakers()

  // Credits preview for text generation
  const { data: creditsPreview } = useCreditsPreview(
    { imageCount: approvedImages.length, generateAdCopy: true, workspaceId: workspaceId || undefined },
    approvedImages.length > 0
  )

  // ========================
  // Stats
  // ========================

  const isCardFullyApproved = useCallback((imageId: string): boolean => {
    const copy = adCopyMap.get(imageId)
    if (!copy || copy.status !== 'approved') return false
    if (isMessageAd) {
      const greeting = greetingMap.get(imageId)
      if (!greeting || greeting.status !== 'approved') return false
    }
    return true
  }, [adCopyMap, isMessageAd, greetingMap])

  const stats = useMemo(() => {
    const total = approvedImages.length

    if (adCopyApplyMode === 'shared') {
      const copyApproved = sharedAdCopy?.status === 'approved'
      const greetingApproved = !isMessageAd || sharedGreeting?.status === 'approved'
      const allApproved = copyApproved && greetingApproved

      return {
        total,
        generated: sharedAdCopy ? total : 0,
        approved: allApproved ? total : 0,
      }
    }

    // Individual mode
    const generated = Array.from(adCopyMap.values()).length
    const approved = approvedImages.filter((img) => isCardFullyApproved(img.id)).length
    return { total, generated, approved }
  }, [approvedImages, adCopyMap, adCopyApplyMode, sharedAdCopy, isMessageAd, sharedGreeting, greetingMap, isCardFullyApproved])

  // Can proceed check
  const canProceed = useMemo(() => {
    if (approvedImages.length === 0) return false

    if (adCopyApplyMode === 'shared') {
      if (!sharedAdCopy || sharedAdCopy.status !== 'approved') return false
      if (isMessageAd && (!sharedGreeting || sharedGreeting.status !== 'approved')) return false
      return true
    }

    // Individual mode: all cards must be fully approved
    return stats.approved >= stats.total && stats.total > 0
  }, [adCopyApplyMode, sharedAdCopy, isMessageAd, sharedGreeting, stats, approvedImages.length])

  // Mark step completion
  useEffect(() => {
    if (canProceed) {
      markStepCompleted('ad_copy')
    } else {
      markStepIncomplete('ad_copy')
    }
  }, [canProceed, markStepCompleted, markStepIncomplete])

  // ========================
  // Shared Mode Handlers
  // ========================

  const handleGenerateSharedCopy = useCallback(async () => {
    if (approvedImages.length === 0) return
    const firstImage = approvedImages[0]

    setIsGeneratingSharedCopy(true)
    try {
      const result = await generateAdCopyMutation.mutateAsync({
        libraryId: firstImage.id,
        articleId: firstImage.articleId,
      })

      const newCopy: GeneratedAdCopy = {
        imageId: '__shared__',
        primaryText: result.primaryText,
        headline: result.headline,
        description: result.description,
        cta: result.suggestedCta,
        status: 'pending',
      }

      setSharedAdCopy(newCopy)
      return newCopy
    } catch (error) {
      console.error('Failed to generate shared ad copy:', error)
      return null
    } finally {
      setIsGeneratingSharedCopy(false)
    }
  }, [approvedImages, generateAdCopyMutation, setSharedAdCopy])

  const handleUpdateSharedCopy = useCallback(
    (updates: Partial<GeneratedAdCopy>) => {
      if (!sharedAdCopy) {
        // Create new shared copy from updates
        setSharedAdCopy({
          imageId: '__shared__',
          primaryText: '',
          headline: '',
          description: '',
          cta: 'LEARN_MORE',
          status: 'pending',
          ...updates,
        })
      } else {
        updateSharedAdCopy(updates)
      }
    },
    [sharedAdCopy, setSharedAdCopy, updateSharedAdCopy]
  )

  const handleApproveSharedCopy = useCallback(() => {
    updateSharedAdCopy({ status: 'approved' })
  }, [updateSharedAdCopy])

  // ========================
  // Shared Greeting Handlers
  // ========================

  const handleGenerateSharedGreeting = useCallback(async () => {
    const copySource = sharedAdCopy || adCopyMap.values().next().value

    if (!copySource) return

    setIsGeneratingSharedGreeting(true)
    try {
      const result = await generateIceBreakersMutation.mutateAsync({
        primaryText: copySource.primaryText,
        headline: copySource.headline,
        description: copySource.description,
      })

      setSharedGreeting({
        greeting: result.greeting,
        iceBreakers: result.iceBreakers,
        status: 'pending',
      })
    } catch (error) {
      console.error('Failed to generate shared greeting:', error)
    } finally {
      setIsGeneratingSharedGreeting(false)
    }
  }, [sharedAdCopy, adCopyMap, generateIceBreakersMutation, setSharedGreeting])

  const handleUpdateSharedGreeting = useCallback(
    (config: GreetingConfig) => {
      setSharedGreeting(config)
    },
    [setSharedGreeting]
  )

  // ========================
  // Individual Mode Handlers
  // ========================

  const handleGenerate = useCallback(
    async (imageId: string, articleId: number) => {
      setGeneratingIds((prev) => new Set([...prev, imageId]))

      try {
        const result = await generateAdCopyMutation.mutateAsync({
          libraryId: imageId,
          articleId,
        })

        const adCopy: GeneratedAdCopy = {
          imageId,
          primaryText: result.primaryText,
          headline: result.headline,
          description: result.description,
          cta: result.suggestedCta,
          status: 'pending',
        }

        setImageAdCopy(imageId, adCopy)
      } catch (error) {
        console.error('Failed to generate ad copy:', error)
      } finally {
        setGeneratingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
      }
    },
    [generateAdCopyMutation, setImageAdCopy]
  )

  const handleApprove = useCallback(
    (imageId: string) => {
      updateAdCopy(imageId, { status: 'approved' })
      // Also approve greeting if message ad and greeting exists
      if (isMessageAd) {
        const greeting = greetingMap.get(imageId)
        if (greeting) {
          setImageGreeting(imageId, { ...greeting, status: 'approved' })
        }
      }
    },
    [updateAdCopy, isMessageAd, greetingMap, setImageGreeting]
  )

  const handleUpdate = useCallback(
    (imageId: string, updates: Partial<GeneratedAdCopy>) => {
      updateAdCopy(imageId, updates)
    },
    [updateAdCopy]
  )

  const handleApproveAll = useCallback(() => {
    // Approve all ad copies
    const adCopiesArray = Array.from(adCopyMap.entries())
    adCopiesArray.forEach(([imageId, copy]) => {
      if (copy.status !== 'approved') {
        updateAdCopy(imageId, { status: 'approved' })
      }
    })
    // Also approve all greetings if message ad
    if (isMessageAd) {
      approvedImages.forEach((img) => {
        const greeting = greetingMap.get(img.id)
        if (greeting && greeting.status !== 'approved') {
          setImageGreeting(img.id, { ...greeting, status: 'approved' })
        }
      })
    }
  }, [adCopyMap, updateAdCopy, isMessageAd, approvedImages, greetingMap, setImageGreeting])

  // ========================
  // Individual Greeting Handlers
  // ========================

  const handleGenerateIndividualGreeting = useCallback(
    async (imageId: string) => {
      // Resolve copy source: use adCopyMap for this specific image
      const copySource = adCopyMap.get(imageId)
      if (!copySource) return

      setGeneratingGreetingIds((prev) => new Set([...prev, imageId]))
      try {
        const result = await generateIceBreakersMutation.mutateAsync({
          primaryText: copySource.primaryText,
          headline: copySource.headline,
          description: copySource.description,
        })

        setImageGreeting(imageId, {
          greeting: result.greeting,
          iceBreakers: result.iceBreakers,
          status: 'pending',
        })
      } catch (error) {
        console.error('Failed to generate greeting:', error)
      } finally {
        setGeneratingGreetingIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(imageId)
          return newSet
        })
      }
    },
    [adCopyMap, generateIceBreakersMutation, setImageGreeting]
  )

  const handleUpdateIndividualGreeting = useCallback(
    (imageId: string, config: GreetingConfig) => {
      setImageGreeting(imageId, config)
    },
    [setImageGreeting]
  )

  // ========================
  // Generate Everything (both ad copy + greeting)
  // ========================

  const handleGenerateEverything = useCallback(async () => {
    if (approvedImages.length === 0) return

    setIsGeneratingEverything(true)
    try {
      if (adCopyApplyMode === 'shared') {
        // Shared mode
        // 1. Generate shared ad copy if not yet generated
        let adCopyResult = sharedAdCopy
        if (!adCopyResult) {
          adCopyResult = await handleGenerateSharedCopy() ?? null
        }

        // 2. Generate shared greeting if message ad and not yet generated
        if (isMessageAd && !sharedGreeting && adCopyResult) {
          setIsGeneratingSharedGreeting(true)
          try {
            const result = await generateIceBreakersMutation.mutateAsync({
              primaryText: adCopyResult.primaryText,
              headline: adCopyResult.headline,
              description: adCopyResult.description,
            })
            setSharedGreeting({
              greeting: result.greeting,
              iceBreakers: result.iceBreakers,
              status: 'pending',
            })
          } finally {
            setIsGeneratingSharedGreeting(false)
          }
        }
      } else {
        // Individual mode
        const BATCH_SIZE = 5

        // 1. Generate ad copy for all images without it
        const needsCopy = approvedImages.filter((img) => !adCopyMap.has(img.id))
        for (let i = 0; i < needsCopy.length; i += BATCH_SIZE) {
          const batch = needsCopy.slice(i, i + BATCH_SIZE)
          await Promise.all(batch.map((img) => handleGenerate(img.id, img.articleId)))
        }

        // 2. Generate greeting for all images without it (if message ad)
        if (isMessageAd) {
          // Read fresh state after ad copy generation
          const freshState = useMetaAdsWizardStore.getState()
          const needsGreeting = approvedImages.filter((img) => !freshState.greetingMap.has(img.id))

          for (let i = 0; i < needsGreeting.length; i += BATCH_SIZE) {
            const batch = needsGreeting.slice(i, i + BATCH_SIZE)
            await Promise.all(
              batch.map(async (img) => {
                const copySource = freshState.adCopyMap.get(img.id)
                if (!copySource) return

                setGeneratingGreetingIds((prev) => new Set([...prev, img.id]))
                try {
                  const result = await generateIceBreakersMutation.mutateAsync({
                    primaryText: copySource.primaryText,
                    headline: copySource.headline,
                    description: copySource.description,
                  })
                  setImageGreeting(img.id, {
                    greeting: result.greeting,
                    iceBreakers: result.iceBreakers,
                    status: 'pending',
                  })
                } finally {
                  setGeneratingGreetingIds((prev) => {
                    const newSet = new Set(prev)
                    newSet.delete(img.id)
                    return newSet
                  })
                }
              })
            )
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate everything:', error)
    } finally {
      setIsGeneratingEverything(false)
    }
  }, [
    adCopyApplyMode,
    approvedImages,
    sharedAdCopy,
    sharedGreeting,
    isMessageAd,
    adCopyMap,
    handleGenerate,
    handleGenerateSharedCopy,
    generateIceBreakersMutation,
    setSharedGreeting,
    setImageGreeting,
  ])

  // Count pending approvals (individual mode)
  const pendingApprovalCount = useMemo(() => {
    return approvedImages.filter((img) => {
      const copy = adCopyMap.get(img.id)
      if (!copy) return false // no content yet, can't approve
      return !isCardFullyApproved(img.id)
    }).length
  }, [approvedImages, adCopyMap, isCardFullyApproved])

  // Check if there are items still needing generation
  const needsGeneration = useMemo(() => {
    if (adCopyApplyMode === 'shared') {
      const needsCopy = !sharedAdCopy
      const needsGreeting = isMessageAd && !sharedGreeting
      return needsCopy || needsGreeting
    }
    const needsCopy = approvedImages.some((img) => !adCopyMap.has(img.id))
    const needsGreeting = isMessageAd && approvedImages.some((img) => !greetingMap.has(img.id))
    return needsCopy || needsGreeting
  }, [adCopyApplyMode, sharedAdCopy, sharedGreeting, isMessageAd, approvedImages, adCopyMap, greetingMap])

  // ========================
  // Render
  // ========================

  return (
    <div className={styles.container}>
      {/* Header with global toggle + Gerar Tudo */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Textos dos Anúncios</h2>
          <p className={styles.description}>
            Configure os textos {isMessageAd ? 'e a saudação ' : ''}para seus anúncios. Você pode usar um texto
            único para todos os criativos ou personalizar cada um individualmente.
          </p>
        </div>

        {approvedImages.length > 0 && (
          <div className={styles.headerActions}>
            <ModeToggle
              mode={adCopyApplyMode}
              onChange={setContentApplyMode}
            />
            {needsGeneration && (
              <button
                type="button"
                className={styles.generateEverythingButton}
                onClick={handleGenerateEverything}
                disabled={isGeneratingEverything || generateAdCopyMutation.isPending}
              >
                {isGeneratingEverything ? <ButtonSpinner /> : <SparkleIcon />}
                {isGeneratingEverything ? 'Gerando...' : 'Gerar Tudo'}
              </button>
            )}
          </div>
        )}
      </div>

      {adCopyApplyMode === 'shared' ? (
        /* ========== SHARED MODE ========== */
        <>
          {/* Section 1: Ad Copy */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionTitleIcon}><TextIcon /></span>
                Texto do Anúncio
              </h3>
            </div>
            <SharedAdCopyForm
              adCopy={sharedAdCopy}
              onChange={handleUpdateSharedCopy}
              onGenerate={handleGenerateSharedCopy}
              onApprove={handleApproveSharedCopy}
              isGenerating={isGeneratingSharedCopy}
            />
          </div>

          {/* Section 2: Greeting (Message Ads only) */}
          {isMessageAd && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <span className={styles.sectionTitleIcon}><MessageIcon /></span>
                  Configurador de Conversa
                </h3>
              </div>
              <p className={styles.description} style={{ margin: 0 }}>
                Configure a mensagem de saudação e as perguntas rápidas (ice breakers) que aparecerão
                quando o usuário clicar no anúncio para iniciar uma conversa.
              </p>
              <SharedGreetingForm
                greeting={sharedGreeting}
                onChange={handleUpdateSharedGreeting}
                onGenerate={handleGenerateSharedGreeting}
                isGenerating={isGeneratingSharedGreeting}
              />
            </div>
          )}
        </>
      ) : (
        /* ========== INDIVIDUAL MODE ========== */
        <>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.stats}>
              <span className={styles.statItem}>
                <strong>{stats.approved}</strong> / {stats.total} aprovados
              </span>
              {stats.generated < stats.total && (
                <span className={styles.statItem}>
                  <strong>{stats.total - stats.generated}</strong> pendentes
                </span>
              )}
            </div>

            <div className={styles.toolbarActions}>
              {pendingApprovalCount > 0 && (
                <button className={styles.approveAllButton} onClick={handleApproveAll}>
                  <CheckAllIcon />
                  Aprovar Todos ({pendingApprovalCount})
                </button>
              )}
            </div>
          </div>

          {/* Credits */}
          {creditsPreview && !creditsPreview.hasSufficientCredits && (
            <div className={styles.creditsWarning}>
              Créditos insuficientes. Disponível: {creditsPreview.userBalance} créditos.
            </div>
          )}

          {/* Cards Grid */}
          <div className={styles.cardsGrid}>
            {approvedImages.map((image) => (
              <AdCopyCard
                key={image.id}
                imageUrl={image.imageUrl}
                articleTitle={`Artigo #${image.articleId}`}
                adCopy={adCopyMap.get(image.id)}
                greetingConfig={greetingMap.get(image.id)}
                isGenerating={generatingIds.has(image.id)}
                isGeneratingGreeting={generatingGreetingIds.has(image.id)}
                isMessageAd={isMessageAd}
                onGenerate={() => handleGenerate(image.id, image.articleId)}
                onUpdate={(updates) => handleUpdate(image.id, updates)}
                onApprove={() => handleApprove(image.id)}
                onGenerateGreeting={() => handleGenerateIndividualGreeting(image.id)}
                onUpdateGreeting={(config) => handleUpdateIndividualGreeting(image.id, config)}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {approvedImages.length === 0 && (
        <div className={styles.emptyState}>
          <p>Nenhuma imagem aprovada.</p>
          <p>Volte ao passo anterior para aprovar imagens.</p>
        </div>
      )}
    </div>
  )
}
