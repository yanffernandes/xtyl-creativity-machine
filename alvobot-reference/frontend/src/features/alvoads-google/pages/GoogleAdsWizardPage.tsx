import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ArrowLeft, ChevronLeft, Save, Loader2, CheckCircle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMineKeywords } from '@/features/keywords/api/mutations'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Alert } from '@/shared/components'
import { useConfirmDialog } from '@/shared/hooks'
import {
  useSaveGoogleTemplate,
  usePublishGoogleCampaign,
  useGenerateFromArticle,
  useGenerateKeywordIdeas,
  useExpandKeyword,
  getGeoTargetId,
  getLanguageId,
  MIN_KEYWORDS_REQUIRED,
} from '../api/useGoogleCampaigns'
import {
  WizardStepper,
  StepAccount,
  StepArticleSource,
  StepCampaign,
  StepKeywords,
  StepSearchAds,
  StepExtensions,
  StepReview,
  BulkPublishProgress,
} from '../components'
import styles from './GoogleAdsWizardPage.module.css'
import { AutoPublishProgress } from '../components/AutoPublishProgress'
import { PublishModeModal } from '../components/PublishModeModal'
import { useGoogleAdsWizardStore } from '../stores/googleAdsWizardStore'
import {
  replaceCampaignNamePlaceholders,
  slugify,
} from '../utils/namingConvention'
import { getArticleFinalUrl } from '../utils/utmBuilder'
import type { BulkPublishState, BulkPublishResult } from '../components/BulkPublishProgress'
import type { GoogleKeyword, GoogleAccountData, SourceArticleData } from '../types/campaign'

// Helper to extract slug from URL
function extractSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    // Remove trailing slash and get last segment
    const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1] || ''
    // If it's a query param like ?p=123, return the ID
    if (!lastSegment && urlObj.searchParams.has('p')) {
      return `post-${urlObj.searchParams.get('p')}`
    }
    return lastSegment || 'sem-slug'
  } catch {
    return 'sem-slug'
  }
}

// Helper to extract display paths from URL for Google Ads
// path1 and path2 are shown in the ad URL (max 15 chars each)
function extractDisplayPaths(url: string, keyword?: string): { path1: string; path2: string } {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    // Get path segments
    const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean)

    // Default paths
    let path1 = ''
    let path2 = ''

    if (segments.length > 0) {
      // Use the last segment (usually the article slug)
      const slug = segments[segments.length - 1] || ''
      // Split slug by hyphens and take meaningful parts
      const parts = slug.split('-').filter(p => p.length > 2)

      if (parts.length >= 2) {
        // Take first two meaningful parts
        path1 = parts[0].slice(0, 15)
        path2 = parts[1].slice(0, 15)
      } else if (parts.length === 1) {
        path1 = parts[0].slice(0, 15)
        // Use keyword for path2 if available
        if (keyword) {
          const kwParts = keyword.split(' ').filter(p => p.length > 2)
          path2 = (kwParts[0] || '').slice(0, 15)
        }
      }
    }

    // Fallback: use keyword if paths are empty
    if (!path1 && keyword) {
      const kwParts = keyword.split(' ').filter(p => p.length > 2)
      path1 = (kwParts[0] || '').slice(0, 15)
      path2 = (kwParts[1] || '').slice(0, 15)
    }

    return { path1, path2 }
  } catch {
    // Fallback to keyword if URL parsing fails
    if (keyword) {
      const kwParts = keyword.split(' ').filter(p => p.length > 2)
      return {
        path1: (kwParts[0] || '').slice(0, 15),
        path2: (kwParts[1] || '').slice(0, 15),
      }
    }
    return { path1: '', path2: '' }
  }
}

