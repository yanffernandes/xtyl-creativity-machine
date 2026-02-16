import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Save, Loader2, ChevronLeft, CheckCircle, Megaphone, Circle } from 'lucide-react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Alert } from '@/shared/components'
import styles from './MetaAdsWizardPage.module.css'
import { useSaveTemplate, usePublishCampaign } from '../api/mutations'
import { useMetaTemplate } from '../api/queries'
import { serializeWizardState, deserializeWizardState } from '../utils/wizardStateSerializer'
import type { WizardStateSnapshot } from '../utils/wizardStateSerializer'
import {
  StepArticles,
  StepAdSetsConfig,
  AccountStep,
  PixelStep,
  PageStep,
  InstagramStep,
  ObjectiveStep,
  TargetingStep,
  BudgetStep,
  CreativeStep,
  StepCreatives,
  StepApproval,
  StepAdCopyGeneration,
  ReviewStep,
} from '../components/wizard'
import { MetaWizardStepper } from '../components/wizard/MetaWizardStepper'
import { useMetaAdsWizardStore } from '../stores/metaAdsWizardStore'
import { META_WIZARD_STEPS, type MetaWizardStep, type MetaCampaignData } from '../types/campaign'

// Use the centralized steps from types
const STEPS: MetaWizardStep[] = META_WIZARD_STEPS