export function GoogleAdsWizardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('id')
  const workspaceId = useWorkspaceId()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const {
    currentStep,
    templateName,
    setTemplateName,
    goToNextStep,
    goToPreviousStep,
    markStepCompleted,
    getStepOrder,
    completedSteps,
    reset,
    // Use arrays directly (legacy singular fields removed)
    accounts,
    sourceArticles,
    campaign,
    adGroups,
    extensions,
    // Publish mode state
    publishMode,
    autoPublish,
    setAutoPublishStep,
    setAutoPublishError,
    startAutoPublish,
    resetAutoPublish,
    setGeneratedFromArticle,
    setExtensionsData,
    addKeywordToAdGroup,
    updateAdGroup,
    showPublishModeModal,
    setShowPublishModeModal,
    setPublishMode,
    getTotalCampaignsCount,
  } = useGoogleAdsWizardStore()

  // Derive current article and account from arrays (first selected item)
  const sourceArticle = sourceArticles.length > 0 ? sourceArticles[0] : null
  const account = accounts.length > 0 ? accounts[0] : null

  // Validate campaign name - returns error message if invalid, null if valid
  const validateCampaignName = useCallback((name: string): string | null => {
    // List of invalid fallback values that indicate missing ARTICLE data
    // Note: |tnovo_ is OK (means template not saved yet)
    // Note: _wpNA_ might be OK if article doesn't have WordPress post ID
    const invalidPatterns = [
      'sem-artigo',     // No article selected
      '_projeto|',      // No project name (article not properly loaded)
      '{{',             // Unreplaced placeholders
      '}}',
    ]

    for (const pattern of invalidPatterns) {
      if (name.includes(pattern)) {
        return `Nome da campanha contém valor inválido: "${pattern}". Verifique se um artigo foi selecionado corretamente.`
      }
    }

    // Also validate minimum meaningful content
    if (name.length < 10) {
      return 'Nome da campanha muito curto. Selecione um artigo válido.'
    }

    return null
  }, [])

  // Process campaign and ad group names by replacing placeholders with actual values
  const processedCampaignData = useMemo(() => {
    // Extract article slug from URL or title
    const articleSlug = sourceArticle?.articleUrl
      ? extractSlugFromUrl(sourceArticle.articleUrl)
      : sourceArticle?.title
        ? slugify(sourceArticle.title, 25)
        : 'sem-artigo'

    // Process campaign name
    const processedCampaignName = replaceCampaignNamePlaceholders(campaign.name, {
      articleSlug,
      projectName: sourceArticle?.projectName,
      templateId: templateId || undefined,
      wpPostId: sourceArticle?.wpPostId,
    })

    // Process ad group names
    const processedAdGroups = adGroups.map((group, index) => {
      // If name contains placeholder pattern, replace it
      if (group.name.includes('|ag')) {
        // Extract the descriptive part (keyword/theme) if available
        const mainKeyword = group.keywords[0]?.text || sourceArticle?.keywordUsed || 'grupo-anuncios'
        const keywordSlug = slugify(mainKeyword, 30)
        const adsCount = group.ads.length
        return {
          ...group,
          name: `${keywordSlug}|ag${index + 1}_${adsCount}ads`,
        }
      }
      return group
    })

    return {
      campaign: {
        ...campaign,
        name: processedCampaignName,
      },
      adGroups: processedAdGroups,
    }
  }, [campaign, adGroups, sourceArticle, templateId])

  // API Mutations
  const saveTemplateMutation = useSaveGoogleTemplate()
  const publishCampaignMutation = usePublishGoogleCampaign()
  const mineKeywordsMutation = useMineKeywords()
  const generateFromArticleMutation = useGenerateFromArticle()
  const generateKeywordIdeasMutation = useGenerateKeywordIdeas()
  const expandKeywordMutation = useExpandKeyword()

  // Track if auto-publish has been triggered
  const autoPublishTriggered = useRef(false)

  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(templateId)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Bulk publish state
  const [bulkPublish, setBulkPublish] = useState<BulkPublishState>({
    isActive: false,
    total: 0,
    current: 0,
    results: [],
    currentCombination: null,
  })
  const bulkPublishCancelledRef = useRef(false)

  const stepOrder = getStepOrder()

  // Get multi-select data from store
  // accounts, sourceArticles, getTotalCampaignsCount already extracted from store above

  // Track unsaved changes
  useEffect(() => {
    if (completedSteps.size > 0 || templateName !== 'Template Google Ads') {
      setHasUnsavedChanges(true)
    }
  }, [completedSteps.size, templateName])

  // Handle browser back/refresh with beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleBack = useCallback(async () => {
    if (hasUnsavedChanges) {
      const confirmLeave = await confirm({
        title: 'Sair do assistente?',
        message: 'Você tem alterações não salvas. Deseja realmente sair?',
        confirmText: 'Sair',
        cancelText: 'Continuar editando',
        variant: 'danger',
      })
      if (!confirmLeave) return
      reset()
    }
    navigate('/alvoads-google')
  }, [confirm, hasUnsavedChanges, navigate, reset])

  const handleSaveTemplate = async () => {
    setSaveMessage(null)

    if (!account) {
      setSaveMessage({ type: 'error', text: 'Selecione uma conta Google Ads antes de salvar.' })
      return
    }

    try {
      const result = await saveTemplateMutation.mutateAsync({
        id: currentTemplateId || undefined,
        templateName,
        account,
        campaign: processedCampaignData.campaign,
        adGroups: processedCampaignData.adGroups,
        extensions,
        workspace_id: workspaceId || undefined,
        source_article_id: sourceArticle?.articleId,
      })

      if (result.success && result.template) {
        setCurrentTemplateId(result.template.id)
        setHasUnsavedChanges(false)
        setSaveMessage({ type: 'success', text: 'Template salvo com sucesso!' })

        // Limpar mensagem após 3 segundos
        setTimeout(() => setSaveMessage(null), 3000)
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      setSaveMessage({ type: 'error', text: 'Erro ao salvar template. Tente novamente.' })
    }
  }

  const handleNext = () => {
    markStepCompleted(currentStep)
    // If on campaign step with source article(s), show publish mode modal
    const hasArticles = sourceArticles.length > 0
    if (currentStep === 'campaign' && hasArticles) {
      setShowPublishModeModal(true)
    } else {
      goToNextStep()
    }
  }

  // Handler for publish mode selection (from header button)
  const handlePublishModeSelect = (mode: 'auto' | 'semi-auto') => {
    setPublishMode(mode)
    setShowPublishModeModal(false)
    goToNextStep()
  }

  const handlePrevious = () => {
    goToPreviousStep()
  }

  const handlePublish = async () => {
    setSaveMessage(null)

    if (!account || !account.customerId) {
      setSaveMessage({ type: 'error', text: 'Nenhuma conta Google Ads selecionada.' })
      return
    }

    // CRITICAL: Validate campaign name before publishing
    // This prevents publishing campaigns with invalid/fallback names
    const campaignNameError = validateCampaignName(processedCampaignData.campaign.name)
    if (campaignNameError) {
      setSaveMessage({ type: 'error', text: campaignNameError })
      return
    }

    // ALWAYS save the template before publishing to ensure processed names are used
    // This replaces placeholders with actual values
    let templateIdToPublish = currentTemplateId

    try {
      // Use processed campaign and ad group names
      const saveResult = await saveTemplateMutation.mutateAsync({
        id: currentTemplateId || undefined,
        templateName,
        account,
        campaign: processedCampaignData.campaign,
        adGroups: processedCampaignData.adGroups,
        extensions,
        workspace_id: workspaceId || undefined,
        source_article_id: sourceArticle?.articleId,
      })

      if (saveResult.success && saveResult.template) {
        templateIdToPublish = saveResult.template.id
        setCurrentTemplateId(templateIdToPublish)
      } else {
        setSaveMessage({ type: 'error', text: 'Erro ao salvar template antes de publicar.' })
        return
      }
    } catch (error) {
      console.error('Erro ao salvar template:', error)
      setSaveMessage({ type: 'error', text: 'Erro ao salvar template antes de publicar.' })
      return
    }

    // Agora publicar
    try {
      const result = await publishCampaignMutation.mutateAsync({
        id: templateIdToPublish,
        dryRun: false,
      })

      if (result.success) {
        setHasUnsavedChanges(false)
        reset()

        // Check for partial success (warnings)
        if (result.partialSuccess && result.warnings && result.warnings.length > 0) {
          navigate('/alvoads-google', {
            state: {
              message: 'Campanha publicada com avisos',
              warnings: result.warnings,
              type: 'warning'
            }
          })
        } else {
          navigate('/alvoads-google', {
            state: { message: 'Campanha publicada com sucesso!' }
          })
        }
      } else if (result.errors && result.errors.length > 0) {
        setSaveMessage({
          type: 'error',
          text: `Erro ao publicar: ${result.errors.join(', ')}`
        })
      }
    } catch (error) {
      console.error('Erro ao publicar campanha:', error)
      setSaveMessage({ type: 'error', text: 'Erro ao publicar campanha. Tente novamente.' })
    }
  }

  // Check if we should use bulk publish
  const shouldUseBulkPublish = useCallback(() => {
    return accounts.length > 1 || sourceArticles.length > 1
  }, [accounts.length, sourceArticles.length])

  // Bulk publish handler - creates campaigns for all account x article combinations
  const handleBulkPublish = useCallback(async () => {
    bulkPublishCancelledRef.current = false

    // Build combinations
    const combinations: Array<{ account: GoogleAccountData; article: SourceArticleData | null }> = []

    if (sourceArticles.length === 0) {
      // No articles selected - create one campaign per account
      for (const acc of accounts) {
        combinations.push({ account: acc, article: null })
      }
    } else {
      // Create combinations for accounts x articles
      for (const acc of accounts) {
        for (const art of sourceArticles) {
          combinations.push({ account: acc, article: art })
        }
      }
    }

    const total = combinations.length
    setBulkPublish({
      isActive: true,
      total,
      current: 0,
      results: [],
      currentCombination: null,
    })

    const results: BulkPublishResult[] = []

    for (let i = 0; i < combinations.length; i++) {
      // Check if cancelled
      if (bulkPublishCancelledRef.current) {
        break
      }

      const combo = combinations[i]
      setBulkPublish(prev => ({
        ...prev,
        current: i,
        currentCombination: combo,
      }))

      try {
        // Process article-specific data if article is selected
        const articleForCampaign = combo.article || sourceArticle

        // Build article slug for naming
        const articleSlug = articleForCampaign?.articleUrl
          ? extractSlugFromUrl(articleForCampaign.articleUrl)
          : articleForCampaign?.title
            ? slugify(articleForCampaign.title, 25)
            : 'sem-artigo'

        // Get fresh state from store
        const freshState = useGoogleAdsWizardStore.getState()

        // Process campaign name with this specific article
        const processedCampaignName = replaceCampaignNamePlaceholders(freshState.campaign.name, {
          articleSlug,
          projectName: articleForCampaign?.projectName,
          templateId: currentTemplateId || undefined,
          wpPostId: articleForCampaign?.wpPostId,
        })

        // Process ad group names
        const freshAdGroups = freshState.adGroups.map((group, index) => {
          if (group.name.includes('|ag')) {
            const mainKeyword = group.keywords[0]?.text || articleForCampaign?.keywordUsed || 'grupo-anuncios'
            const keywordSlug = slugify(mainKeyword, 30)
            const adsCount = group.ads.length
            return {
              ...group,
              name: `${keywordSlug}|ag${index + 1}_${adsCount}ads`,
            }
          }
          return group
        })

        // Add unique suffix to avoid duplicate campaign names
        const uniqueSuffix = `_${i + 1}of${total}`
        const uniqueCampaignName = processedCampaignName + uniqueSuffix

        // CRITICAL: Validate campaign name before publishing
        const campaignNameError = validateCampaignName(uniqueCampaignName)
        if (campaignNameError) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: campaignNameError,
          })
          continue
        }

        // Save template for this combination
        const saveResult = await saveTemplateMutation.mutateAsync({
          id: undefined, // Always create new template for bulk
          templateName: `${templateName} - ${combo.account.customerName || combo.account.customerId}${combo.article ? ` - ${combo.article.title.slice(0, 20)}` : ''}`,
          account: combo.account,
          campaign: {
            ...freshState.campaign,
            name: uniqueCampaignName,
          },
          adGroups: freshAdGroups,
          extensions: freshState.extensions,
          workspace_id: workspaceId || undefined,
          source_article_id: articleForCampaign?.articleId,
        })

        if (!saveResult.success || !saveResult.template) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: 'Erro ao salvar template',
          })
          continue
        }

        // Publish the campaign
        const publishResult = await publishCampaignMutation.mutateAsync({
          id: saveResult.template.id,
          dryRun: false,
        })

        if (publishResult.success) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: true,
            templateId: saveResult.template.id,
          })
        } else {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: publishResult.errors?.join(', ') || 'Erro ao publicar',
          })
        }
      } catch (error) {
        results.push({
          account: combo.account,
          article: combo.article,
          success: false,
          error: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }

      // Update results in state
      setBulkPublish(prev => ({
        ...prev,
        results: [...results],
      }))
    }

    // Mark as complete
    setBulkPublish(prev => ({
      ...prev,
      isActive: false,
      current: prev.total,
      currentCombination: null,
    }))
  }, [
    accounts,
    sourceArticles,
    sourceArticle,
    currentTemplateId,
    templateName,
    workspaceId,
    saveTemplateMutation,
    publishCampaignMutation,
    validateCampaignName,
  ])

  // Cancel bulk publish
  const handleBulkPublishCancel = useCallback(() => {
    bulkPublishCancelledRef.current = true
    setBulkPublish(prev => ({
      ...prev,
      isActive: false,
    }))
  }, [])

  // Finish bulk publish and navigate
  const handleBulkPublishFinish = useCallback(() => {
    const successCount = bulkPublish.results.filter(r => r.success).length
    const errorCount = bulkPublish.results.filter(r => !r.success).length

    setHasUnsavedChanges(false)
    reset()

    if (errorCount > 0) {
      navigate('/alvoads-google', {
        state: {
          message: `${successCount} campanhas publicadas com sucesso, ${errorCount} com erro(s)`,
          type: 'warning',
        }
      })
    } else {
      navigate('/alvoads-google', {
        state: { message: `${successCount} campanhas publicadas com sucesso!` }
      })
    }
  }, [bulkPublish.results, reset, navigate])

  // Bulk auto-publish: combines auto-publish (mine keywords, generate content) with bulk publish (multiple articles/accounts)
  const handleBulkAutoPublish = useCallback(async () => {
    bulkPublishCancelledRef.current = false

    // Build combinations of accounts × articles
    const combinations: Array<{ account: GoogleAccountData; article: SourceArticleData }> = []

    // Use the arrays directly (no legacy fallback needed)
    const accountsToUse = accounts
    const articlesToUse = sourceArticles

    // Start auto-publish FIRST so the progress modal appears and user can see errors
    startAutoPublish()

    if (accountsToUse.length === 0) {
      setAutoPublishError('Nenhuma conta Google Ads selecionada.')
      return
    }

    if (articlesToUse.length === 0) {
      setAutoPublishError('Nenhum artigo selecionado.')
      return
    }

    // Create all combinations
    for (const acc of accountsToUse) {
      for (const art of articlesToUse) {
        combinations.push({ account: acc, article: art })
      }
    }

    const total = combinations.length
    setBulkPublish({
      isActive: true,
      total,
      current: 0,
      results: [],
      currentCombination: null,
    })

    const results: BulkPublishResult[] = []

    for (let i = 0; i < combinations.length; i++) {
      // Check if cancelled
      if (bulkPublishCancelledRef.current) {
        break
      }

      const combo = combinations[i]
      setBulkPublish(prev => ({
        ...prev,
        current: i,
        currentCombination: combo,
        currentStep: 'mining_keywords',
      }))

      try {
        // Validate article has keyword
        if (!combo.article.keywordUsed) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: 'Artigo sem palavra-chave definida',
          })
          continue
        }

        // Validate keyword_snapshot has required language and country
        if (!combo.article.keywordSnapshot?.language || !combo.article.keywordSnapshot?.country) {
          console.error('[BulkPublish] Missing keyword_snapshot data:', {
            articleId: combo.article.articleId,
            keywordUsed: combo.article.keywordUsed,
            keywordSnapshot: combo.article.keywordSnapshot,
          })
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: 'Artigo sem dados de idioma/país na keyword_snapshot',
          })
          continue
        }

        // Step 1: Mine keywords for this article
        // Try Google Keyword Planner API first, fallback to RapidAPI
        setBulkPublish(prev => ({ ...prev, currentStep: 'mining_keywords' }))

        let keywordsToAdd: Array<{
          keyword: string
          search_volume: number
          cpc_min?: number
          cpc_max?: number
        }> = []

        // Check if we have a Google Ads connection for this account
        const hasGoogleConnection = combo.account.connectionId && combo.account.customerId
        const geoTargetId = getGeoTargetId(combo.article.keywordSnapshot.country)
        const languageId = getLanguageId(combo.article.keywordSnapshot.language)

        // Helper to fetch keywords from Google API
        const fetchGoogleKeywords = async (seedKeyword: string) => {
          if (!hasGoogleConnection || !geoTargetId || !languageId) return []
          try {
            const result = await generateKeywordIdeasMutation.mutateAsync({
              connectionId: combo.account.connectionId,
              seedKeywords: [seedKeyword],
              customerId: combo.account.customerId,
              loginCustomerId: combo.account.loginCustomerId,
              geoTargetConstants: [geoTargetId],
              languageId,
            })
            if (result.success && result.ideas) {
              return result.ideas.map(idea => ({
                keyword: idea.keyword,
                search_volume: idea.avgMonthlySearches || 0,
                cpc_min: idea.lowTopOfPageBidMicros ? idea.lowTopOfPageBidMicros / 1000000 : undefined,
                cpc_max: idea.highTopOfPageBidMicros ? idea.highTopOfPageBidMicros / 1000000 : undefined,
              }))
            }
          } catch (error) {
            console.warn(`[BulkPublish] Google API failed for "${seedKeyword}":`, error)
          }
          return []
        }

        // Helper to fetch keywords from RapidAPI
        const fetchRapidApiKeywords = async (seedKeyword: string) => {
          try {
            const result = await mineKeywordsMutation.mutateAsync({
              keyword: seedKeyword,
              country: combo.article.keywordSnapshot?.country || 'BR',
              language: combo.article.keywordSnapshot?.language || 'pt',
            })
            if (result.keywords) {
              return result.keywords.map(kw => ({
                keyword: kw.keyword,
                search_volume: kw.search_volume || 0,
                cpc_min: kw.cpc_min,
                cpc_max: kw.cpc_max,
              }))
            }
          } catch (error) {
            console.warn(`[BulkPublish] RapidAPI failed for "${seedKeyword}":`, error)
          }
          return []
        }

        // Step 1: Try Google Keyword Planner API first
        if (hasGoogleConnection && geoTargetId && languageId) {
          console.info(`[BulkPublish] Trying Google Keyword Planner API for ${combo.article.keywordUsed}...`)
          keywordsToAdd = await fetchGoogleKeywords(combo.article.keywordUsed)
          console.info(`[BulkPublish] Google API returned ${keywordsToAdd.length} keywords`)
        }

        // Step 2: Fallback to RapidAPI if not enough keywords
        if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
          console.info(`[BulkPublish] Only ${keywordsToAdd.length} keywords, trying RapidAPI...`)
          const rapidApiKeywords = await fetchRapidApiKeywords(combo.article.keywordUsed)
          const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
          for (const kw of rapidApiKeywords) {
            if (!existingKeywords.has(kw.keyword.toLowerCase())) {
              keywordsToAdd.push(kw)
              existingKeywords.add(kw.keyword.toLowerCase())
            }
          }
          console.info(`[BulkPublish] After RapidAPI: ${keywordsToAdd.length} keywords`)
        }

        // Step 3: If still not enough, use LLM to expand keyword
        if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
          console.info(`[BulkPublish] Only ${keywordsToAdd.length} keywords, expanding with LLM...`)
          const expansionResult = await expandKeywordMutation.mutateAsync({
            originalKeyword: combo.article.keywordUsed,
            currentCount: keywordsToAdd.length,
            articleTitle: combo.article.title,
            articleExcerpt: combo.article.excerpt,
            language: combo.article.keywordSnapshot.language,
          })

          if (expansionResult.success && expansionResult.alternativeKeywords.length > 0) {
            console.info(`[BulkPublish] LLM suggested: ${expansionResult.alternativeKeywords.join(', ')}`)
            for (const altKeyword of expansionResult.alternativeKeywords) {
              if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break
              const altKeywords = await fetchGoogleKeywords(altKeyword)
              const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
              for (const kw of altKeywords) {
                if (!existingKeywords.has(kw.keyword.toLowerCase())) {
                  keywordsToAdd.push(kw)
                  existingKeywords.add(kw.keyword.toLowerCase())
                }
              }
            }
            // Try RapidAPI for alternatives if still not enough
            if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
              for (const altKeyword of expansionResult.alternativeKeywords) {
                if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break
                const altKeywords = await fetchRapidApiKeywords(altKeyword)
                const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
                for (const kw of altKeywords) {
                  if (!existingKeywords.has(kw.keyword.toLowerCase())) {
                    keywordsToAdd.push(kw)
                    existingKeywords.add(kw.keyword.toLowerCase())
                  }
                }
              }
            }
          }
        }

        // Final check: must have at least MIN_KEYWORDS_REQUIRED keywords
        if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: `Apenas ${keywordsToAdd.length} keywords encontradas. Mínimo: ${MIN_KEYWORDS_REQUIRED}`,
          })
          continue
        }

        // Sort by search volume and take top 50
        const sortedByVolume = [...keywordsToAdd].sort(
          (a, b) => (b.search_volume || 0) - (a.search_volume || 0)
        )
        const finalKeywords = sortedByVolume.slice(0, MIN_KEYWORDS_REQUIRED)

        // Step 2: Generate content (headlines, descriptions, extensions)
        setBulkPublish(prev => ({ ...prev, currentStep: 'generating_content' }))
        const keywordTexts = finalKeywords.map(kw => kw.keyword)

        const contentResult = await generateFromArticleMutation.mutateAsync({
          articleId: combo.article.articleId,
          keywords: keywordTexts,
          headlineCount: 15,
          descriptionCount: 4,
          articleUrl: combo.article.articleUrl,
          language: combo.article.keywordSnapshot.language, // Required for AI generation
        })

        if (!contentResult.success) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: 'Erro ao gerar conteúdo',
          })
          continue
        }

        const headlines = contentResult.headlines.slice(0, 15)
        const descriptions = contentResult.descriptions.slice(0, 4)

        // Extract display paths from URL for the ad (apply pre-article URL if selected)
        const articleUrl = getArticleFinalUrl(combo.article.articleUrl, combo.article.usePreArticleUrl)
        const { path1, path2 } = extractDisplayPaths(articleUrl, combo.article.keywordUsed)

        // Build article slug for naming
        const articleSlug = combo.article.articleUrl
          ? extractSlugFromUrl(combo.article.articleUrl)
          : combo.article.title
            ? slugify(combo.article.title, 25)
            : 'sem-artigo'

        // Process campaign name for this specific article
        const freshState = useGoogleAdsWizardStore.getState()
        const processedCampaignName = replaceCampaignNamePlaceholders(freshState.campaign.name, {
          articleSlug,
          projectName: combo.article.projectName,
          templateId: undefined,
          wpPostId: combo.article.wpPostId,
        })

        // Add unique suffix to avoid duplicate names
        const uniqueSuffix = `_${i + 1}of${total}`
        const uniqueCampaignName = processedCampaignName + uniqueSuffix

        // CRITICAL: Validate campaign name before publishing
        const campaignNameError = validateCampaignName(uniqueCampaignName)
        if (campaignNameError) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: campaignNameError,
          })
          continue
        }

        // Build ad groups with keywords (all 3 match types: BROAD, EXACT, PHRASE)
        const allKeywords = (['BROAD', 'EXACT', 'PHRASE'] as const).flatMap((matchType) =>
          finalKeywords.map((kw) => ({
            id: `kw-bulk-${matchType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: kw.keyword,
            matchType,
            status: 'ENABLED' as const,
            avgMonthlySearches: kw.search_volume,
            lowTopOfPageBidMicros: kw.cpc_min ? Math.round(kw.cpc_min * 1000000) : null,
            highTopOfPageBidMicros: kw.cpc_max ? Math.round(kw.cpc_max * 1000000) : null,
          }))
        )

        const adGroup = {
          id: `ag-bulk-${Date.now()}-${i}`,
          name: `${slugify(combo.article.keywordUsed || 'grupo-anuncios', 30)}|ag1_1ads`,
          keywords: allKeywords,
          ads: [{
            id: `ad-bulk-${Date.now()}-${i}`,
            headlines,
            descriptions,
            finalUrl: articleUrl,
            path1,
            path2,
          }],
        }

        // Build extensions (part of content generation)
        setBulkPublish(prev => ({ ...prev, currentStep: 'generating_extensions' }))
        const extensionsData = contentResult.extensions ? {
          sitelinks: contentResult.extensions.sitelinks.map((s, idx) => ({
            id: `sitelink-bulk-${Date.now()}-${idx}`,
            text: s.text,
            description1: s.description1,
            description2: s.description2,
            finalUrl: s.finalUrl,
          })),
          callouts: contentResult.extensions.callouts.map((text, idx) => ({
            id: `callout-bulk-${Date.now()}-${idx}`,
            text,
          })),
          structuredSnippets: contentResult.extensions.structuredSnippets.map((s, idx) => ({
            id: `snippet-bulk-${Date.now()}-${idx}`,
            header: s.header,
            values: s.values,
          })),
        } : freshState.extensions

        // Step 3: Save template for this combination
        setBulkPublish(prev => ({ ...prev, currentStep: 'saving_template' }))
        const saveResult = await saveTemplateMutation.mutateAsync({
          id: undefined, // Always create new template for bulk
          templateName: `${templateName} - ${combo.account.customerName || combo.account.customerId} - ${combo.article.title.slice(0, 20)}`,
          account: combo.account,
          campaign: {
            ...freshState.campaign,
            name: uniqueCampaignName,
          },
          adGroups: [{
            ...adGroup,
            negativeKeywords: [],
          }],
          extensions: extensionsData,
          workspace_id: workspaceId || undefined,
          source_article_id: combo.article.articleId,
        })

        if (!saveResult.success || !saveResult.template) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: 'Erro ao salvar template',
          })
          continue
        }

        // Step 4: Publish the campaign
        setBulkPublish(prev => ({ ...prev, currentStep: 'publishing' }))
        const publishResult = await publishCampaignMutation.mutateAsync({
          id: saveResult.template.id,
          dryRun: false,
        })

        if (publishResult.success) {
          results.push({
            account: combo.account,
            article: combo.article,
            success: true,
            templateId: saveResult.template.id,
          })
        } else {
          results.push({
            account: combo.account,
            article: combo.article,
            success: false,
            error: publishResult.errors?.join(', ') || 'Erro ao publicar',
          })
        }
      } catch (error) {
        results.push({
          account: combo.account,
          article: combo.article,
          success: false,
          error: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }

      // Update results in state
      setBulkPublish(prev => ({
        ...prev,
        results: [...results],
      }))
    }

    // Mark as complete
    setBulkPublish(prev => ({
      ...prev,
      isActive: false,
      current: prev.total,
      currentCombination: null,
    }))
  }, [
    accounts,
    sourceArticles,
    templateName,
    workspaceId,
    mineKeywordsMutation,
    generateKeywordIdeasMutation,
    expandKeywordMutation,
    generateFromArticleMutation,
    saveTemplateMutation,
    publishCampaignMutation,
    setAutoPublishError,
    startAutoPublish,
    validateCampaignName,
  ])

  // Auto-publish flow: mine keywords, generate content, generate extensions, save, publish
  const handleAutoPublish = useCallback(async () => {
    // Get current article and account from arrays
    // These are derived at component level but we access them here via closure
    const articleToUse = sourceArticles.length > 0 ? sourceArticles[0] : null
    const accountToUse = accounts.length > 0 ? accounts[0] : null

    // Start auto-publish FIRST so the progress modal appears and user can see errors
    startAutoPublish()

    if (!articleToUse || !articleToUse.keywordUsed) {
      setAutoPublishError('Artigo sem palavra-chave definida.')
      return
    }

    // Validate keyword_snapshot has required language and country
    if (!articleToUse.keywordSnapshot?.language || !articleToUse.keywordSnapshot?.country) {
      console.error('[AutoPublish] Missing keyword_snapshot data:', {
        articleId: articleToUse.articleId,
        keywordUsed: articleToUse.keywordUsed,
        keywordSnapshot: articleToUse.keywordSnapshot,
      })
      setAutoPublishError('Artigo sem dados de idioma/país na keyword_snapshot.')
      return
    }

    if (!accountToUse || !accountToUse.customerId) {
      setAutoPublishError('Nenhuma conta Google Ads selecionada.')
      return
    }

    try {
      // Step 1: Mine keywords
      // Try Google Keyword Planner API first, fallback to RapidAPI
      setAutoPublishStep('mining_keywords')

      let keywordsToAdd: Array<{
        keyword: string
        search_volume: number
        cpc_min?: number
        cpc_max?: number
      }> = []

      // Check if we have a Google Ads connection
      const hasGoogleConnection = accountToUse.connectionId && accountToUse.customerId
      const geoTargetId = getGeoTargetId(articleToUse.keywordSnapshot.country)
      const languageId = getLanguageId(articleToUse.keywordSnapshot.language)

      // Helper to fetch keywords from Google API
      const fetchGoogleKeywords = async (seedKeyword: string) => {
        if (!hasGoogleConnection || !geoTargetId || !languageId) return []
        try {
          const result = await generateKeywordIdeasMutation.mutateAsync({
            connectionId: accountToUse.connectionId,
            seedKeywords: [seedKeyword],
            customerId: accountToUse.customerId,
            loginCustomerId: accountToUse.loginCustomerId,
            geoTargetConstants: [geoTargetId],
            languageId,
          })
          if (result.success && result.ideas) {
            return result.ideas.map(idea => ({
              keyword: idea.keyword,
              search_volume: idea.avgMonthlySearches || 0,
              cpc_min: idea.lowTopOfPageBidMicros ? idea.lowTopOfPageBidMicros / 1000000 : undefined,
              cpc_max: idea.highTopOfPageBidMicros ? idea.highTopOfPageBidMicros / 1000000 : undefined,
            }))
          }
        } catch (error) {
          console.warn(`[AutoPublish] Google API failed for "${seedKeyword}":`, error)
        }
        return []
      }

      // Helper to fetch keywords from RapidAPI
      const fetchRapidApiKeywords = async (seedKeyword: string) => {
        try {
          const result = await mineKeywordsMutation.mutateAsync({
            keyword: seedKeyword,
            country: articleToUse.keywordSnapshot?.country || 'BR',
            language: articleToUse.keywordSnapshot?.language || 'pt',
          })
          if (result.keywords) {
            return result.keywords.map(kw => ({
              keyword: kw.keyword,
              search_volume: kw.search_volume || 0,
              cpc_min: kw.cpc_min,
              cpc_max: kw.cpc_max,
            }))
          }
        } catch (error) {
          console.warn(`[AutoPublish] RapidAPI failed for "${seedKeyword}":`, error)
        }
        return []
      }

      // Step 1: Try Google Keyword Planner API first
      if (hasGoogleConnection && geoTargetId && languageId) {
        console.info(`[AutoPublish] Trying Google Keyword Planner API for ${articleToUse.keywordUsed}...`)
        keywordsToAdd = await fetchGoogleKeywords(articleToUse.keywordUsed)
        console.info(`[AutoPublish] Google API returned ${keywordsToAdd.length} keywords`)
      }

      // Step 2: Fallback to RapidAPI if not enough keywords
      if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
        console.info(`[AutoPublish] Only ${keywordsToAdd.length} keywords, trying RapidAPI...`)
        const rapidApiKeywords = await fetchRapidApiKeywords(articleToUse.keywordUsed)
        const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
        for (const kw of rapidApiKeywords) {
          if (!existingKeywords.has(kw.keyword.toLowerCase())) {
            keywordsToAdd.push(kw)
            existingKeywords.add(kw.keyword.toLowerCase())
          }
        }
        console.info(`[AutoPublish] After RapidAPI: ${keywordsToAdd.length} keywords`)
      }

      // Step 3: If still not enough, use LLM to expand keyword
      if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
        console.info(`[AutoPublish] Only ${keywordsToAdd.length} keywords, expanding with LLM...`)
        const expansionResult = await expandKeywordMutation.mutateAsync({
          originalKeyword: articleToUse.keywordUsed,
          currentCount: keywordsToAdd.length,
          articleTitle: articleToUse.title,
          articleExcerpt: articleToUse.excerpt,
          language: articleToUse.keywordSnapshot.language,
        })

        if (expansionResult.success && expansionResult.alternativeKeywords.length > 0) {
          console.info(`[AutoPublish] LLM suggested: ${expansionResult.alternativeKeywords.join(', ')}`)
          for (const altKeyword of expansionResult.alternativeKeywords) {
            if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break
            const altKeywords = await fetchGoogleKeywords(altKeyword)
            const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
            for (const kw of altKeywords) {
              if (!existingKeywords.has(kw.keyword.toLowerCase())) {
                keywordsToAdd.push(kw)
                existingKeywords.add(kw.keyword.toLowerCase())
              }
            }
          }
          // Try RapidAPI for alternatives if still not enough
          if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
            for (const altKeyword of expansionResult.alternativeKeywords) {
              if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break
              const altKeywords = await fetchRapidApiKeywords(altKeyword)
              const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
              for (const kw of altKeywords) {
                if (!existingKeywords.has(kw.keyword.toLowerCase())) {
                  keywordsToAdd.push(kw)
                  existingKeywords.add(kw.keyword.toLowerCase())
                }
              }
            }
          }
        }
      }

      // Final check: must have at least MIN_KEYWORDS_REQUIRED keywords
      if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
        setAutoPublishError(`Apenas ${keywordsToAdd.length} keywords encontradas. Mínimo necessário: ${MIN_KEYWORDS_REQUIRED}. Tente com uma palavra-chave menos específica.`)
        return
      }

      // Sort by search volume and take top 50
      const sortedByVolume = [...keywordsToAdd].sort(
        (a, b) => (b.search_volume || 0) - (a.search_volume || 0)
      )
      const finalKeywords = sortedByVolume.slice(0, MIN_KEYWORDS_REQUIRED)

      // Add keywords to ad group with all 3 match types (BROAD, EXACT, PHRASE)
      const matchTypes: Array<'BROAD' | 'EXACT' | 'PHRASE'> = ['BROAD', 'EXACT', 'PHRASE']

      matchTypes.forEach((matchType) => {
        finalKeywords.forEach((kw) => {
          const keyword: GoogleKeyword = {
            id: `kw-auto-${matchType.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: kw.keyword,
            matchType,
            status: 'ENABLED',
            avgMonthlySearches: kw.search_volume,
            lowTopOfPageBidMicros: kw.cpc_min ? Math.round(kw.cpc_min * 1000000) : null,
            highTopOfPageBidMicros: kw.cpc_max ? Math.round(kw.cpc_max * 1000000) : null,
          }
          addKeywordToAdGroup(0, keyword)
        })
      })
      markStepCompleted('keywords')

      // Step 2: Generate content (headlines, descriptions)
      setAutoPublishStep('generating_content')
      const keywordTexts = finalKeywords.map(kw => kw.keyword)

      const contentResult = await generateFromArticleMutation.mutateAsync({
        articleId: articleToUse.articleId,
        keywords: keywordTexts,
        headlineCount: 15,
        descriptionCount: 4,
        articleUrl: articleToUse.articleUrl,
        language: articleToUse.keywordSnapshot.language, // Required for AI generation
      })

      let headlines: string[] = []
      let descriptions: string[] = []
      let generatedExtensions = undefined

      if (contentResult.success) {
        headlines = contentResult.headlines.slice(0, 15)
        descriptions = contentResult.descriptions.slice(0, 4)

        // Extract display paths from URL for the ad (apply pre-article URL if selected)
        const articleUrl = getArticleFinalUrl(articleToUse.articleUrl, articleToUse.usePreArticleUrl)
        const { path1, path2 } = extractDisplayPaths(
          articleUrl,
          articleToUse.keywordUsed
        )

        // Create ResponsiveSearchAd and add to ad group
        const newAd = {
          id: `ad-auto-${Date.now()}`,
          headlines,
          descriptions,
          finalUrl: articleUrl,
          path1,
          path2,
        }
        updateAdGroup(0, {
          ads: [newAd],
        })
        markStepCompleted('search_ads')

        // Step 3: Generate extensions
        setAutoPublishStep('generating_extensions')
        if (contentResult.extensions) {
          generatedExtensions = contentResult.extensions
          setExtensionsData({
            sitelinks: generatedExtensions.sitelinks.map((s, i) => ({
              id: `sitelink-auto-${Date.now()}-${i}`,
              text: s.text,
              description1: s.description1,
              description2: s.description2,
              finalUrl: s.finalUrl,
            })),
            callouts: generatedExtensions.callouts.map((text, i) => ({
              id: `callout-auto-${Date.now()}-${i}`,
              text,
            })),
            structuredSnippets: generatedExtensions.structuredSnippets.map((s, i) => ({
              id: `snippet-auto-${Date.now()}-${i}`,
              header: s.header,
              values: s.values,
            })),
          })
        }
        markStepCompleted('extensions')
      }

      // Store generated content for reference
      setGeneratedFromArticle({
        keywords: keywordsToAdd.map(kw => ({
          text: kw.keyword,
          matchType: 'BROAD' as const,
          relevance: kw.search_volume,
        })),
        headlines,
        descriptions,
        suggestedCampaignName: contentResult.suggestedCampaignName || `${articleToUse.title} - ${articleToUse.keywordUsed}`,
        extensions: generatedExtensions,
      })

      // Step 4: Save template
      // IMPORTANT: Get fresh state from Zustand store since React hasn't re-rendered yet
      // The useMemo (processedCampaignData) still has stale data at this point
      setAutoPublishStep('saving_template')
      const freshState = useGoogleAdsWizardStore.getState()

      // Process ad group names with fresh data
      const articleSlug = articleToUse?.articleUrl
        ? extractSlugFromUrl(articleToUse.articleUrl)
        : articleToUse?.title
          ? slugify(articleToUse.title, 25)
          : 'sem-artigo'

      const processedCampaignName = replaceCampaignNamePlaceholders(freshState.campaign.name, {
        articleSlug,
        projectName: articleToUse?.projectName,
        templateId: currentTemplateId || undefined,
        wpPostId: articleToUse?.wpPostId,
      })

      // CRITICAL: Validate campaign name before publishing
      const campaignNameError = validateCampaignName(processedCampaignName)
      if (campaignNameError) {
        setAutoPublishError(campaignNameError)
        return
      }

      const freshAdGroups = freshState.adGroups.map((group, index) => {
        if (group.name.includes('|ag')) {
          const mainKeyword = group.keywords[0]?.text || articleToUse?.keywordUsed || 'grupo-anuncios'
          const keywordSlug = slugify(mainKeyword, 30)
          const adsCount = group.ads.length
          return {
            ...group,
            name: `${keywordSlug}|ag${index + 1}_${adsCount}ads`,
          }
        }
        return group
      })

      const saveResult = await saveTemplateMutation.mutateAsync({
        id: currentTemplateId || undefined,
        templateName,
        account: accountToUse,
        campaign: {
          ...freshState.campaign,
          name: processedCampaignName,
        },
        adGroups: freshAdGroups,
        extensions: freshState.extensions,
        workspace_id: workspaceId || undefined,
        source_article_id: articleToUse?.articleId,
      })

      if (!saveResult.success || !saveResult.template) {
        setAutoPublishError('Erro ao salvar template.')
        return
      }

      const templateIdToPublish = saveResult.template.id
      setCurrentTemplateId(templateIdToPublish)

      // Step 5: Publish campaign
      setAutoPublishStep('publishing')
      const publishResult = await publishCampaignMutation.mutateAsync({
        id: templateIdToPublish,
        dryRun: false,
      })

      if (publishResult.success) {
        setAutoPublishStep('done')
        setHasUnsavedChanges(false)

        // Wait a bit to show success, then navigate
        setTimeout(() => {
          reset()
          if (publishResult.partialSuccess && publishResult.warnings && publishResult.warnings.length > 0) {
            navigate('/alvoads-google', {
              state: {
                message: 'Campanha publicada automaticamente com avisos',
                warnings: publishResult.warnings,
                type: 'warning'
              }
            })
          } else {
            navigate('/alvoads-google', {
              state: { message: 'Campanha publicada automaticamente com sucesso!' }
            })
          }
        }, 2000)
      } else if (publishResult.errors && publishResult.errors.length > 0) {
        setAutoPublishError(`Erro ao publicar: ${publishResult.errors.join(', ')}`)
      }

    } catch (error) {
      console.error('Erro no auto-publish:', error)
      setAutoPublishError(error instanceof Error ? error.message : 'Erro inesperado. Tente novamente.')
    }
  }, [
    sourceArticles,
    accounts,
    startAutoPublish,
    setAutoPublishStep,
    setAutoPublishError,
    mineKeywordsMutation,
    generateKeywordIdeasMutation,
    expandKeywordMutation,
    addKeywordToAdGroup,
    updateAdGroup,
    markStepCompleted,
    generateFromArticleMutation,
    setExtensionsData,
    setGeneratedFromArticle,
    saveTemplateMutation,
    currentTemplateId,
    templateName,
    workspaceId,
    publishCampaignMutation,
    validateCampaignName,
    reset,
    navigate,
  ])

  // Trigger auto-publish when entering keywords step with auto mode
  // For multiple articles, use bulk publish instead of single auto-publish
  useEffect(() => {
    if (
      publishMode === 'auto' &&
      currentStep === 'keywords' &&
      !autoPublishTriggered.current &&
      !autoPublish.isActive &&
      !bulkPublish.isActive
    ) {
      autoPublishTriggered.current = true

      // Check if we need bulk publish (multiple articles or multiple accounts)
      const needsBulkPublish = sourceArticles.length > 1 || accounts.length > 1

      if (needsBulkPublish) {
        // Use bulk auto-publish for multiple articles/accounts
        handleBulkAutoPublish()
      } else {
        // Use single auto-publish for one article + one account
        handleAutoPublish()
      }
    }
  }, [publishMode, currentStep, autoPublish.isActive, bulkPublish.isActive, sourceArticles.length, accounts.length, handleAutoPublish, handleBulkAutoPublish])

  // Reset trigger when publish mode changes
  useEffect(() => {
    if (publishMode === null) {
      autoPublishTriggered.current = false
    }
  }, [publishMode])

  const handleAutoPublishRetry = () => {
    autoPublishTriggered.current = false
    resetAutoPublish()
    // Re-trigger
    setTimeout(() => {
      handleAutoPublish()
    }, 100)
  }

  const handleAutoPublishCancel = () => {
    resetAutoPublish()
    goToPreviousStep()
  }

  const renderStep = () => {
    switch (currentStep) {
      case 'account':
        return <StepAccount />
      case 'article_source':
        return <StepArticleSource />
      case 'campaign':
        return <StepCampaign />
      case 'keywords':
        return <StepKeywords />
      case 'search_ads':
        return <StepSearchAds />
      case 'extensions':
        return <StepExtensions />
      case 'review':
        return <StepReview />
      default:
        return <StepAccount />
    }
  }

  const isLastStep = currentStep === 'review'
  const isFirstStep = currentStep === stepOrder[0]
  const isSaving = saveTemplateMutation.isPending
  const isPublishing = publishCampaignMutation.isPending
  const isBulkMode = shouldUseBulkPublish()
  const totalCampaigns = getTotalCampaignsCount()

  // Handler for publish button - decides between single or bulk publish
  const handlePublishClick = () => {
    if (isBulkMode) {
      handleBulkPublish()
    } else {
      handlePublish()
    }
  }

  // Get publish button text
  const getPublishButtonText = () => {
    if (isPublishing || bulkPublish.isActive) {
      return 'Publicando...'
    }
    if (isBulkMode) {
      return `Publicar ${totalCampaigns} campanhas`
    }
    return 'Publicar campanha'
  }

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
            onChange={(e) => setTemplateName(e.target.value)}
            className={styles.templateName}
            placeholder="Nome do template"
          />
          {currentTemplateId && (
            <span className={styles.savedBadge}>
              <CheckCircle size={14} /> Salvo
            </span>
          )}
        </div>
        <div className={styles.headerRight}>
          <Button
            variant="outline"
            leftIcon={isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            onClick={handleSaveTemplate}
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
              onClick={handlePublishClick}
              disabled={isSaving || isPublishing || bulkPublish.isActive}
            >
              {getPublishButtonText()}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleNext} disabled={isSaving || isPublishing}>
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
        <WizardStepper />
      </div>

      {/* Content */}
      <main className={styles.content}>
        {bulkPublish.isActive || bulkPublish.results.length > 0 ? (
          <BulkPublishProgress
            state={bulkPublish}
            onCancel={handleBulkPublishCancel}
            onFinish={handleBulkPublishFinish}
          />
        ) : autoPublish.isActive || autoPublish.currentStep === 'done' ? (
          <AutoPublishProgress
            currentStep={autoPublish.currentStep}
            error={autoPublish.error}
            onRetry={handleAutoPublishRetry}
            onCancel={handleAutoPublishCancel}
          />
        ) : (
          renderStep()
        )}
      </main>

      {/* Footer Navigation (mobile) */}
      <footer className={styles.footer}>
        {!isFirstStep && (
          <Button variant="outline" onClick={handlePrevious} disabled={isSaving || isPublishing || bulkPublish.isActive}>
            Anterior
          </Button>
        )}
        <div className={styles.footerSpacer} />
        {isLastStep ? (
          <Button
            variant="primary"
            onClick={handlePublishClick}
            disabled={isSaving || isPublishing || bulkPublish.isActive}
          >
            {isBulkMode ? `Publicar ${totalCampaigns}` : (isPublishing ? 'Publicando...' : 'Publicar')}
          </Button>
        ) : (
          <Button variant="primary" onClick={handleNext} disabled={isSaving || isPublishing}>
            Proximo
          </Button>
        )}
      </footer>

      {/* Publish Mode Modal */}
      <PublishModeModal
        isOpen={showPublishModeModal}
        onClose={() => setShowPublishModeModal(false)}
        onSelect={handlePublishModeSelect}
        disableSemiAuto={sourceArticles.length > 1}
        semiAutoDisabledReason="Disponível apenas para 1 artigo. Para múltiplos artigos, use o modo automático."
      />
      <ConfirmDialog />
    </div>
  )
}