export function MetaAdsWizardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { templateId: routeTemplateId } = useParams<{ templateId: string }>()
  // Support both URL param (/editar/:templateId) and query param (?id=xxx)
  const templateId = routeTemplateId || searchParams.get('id')
  const workspaceId = useWorkspaceId()

  const {
    currentStep,
    templateName: storeTemplateName,
    setTemplateName: setStoreTemplateName,
    goToNextStep,
    goToPreviousStep,
    completedSteps,
    reset,
    connectionId,
    accounts,
    pages,
    instagramAccount,
    selectedPixel,
    objective,
    destinationType,
    optimizationGoal,
    conversionEvent,
    customEventStr,
    targeting,
    budget,
    driveImages,
    adCopy,
    approvedImages,
    selectedArticles,
    publishStatus,
    messageConfig,
    specialAdCategories,
    adCopyApplyMode,
    sharedAdCopy,
    greetingApplyMode,
    sharedGreeting,
    greetingMap,
  } = useMetaAdsWizardStore()

  const [savedTemplateId, setSavedTemplateId] = useState<string | undefined>(templateId || undefined)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Publishing progress state
  const [publishProgress, setPublishProgress] = useState<{
    isActive: boolean
    phase: 'saving' | 'uploading' | 'creating' | 'finalizing' | 'done'
    percent: number
    totalAds: number
  } | null>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Use the store templateName directly instead of local state to stay in sync
  // This ensures auto-generated names from ObjectiveStep are used
  const templateName = storeTemplateName || 'Nova Campanha Meta'

  // API Hooks
  const saveTemplateMutation = useSaveTemplate()
  const publishCampaignMutation = usePublishCampaign()

  // Cleanup progress interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Calculate total ads count for progress
  const isUsingAIFlowForCount = approvedImages.length > 0
  const totalAdsCount = isUsingAIFlowForCount ? approvedImages.length : driveImages.length

  // Start publishing progress simulation
  const startPublishProgress = useCallback(() => {
    const totalAds = totalAdsCount || 1

    // Phase timeline estimation:
    // Saving template: ~1-2s (5%)
    // Uploading images: ~3-8s depending on count (5% -> 40%)
    // Creating ad sets: ~10-30s depending on count (40% -> 90%)
    // Finalizing: ~2s (90% -> 95%)
    setPublishProgress({
      isActive: true,
      phase: 'saving',
      percent: 2,
      totalAds,
    })

    const startTime = Date.now()
    // Estimate total time: ~3s per ad for parallel processing
    const estimatedTotalMs = Math.max(10000, totalAds * 3000)

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawProgress = (elapsed / estimatedTotalMs) * 100

      // Determine phase based on progress
      let phase: 'saving' | 'uploading' | 'creating' | 'finalizing' | 'done'
      let percent: number

      if (rawProgress < 5) {
        phase = 'saving'
        percent = Math.max(2, rawProgress)
      } else if (rawProgress < 35) {
        phase = 'uploading'
        percent = rawProgress
      } else if (rawProgress < 85) {
        phase = 'creating'
        percent = rawProgress
      } else {
        phase = 'finalizing'
        // Slow down near the end - never exceed 95% until real completion
        percent = 85 + (rawProgress - 85) * 0.3
      }

      percent = Math.min(percent, 95)

      setPublishProgress(prev => prev ? {
        ...prev,
        phase,
        percent: Math.max(prev.percent, percent), // Never go backwards
      } : null)
    }, 300)
  }, [totalAdsCount])

  // Stop progress and show completion
  const completePublishProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setPublishProgress(prev => prev ? {
      ...prev,
      phase: 'done',
      percent: 100,
    } : null)
    // Hide after a brief moment
    setTimeout(() => {
      setPublishProgress(null)
    }, 800)
  }, [])

  // Cancel progress on error
  const cancelPublishProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setPublishProgress(null)
  }, [])

  // Load existing template if editing
  const { data: templateData } = useMetaTemplate(templateId || undefined)

  // Reset wizard on mount and load template data
  useEffect(() => {
    if (!templateId) {
      reset()
    }
  }, [templateId, reset])

  useEffect(() => {
    if (templateData) {
      // Load template name
      setStoreTemplateName(templateData.name)

      // Resume wizard state if available
      if (templateData.wizard_state) {
        try {
          const restoredState = deserializeWizardState(
            templateData.wizard_state as unknown as WizardStateSnapshot
          )
          // Apply restored state to the store (excluding templateId which is set via URL)
          useMetaAdsWizardStore.setState(restoredState)
          console.log('[Wizard Resume] State restored from wizard_state snapshot')
        } catch (err) {
          console.warn('[Wizard Resume] Failed to restore wizard state:', err)
        }
      }
    }
  }, [templateData, setStoreTemplateName])

  const handleBack = () => {
    navigate('/alvoads-meta')
  }

  const handleSaveTemplate = async (showSuccessMessage = true): Promise<string | null> => {
    setSaveMessage(null)
    try {
      // Determine if using AI flow (has approved images from AI generation)
      const isUsingAIFlow = approvedImages.length > 0
      const adCopyMap = useMetaAdsWizardStore.getState().adCopyMap

      // Build mediaFiles based on flow type
      let mediaFiles: Array<{ id: string; name: string; url: string; type: 'image' | 'video'; source: 'drive' | 'ai_generated' | 'upload' }>

      if (isUsingAIFlow) {
        // AI flow: use approved images
        mediaFiles = approvedImages.map((img) => ({
          id: img.id,
          name: `creative-${img.articleId}-${img.adsetIndex}`,
          url: img.imageUrl,
          type: 'image' as const,
          source: img.libraryId ? 'ai_generated' as const : 'ai_generated' as const,
        }))
      } else {
        // Legacy flow: use drive images
        mediaFiles = driveImages
          .filter((img) => img.url) // Filter out any with missing URLs
          .map((img) => ({
            id: img.id,
            name: img.name,
            url: img.url!, // Safe because we filtered above
            type: 'image' as const,
            source: 'drive' as const,
          }))
      }

      // Build ad creatives based on flow type
      // For AI flow, create one creative per approved image with its specific ad copy
      interface AdCreativeData {
        imageId: string
        articleId?: number
        primaryText: string
        headline: string
        description: string
        callToAction: string
        linkUrl: string
        displayUrl?: string
        greetingConfig?: {
          greeting: string
          iceBreakers: Array<{ title: string; response: string }>
        }
      }

      let adsCreatives: AdCreativeData[] = []

      if (isUsingAIFlow && approvedImages.length > 0) {
        // AI flow: create one creative per approved image
        // Resolve ad copy based on shared/individual mode
        adsCreatives = approvedImages.map((img) => {
          // Get the ad copy: shared mode uses sharedAdCopy, individual uses adCopyMap
          const resolvedCopy = adCopyApplyMode === 'shared' && sharedAdCopy
            ? sharedAdCopy
            : adCopyMap.get(img.id)

          // Find the corresponding article to get its URL for TRAFFIC campaigns
          const article = selectedArticles.find((a) => a.id === img.articleId)
          // For TRAFFIC/SALES campaigns with WEBSITE destination, use the article URL
          const isWebsiteDestination = destinationType === 'WEBSITE'
          const linkUrl =
            isWebsiteDestination && article?.url
              ? article.url
              : adCopy.destinationUrl || ''

          // Extract display URL from linkUrl (domain without www)
          let displayUrl = adCopy.displayUrl || ''
          if (!displayUrl && linkUrl) {
            try {
              const urlObj = new URL(linkUrl)
              displayUrl = urlObj.hostname.replace(/^www\./, '')
            } catch {
              // Invalid URL, leave displayUrl empty
            }
          }

          // Resolve greeting config based on shared/individual mode
          const resolvedGreeting = greetingApplyMode === 'shared'
            ? sharedGreeting
            : greetingMap.get(img.id)

          return {
            imageId: img.id,
            articleId: img.articleId, // Include articleId for backend reference
            primaryText: resolvedCopy?.primaryText || adCopy.primaryText || 'Confira nossa oferta!',
            headline: resolvedCopy?.headline || adCopy.headline || templateName,
            description: resolvedCopy?.description || adCopy.description || '',
            callToAction: resolvedCopy?.cta || adCopy.callToAction || 'LEARN_MORE',
            linkUrl,
            displayUrl,
            // Greeting config for message ads
            greetingConfig: resolvedGreeting ? {
              greeting: resolvedGreeting.greeting,
              iceBreakers: resolvedGreeting.iceBreakers,
            } : undefined,
          }
        })
      } else {
        // Legacy flow: create one creative per drive image (all using same ad copy)
        // For WEBSITE destination campaigns, prioritize article URL over adCopy.destinationUrl
        const firstArticle = selectedArticles.length > 0 ? selectedArticles[0] : null
        const articleUrl = firstArticle?.url || null

        adsCreatives = mediaFiles.map((img) => {
          // Determine the link URL:
          // 1. For WEBSITE destination with selected article, use article URL
          // 2. Otherwise use the destination URL from ad copy
          const isWebDest = destinationType === 'WEBSITE'
          const linkUrl =
            isWebDest && articleUrl
              ? articleUrl
              : adCopy.destinationUrl || ''

          // Extract display URL from linkUrl (domain without www)
          let displayUrl = adCopy.displayUrl || ''
          if (!displayUrl && linkUrl) {
            try {
              const urlObj = new URL(linkUrl)
              displayUrl = urlObj.hostname.replace(/^www\./, '')
            } catch {
              // Invalid URL, leave displayUrl empty
            }
          }

          return {
            imageId: img.id,
            primaryText: adCopy.primaryText,
            headline: adCopy.headline,
            description: adCopy.description,
            callToAction: adCopy.callToAction || 'LEARN_MORE',
            linkUrl,
            displayUrl,
          }
        })
      }

      // Keep backward compatibility - also store the first creative as 'creative'
      // For TRAFFIC campaigns, prioritize article URL
      const fallbackArticle = selectedArticles.length > 0 ? selectedArticles[0] : null
      const isWebDestination = destinationType === 'WEBSITE'
      const fallbackLinkUrl =
        isWebDestination && fallbackArticle?.url
          ? fallbackArticle.url
          : adCopy.destinationUrl || ''

      const firstCreative = adsCreatives[0] || {
        imageId: '',
        primaryText: adCopy.primaryText,
        headline: adCopy.headline,
        description: adCopy.description,
        callToAction: adCopy.callToAction || 'LEARN_MORE',
        linkUrl: fallbackLinkUrl,
        displayUrl: adCopy.displayUrl,
      }

      // Build template data from store
      const campaignData = {
        upload: {
          connectionId: connectionId || '', // Include connectionId for proper connection lookup
          adAccountId: accounts[0]?.id || '',
          pageId: pages[0]?.id || '',
          instagramAccountId: instagramAccount?.id || undefined,
          mediaFiles,
        },
        campaign: {
          name: templateName,
          objective: objective || 'OUTCOME_TRAFFIC',
          specialAdCategories: specialAdCategories || [],
          // Derivar países da categoria especial diretamente dos países de targeting
          specialAdCategoryCountry: specialAdCategories.length > 0 ? targeting.countries : undefined,
          status: publishStatus || 'PAUSED',
        },
        adSet: {
          name: `${templateName} - AdSet`,
          destinationType: destinationType || 'WEBSITE',
          optimizationGoal: optimizationGoal || 'LINK_CLICKS',
          // Promoted object: defines WHAT the algorithm optimizes for.
          // IMPORTANT: page_id and pixel_id are MUTUALLY EXCLUSIVE in promoted_object.
          // - page_id = optimize for conversations/engagement (messaging, lead forms, etc.)
          // - pixel_id + custom_event_type = optimize for offsite conversions (purchases, leads, etc.)
          // The page_id for the ad creative is set separately in object_story_spec.
          promotedObject: (() => {
            const obj: Record<string, unknown> = {}

            // Determine if optimization is pixel-based (conversion tracking)
            const isPixelOptimization =
              optimizationGoal === 'OFFSITE_CONVERSIONS' ||
              optimizationGoal === 'VALUE'

            if (isPixelOptimization && selectedPixel) {
              // PIXEL-BASED: optimize for offsite conversions via Pixel/CAPI
              // Even if destination is messaging, the promoted_object tracks PIXEL events
              obj.pixel_id = selectedPixel.id
              if (conversionEvent && conversionEvent !== 'OTHER') {
                obj.custom_event_type = conversionEvent
              } else if (conversionEvent === 'OTHER' && customEventStr) {
                obj.custom_event_str = customEventStr
              } else {
                // Meta API REQUIRES custom_event_type with pixel_id.
                // Use smart default based on objective if user didn't select one.
                obj.custom_event_type = objective === 'OUTCOME_SALES'
                  ? 'PURCHASE'
                  : objective === 'OUTCOME_LEADS'
                    ? 'LEAD'
                    : 'PURCHASE'
              }
            } else if (destinationType === 'WEBSITE' && selectedPixel) {
              // WEBSITE without pixel optimization: still include pixel for tracking
              obj.pixel_id = selectedPixel.id
              if (conversionEvent && conversionEvent !== 'OTHER') {
                obj.custom_event_type = conversionEvent
              } else if (conversionEvent === 'OTHER' && customEventStr) {
                obj.custom_event_str = customEventStr
              }
            } else {
              // PAGE-BASED: optimize for conversations, engagement, leads, etc.
              // Destinations that need page_id: messaging, phone, on-platform
              const needsPageId = [
                'MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT',
                'PHONE_CALL', 'ON_AD', 'ON_POST', 'ON_EVENT',
              ].includes(destinationType)

              if (needsPageId && pages[0]?.id) {
                obj.page_id = pages[0].id
              }
            }

            return Object.keys(obj).length > 0 ? obj : undefined
          })(),
          targeting: {
            ageMin: targeting.ageMin,
            ageMax: targeting.ageMax,
            genders: targeting.genders,
            geoLocations: {
              countries: targeting.countries,
            },
            locales: targeting.languages.map((l) => parseInt(l.key)),
          },
          budget: {
            type: budget.type,
            amount: budget.amount,
            // Include bid amounts for respective strategies
            costPerResult: budget.bidStrategy === 'COST_CAP' ? budget.costPerResult : undefined,
            bidCap: budget.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' ? budget.bidCap : undefined,
            minRoas: budget.bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' ? budget.minRoas : undefined,
          },
          bidStrategy: budget.bidStrategy,
        },
        ads: {
          name: `${templateName} - Ad`,
          creative: firstCreative,
          creatives: adsCreatives,
          pixelEnabled: !!selectedPixel,
          pixelId: selectedPixel?.id,
        },
        // Message configuration for messaging destinations
        messageConfig: ['MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'].includes(destinationType) ? messageConfig : undefined,
      }

      // Serialize the full wizard state for resume
      const fullStoreState = useMetaAdsWizardStore.getState()
      const wizardState = serializeWizardState(fullStoreState as unknown as Record<string, unknown>)

      const result = await saveTemplateMutation.mutateAsync({
        id: savedTemplateId,
        templateName: templateName || 'Campanha sem nome',
        // Cast to any during transition - data structure differs from MetaCampaignData
        campaignData: campaignData as unknown as MetaCampaignData,
        workspaceId: workspaceId || undefined,
        wizardState: wizardState as unknown as Record<string, unknown>,
        lastWizardStep: currentStep,
      })

      if (result) {
        setSavedTemplateId(result.id)
        if (showSuccessMessage) {
          setSaveMessage({ type: 'success', text: 'Template salvo com sucesso!' })
          setTimeout(() => setSaveMessage(null), 3000)
        }
        if (!templateId) {
          navigate(`/alvoads-meta/criar?id=${result.id}`, { replace: true })
        }
        return result.id // Return the saved template ID
      }
      return null
    } catch (error) {
      console.error('Error saving template:', error)
      setSaveMessage({ type: 'error', text: 'Erro ao salvar template. Tente novamente.' })
      return null
    }
  }

  // Auto-save silently when navigating between steps
  const autoSave = useCallback(async () => {
    if (savedTemplateId) {
      try {
        await handleSaveTemplate(false) // silent save, no toast
      } catch {
        // Silently fail auto-save - user can manually save
        console.warn('[Wizard AutoSave] Silent save failed')
      }
    }
  }, [savedTemplateId])

  const handleNext = () => {
    goToNextStep()
    // Auto-save after advancing (non-blocking)
    autoSave()
  }

  const handlePrevious = () => {
    goToPreviousStep()
    // Auto-save after going back (non-blocking)
    autoSave()
  }

  const handlePublish = async () => {
    setSaveMessage(null)
    startPublishProgress()

    // Always save the template first and get the ID directly from the result
    // This ensures we have the latest data and avoids race conditions with state updates
    // Pass false to suppress the "saved" message since we're going straight to publish
    const templateIdToPublish = await handleSaveTemplate(false)

    if (!templateIdToPublish) {
      // handleSaveTemplate already set the error message
      cancelPublishProgress()
      return
    }

    try {
      const result = await publishCampaignMutation.mutateAsync({
        templateId: templateIdToPublish,
        dryRun: false,
      })

      if (result.success) {
        completePublishProgress()
        // Small delay to show 100% before navigating
        setTimeout(() => {
          navigate('/alvoads-meta', {
            state: { message: 'Campanha publicada com sucesso!' }
          })
        }, 600)
      } else if (result.error) {
        cancelPublishProgress()
        setSaveMessage({
          type: 'error',
          text: `Erro ao publicar: ${result.error}`
        })
      }
    } catch (error) {
      cancelPublishProgress()
      console.error('Error publishing campaign:', error)
      // Extract actual error message from the API error
      const errorMessage = error instanceof Error
        ? error.message
        : (error as { message?: string })?.message || 'Erro ao publicar campanha. Tente novamente.'
      setSaveMessage({ type: 'error', text: `Erro ao publicar: ${errorMessage}` })
    }
  }

  const isSaving = saveTemplateMutation.isPending
  const isPublishing = publishCampaignMutation.isPending

  const renderStep = () => {
    switch (currentStep) {
      case 'articles':
        return <StepArticles />
      case 'adsets_config':
        return <StepAdSetsConfig />
      case 'account':
        return <AccountStep />
      case 'pixel':
        return <PixelStep />
      case 'page':
        return <PageStep />
      case 'instagram':
        return <InstagramStep />
      case 'objective':
        return <ObjectiveStep />
      case 'targeting':
        return <TargetingStep />
      case 'budget':
        return <BudgetStep />
      case 'creative':
        return <CreativeStep />
      case 'creative_ai':
        return <StepCreatives />
      case 'creative_approval':
        return <StepApproval />
      case 'ad_copy':
        // Use AI ad copy generation when we have approved AI-generated images
        return <StepAdCopyGeneration />
      case 'review':
        return <ReviewStep />
      default:
        return <StepArticles />
    }
  }

  const currentIndex = STEPS.indexOf(currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentStep === 'review'

  // Determine if using AI flow (has approved images from AI generation)
  const isUsingAIFlow = approvedImages.length > 0

  // Required steps vary based on flow type
  // AI flow: articles, adsets_config, account, page, instagram, objective, targeting, budget, creative_ai, creative_approval, ad_copy
  // Legacy flow: account, page, instagram, objective, targeting, budget, creative, ad_copy
  const requiredSteps: MetaWizardStep[] = isUsingAIFlow
    ? [
        'articles',
        'adsets_config',
        'account',
        'pixel',
        'page',
        'instagram',
        'objective',
        'targeting',
        'budget',
        'creative_ai',
        'creative_approval',
        'ad_copy',
      ]
    : [
        'account',
        'pixel',
        'page',
        'instagram',
        'objective',
        'targeting',
        'budget',
        'creative',
        'ad_copy',
      ]

  const canPublish = requiredSteps.every((step) => completedSteps.has(step))

  // Check if current step is completed to allow advancement
  const isCurrentStepCompleted = completedSteps.has(currentStep)

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setStoreTemplateName(e.target.value)}
            className={styles.templateName}
            placeholder="Nome do template"
          />
          {savedTemplateId && (
            <span className={styles.savedBadge}>
              <CheckCircle size={14} /> Salvo
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <Button
            variant="outline"
            leftIcon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            onClick={() => handleSaveTemplate()}
            disabled={isSaving || isPublishing}
          >
            {isSaving ? 'Salvando...' : 'Salvar template'}
          </Button>
          {!isFirstStep && (
            <Button
              variant="ghost"
              leftIcon={<ChevronLeft size={16} />}
              onClick={handlePrevious}
              disabled={isSaving || isPublishing}
            >
              Anterior
            </Button>
          )}
          {isLastStep ? (
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={isSaving || isPublishing || !canPublish}
            >
              {isPublishing ? 'Publicando...' : 'Publicar campanha'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={isSaving || isPublishing || !isCurrentStepCompleted}
            >
              Próximo
            </Button>
          )}
        </div>
      </header>

      {/* Feedback Message */}
      {saveMessage && (
        <div className={styles.messageBar}>
          <Alert
            variant={saveMessage.type}
            onClose={() => setSaveMessage(null)}
          >
            {saveMessage.text}
          </Alert>
        </div>
      )}

      {/* Stepper */}
      <div className={styles.stepperWrapper}>
        <MetaWizardStepper />
      </div>

      {/* Content */}
      <main className={styles.content}>
        {renderStep()}
      </main>

      {/* Footer Navigation (mobile) */}
      <footer className={styles.footer}>
        {!isFirstStep && (
          <Button variant="outline" onClick={handlePrevious} disabled={isSaving || isPublishing}>
            Anterior
          </Button>
        )}
        <div className={styles.footerSpacer} />
        {isLastStep ? (
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={isSaving || isPublishing || !canPublish}
          >
            {isPublishing ? 'Publicando...' : 'Publicar'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={isSaving || isPublishing || !isCurrentStepCompleted}
          >
            Próximo
          </Button>
        )}
      </footer>

      {/* Publishing Progress Overlay */}
      {publishProgress?.isActive && (
        <div className={styles.publishingOverlay}>
          <div className={styles.publishingCard}>
            <div className={styles.publishingTitle}>
              <Megaphone size={24} />
              Publicando campanha
            </div>

            {/* Progress Bar */}
            <div className={styles.publishingProgressBar}>
              <div
                className={styles.publishingProgressFill}
                style={{ width: `${Math.max(5, publishProgress.percent)}%` }}
              />
              <span className={styles.publishingProgressLabel}>
                <Loader2 size={14} className={styles.publishingSpinner} />
                {publishProgress.phase === 'saving' && 'Salvando template...'}
                {publishProgress.phase === 'uploading' && 'Enviando imagens...'}
                {publishProgress.phase === 'creating' && 'Criando conjuntos e anúncios...'}
                {publishProgress.phase === 'finalizing' && 'Finalizando...'}
                {publishProgress.phase === 'done' && 'Concluído!'}
              </span>
              <span className={styles.publishingProgressText}>
                {Math.round(publishProgress.percent)}%
              </span>
            </div>

            {/* Step indicators */}
            <div className={styles.publishingSteps}>
              <div className={`${styles.publishingStep} ${
                publishProgress.phase === 'saving' ? styles.active :
                ['uploading', 'creating', 'finalizing', 'done'].includes(publishProgress.phase) ? styles.completed : ''
              }`}>
                {['uploading', 'creating', 'finalizing', 'done'].includes(publishProgress.phase)
                  ? <CheckCircle size={14} />
                  : publishProgress.phase === 'saving'
                    ? <Loader2 size={14} className={styles.publishingSpinner} />
                    : <Circle size={14} />
                }
                Salvando template
              </div>
              <div className={`${styles.publishingStep} ${
                publishProgress.phase === 'uploading' ? styles.active :
                ['creating', 'finalizing', 'done'].includes(publishProgress.phase) ? styles.completed : ''
              }`}>
                {['creating', 'finalizing', 'done'].includes(publishProgress.phase)
                  ? <CheckCircle size={14} />
                  : publishProgress.phase === 'uploading'
                    ? <Loader2 size={14} className={styles.publishingSpinner} />
                    : <Circle size={14} />
                }
                Enviando {publishProgress.totalAds} {publishProgress.totalAds === 1 ? 'imagem' : 'imagens'} (paralelo)
              </div>
              <div className={`${styles.publishingStep} ${
                publishProgress.phase === 'creating' ? styles.active :
                ['finalizing', 'done'].includes(publishProgress.phase) ? styles.completed : ''
              }`}>
                {['finalizing', 'done'].includes(publishProgress.phase)
                  ? <CheckCircle size={14} />
                  : publishProgress.phase === 'creating'
                    ? <Loader2 size={14} className={styles.publishingSpinner} />
                    : <Circle size={14} />
                }
                Criando {publishProgress.totalAds} {publishProgress.totalAds === 1 ? 'conjunto + anúncio' : 'conjuntos + anúncios'}
              </div>
              <div className={`${styles.publishingStep} ${
                publishProgress.phase === 'finalizing' ? styles.active :
                publishProgress.phase === 'done' ? styles.completed : ''
              }`}>
                {publishProgress.phase === 'done'
                  ? <CheckCircle size={14} />
                  : publishProgress.phase === 'finalizing'
                    ? <Loader2 size={14} className={styles.publishingSpinner} />
                    : <Circle size={14} />
                }
                Finalizando e registrando créditos
              </div>
            </div>

            <p className={styles.publishingHint}>
              Não feche esta página. Isso pode levar alguns instantes...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
