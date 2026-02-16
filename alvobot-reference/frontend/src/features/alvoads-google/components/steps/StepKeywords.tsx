import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, X, Sparkles, Loader2, Info, FileText, BarChart2, TrendingUp, Search } from 'lucide-react'
import { useMineKeywords } from '@/features/keywords/api/mutations'
import { Input, Button, Select, Textarea, Alert } from '@/shared/components'
import {
  useGenerateKeywords,
  useGenerateFromArticle,
  useGetKeywordMetrics,
  useGenerateKeywordIdeas,
  useGenerateGoogleAdCopy,
  useExpandKeyword,
  formatSearchVolume,
  formatCpcFromMicros,
  getCompetitionColor,
  getCompetitionLabel,
  getGeoTargetId,
  getLanguageId,
  MIN_KEYWORDS_REQUIRED,
} from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'
import { KEYWORD_MATCH_TYPES, type KeywordMatchType, type GoogleKeyword } from '../../types/campaign'
import { getArticleFinalUrl } from '../../utils/utmBuilder'
import { SemiAutoProgress, type SemiAutoStep } from '../SemiAutoProgress'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'

export function StepKeywords() {
  const {
    adGroups,
    updateAdGroup,
    addAdGroup,
    removeAdGroup,
    addKeywordToAdGroup,
    removeKeywordFromAdGroup,
    markStepCompleted,
    sourceArticles,
    generatedFromArticle,
    setGeneratedFromArticle,
    setExtensionsData,
    hasGeneratedContent,
    accounts,
    publishMode,
    setPublishMode,
    goToNextStep,
  } = useGoogleAdsWizardStore()

  // Derive current article and account from arrays (first selected item)
  // No more legacy fields - arrays are the single source of truth
  const sourceArticle = sourceArticles.length > 0 ? sourceArticles[0] : null
  const account = accounts.length > 0 ? accounts[0] : null

  // Track if semi-auto generation has been triggered
  const semiAutoTriggered = useRef(false)

  const [activeAdGroup, setActiveAdGroup] = useState(0)
  const [keywordText, setKeywordText] = useState('')
  const [matchType, setMatchType] = useState<KeywordMatchType>('BROAD')
  const [negativeKeywordText, setNegativeKeywordText] = useState('')
  const [seedKeyword, setSeedKeyword] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [showMetrics, setShowMetrics] = useState(false)

  // Semi-auto progress state
  const [semiAutoStep, setSemiAutoStep] = useState<SemiAutoStep | null>(null)
  const [semiAutoError, setSemiAutoError] = useState<string | null>(null)
  // Track if content generation is in progress (separate from mutation states)
  const [isContentGenerating, setIsContentGenerating] = useState(false)

  const generateKeywordsMutation = useGenerateKeywords()
  const generateFromArticleMutation = useGenerateFromArticle()
  const getKeywordMetricsMutation = useGetKeywordMetrics()
  const generateKeywordIdeasMutation = useGenerateKeywordIdeas()
  const generateAdCopyMutation = useGenerateGoogleAdCopy()
  const mineKeywordsMutation = useMineKeywords()
  const expandKeywordMutation = useExpandKeyword()

  // Track overall loading state for the full generation process
  // Use our own state flag instead of relying on mutation states (they reset asynchronously)
  const isGenerating = isContentGenerating

  // Generate keywords from article using Google Keyword Planner API (primary)
  // Falls back to RapidAPI if Google API fails or user has no Google connection
  const handleGenerateFromArticle = useCallback(async () => {
    if (!sourceArticle) return
    if (!sourceArticle.keywordUsed) {
      setAiError('O artigo selecionado não possui uma palavra-chave definida.')
      return
    }

    // Validate keyword_snapshot has required language and country
    if (!sourceArticle.keywordSnapshot?.language || !sourceArticle.keywordSnapshot?.country) {
      setAiError('O artigo não possui dados de idioma/país na keyword. Selecione um artigo com keyword_snapshot válido.')
      console.error('[StepKeywords] Missing keyword_snapshot data:', {
        articleId: sourceArticle.articleId,
        keywordUsed: sourceArticle.keywordUsed,
        keywordSnapshot: sourceArticle.keywordSnapshot,
      })
      return
    }

    setAiError(null)
    setSemiAutoError(null)
    setIsContentGenerating(true)

    // Start semi-auto progress if in semi-auto mode
    if (publishMode === 'semi-auto') {
      setSemiAutoStep('mining_keywords')
    }

    // Keywords result - will be populated by Google API or RapidAPI
    let keywordsToAdd: Array<{
      keyword: string
      search_volume: number
      cpc_min?: number
      cpc_max?: number
    }> = []

    // Check if user has a Google Ads connection
    const hasGoogleConnection = account?.connectionId && account?.customerId

    try {
      const geoTargetId = getGeoTargetId(sourceArticle.keywordSnapshot.country)
      const languageId = getLanguageId(sourceArticle.keywordSnapshot.language)

      // Helper function to fetch keywords from Google API for a given seed keyword
      const fetchGoogleKeywords = async (seedKeyword: string): Promise<typeof keywordsToAdd> => {
        if (!hasGoogleConnection || !geoTargetId || !languageId || !account) return []

        try {
          const result = await generateKeywordIdeasMutation.mutateAsync({
            connectionId: account.connectionId!,
            seedKeywords: [seedKeyword],
            customerId: account.customerId!,
            loginCustomerId: account.loginCustomerId,
            geoTargetConstants: [geoTargetId],
            languageId,
          })

          if (result.success && result.ideas && result.ideas.length > 0) {
            return result.ideas.map(idea => ({
              keyword: idea.keyword,
              search_volume: idea.avgMonthlySearches || 0,
              cpc_min: idea.lowTopOfPageBidMicros ? idea.lowTopOfPageBidMicros / 1000000 : undefined,
              cpc_max: idea.highTopOfPageBidMicros ? idea.highTopOfPageBidMicros / 1000000 : undefined,
            }))
          }
        } catch (error) {
          console.warn(`[StepKeywords] Google API failed for "${seedKeyword}":`, error)
        }
        return []
      }

      // Helper function to fetch keywords from RapidAPI for a given seed keyword
      const fetchRapidApiKeywords = async (seedKeyword: string): Promise<typeof keywordsToAdd> => {
        try {
          const result = await mineKeywordsMutation.mutateAsync({
            keyword: seedKeyword,
            country: sourceArticle.keywordSnapshot?.country || 'BR',
            language: sourceArticle.keywordSnapshot?.language || 'pt',
          })

          if (result.keywords && result.keywords.length > 0) {
            return result.keywords.map(kw => ({
              keyword: kw.keyword,
              search_volume: kw.search_volume || 0,
              cpc_min: kw.cpc_min,
              cpc_max: kw.cpc_max,
            }))
          }
        } catch (error) {
          console.warn(`[StepKeywords] RapidAPI failed for "${seedKeyword}":`, error)
        }
        return []
      }

      // Step 1: Try Google Keyword Planner API first (uses user's token, free)
      if (hasGoogleConnection && geoTargetId && languageId && account) {
        console.info(`[Keywords] 🔍 Usando Google Keyword Planner (connectionId: ${account.connectionId}, customerId: ${account.customerId})`)
        keywordsToAdd = await fetchGoogleKeywords(sourceArticle.keywordUsed)
        console.info(`[Keywords] Google API retornou ${keywordsToAdd.length} keywords`)
      } else {
        console.info(`[Keywords] ⏭️ Pulando Google API - conexão inválida (connectionId: ${account?.connectionId || 'vazio'}, customerId: ${account?.customerId || 'vazio'}, geoTargetId: ${geoTargetId || 'null'}, languageId: ${languageId || 'null'})`)
      }

      // Step 2: If Google API didn't return enough, use RapidAPI as fallback
      if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
        console.info(`[Keywords] 📡 Usando RapidAPI (Google retornou apenas ${keywordsToAdd.length} keywords, mínimo: ${MIN_KEYWORDS_REQUIRED})`)
        const rapidApiKeywords = await fetchRapidApiKeywords(sourceArticle.keywordUsed)
        console.info(`[Keywords] RapidAPI retornou ${rapidApiKeywords.length} keywords`)

        // Merge and deduplicate
        const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
        for (const kw of rapidApiKeywords) {
          if (!existingKeywords.has(kw.keyword.toLowerCase())) {
            keywordsToAdd.push(kw)
            existingKeywords.add(kw.keyword.toLowerCase())
          }
        }
      }

      // Step 3: If still not enough keywords, use LLM to expand the keyword into alternatives
      if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
        const expansionResult = await expandKeywordMutation.mutateAsync({
          originalKeyword: sourceArticle.keywordUsed,
          currentCount: keywordsToAdd.length,
          articleTitle: sourceArticle.title,
          articleExcerpt: sourceArticle.excerpt,
          language: sourceArticle.keywordSnapshot.language,
        })

        if (expansionResult.success && expansionResult.alternativeKeywords.length > 0) {
          // Fetch keywords for each alternative from Google API
          for (const altKeyword of expansionResult.alternativeKeywords) {
            if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break

            const altKeywords = await fetchGoogleKeywords(altKeyword)

            // Merge and deduplicate
            const existingKeywords = new Set(keywordsToAdd.map(k => k.keyword.toLowerCase()))
            for (const kw of altKeywords) {
              if (!existingKeywords.has(kw.keyword.toLowerCase())) {
                keywordsToAdd.push(kw)
                existingKeywords.add(kw.keyword.toLowerCase())
              }
            }
          }

          // If still not enough, try RapidAPI with alternatives
          if (keywordsToAdd.length < MIN_KEYWORDS_REQUIRED) {
            for (const altKeyword of expansionResult.alternativeKeywords) {
              if (keywordsToAdd.length >= MIN_KEYWORDS_REQUIRED) break

              const altKeywords = await fetchRapidApiKeywords(altKeyword)

              // Merge and deduplicate
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
        setAiError(`Não foi possível gerar o mínimo de ${MIN_KEYWORDS_REQUIRED} palavras-chave. Foram encontradas apenas ${keywordsToAdd.length}. Tente com uma palavra-chave menos específica.`)
        setIsContentGenerating(false)
        if (publishMode === 'semi-auto') {
          setSemiAutoError(`Apenas ${keywordsToAdd.length} keywords encontradas. Mínimo: ${MIN_KEYWORDS_REQUIRED}`)
        }
        return
      }

      // Sort by search volume (descending) and take top 50
      const sortedByVolume = [...keywordsToAdd].sort(
        (a, b) => (b.search_volume || 0) - (a.search_volume || 0)
      )
      const finalKeywords = sortedByVolume.slice(0, MIN_KEYWORDS_REQUIRED)

      // Add keywords to ad group
      finalKeywords.forEach((kw) => {
        const keyword: GoogleKeyword = {
          id: `kw-mined-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: kw.keyword,
          matchType: 'BROAD', // Correspondência ampla
          status: 'ENABLED',
          avgMonthlySearches: kw.search_volume,
          lowTopOfPageBidMicros: kw.cpc_min ? Math.round(kw.cpc_min * 1000000) : null,
          highTopOfPageBidMicros: kw.cpc_max ? Math.round(kw.cpc_max * 1000000) : null,
        }
        addKeywordToAdGroup(activeAdGroup, keyword)
      })

      // Step 3: Generate headlines, descriptions and extensions using the mined keywords
      // The API now uses these keywords to create coherent content
      const keywordTexts = finalKeywords.map(kw => kw.keyword)

      // Update progress to content generation
      if (publishMode === 'semi-auto') {
        setSemiAutoStep('generating_content')
      }

      // Get the final URL considering pre-article setting
      const articleFinalUrl = getArticleFinalUrl(sourceArticle.articleUrl, sourceArticle.usePreArticleUrl)

      const contentResult = await generateFromArticleMutation.mutateAsync({
        articleId: sourceArticle.articleId,
        keywords: keywordTexts, // Pass mined keywords for coherent content generation
        headlineCount: 15, // Max allowed by Google
        descriptionCount: 4, // Max allowed by Google
        articleUrl: articleFinalUrl,
        language: sourceArticle.keywordSnapshot.language, // Required for AI generation
      })

      let headlines: string[] = []
      let descriptions: string[] = []
      let extensions = undefined

      if (contentResult.success) {
        headlines = contentResult.headlines.slice(0, 15)
        descriptions = contentResult.descriptions.slice(0, 4)

        if (contentResult.extensions) {
          extensions = contentResult.extensions

          // Update progress to extensions
          if (publishMode === 'semi-auto') {
            setSemiAutoStep('generating_extensions')
          }

          // Auto-populate extensions in the store
          // NOTE: We store base URLs without UTMs. UTMs will be added at publish time.
          setExtensionsData({
            sitelinks: extensions.sitelinks.map((s, i) => ({
              id: `sitelink-${Date.now()}-${i}`,
              text: s.text,
              description1: s.description1,
              description2: s.description2,
              finalUrl: s.finalUrl, // Store base URL, UTMs added at publish time
            })),
            callouts: extensions.callouts.map((text, i) => ({
              id: `callout-${Date.now()}-${i}`,
              text,
            })),
            structuredSnippets: extensions.structuredSnippets.map((s, i) => ({
              id: `snippet-${Date.now()}-${i}`,
              header: s.header,
              values: s.values,
            })),
          })
        }
      }

      // Store all generated content for use in ads step
      setGeneratedFromArticle({
        keywords: keywordsToAdd.map(kw => ({
          text: kw.keyword,
          matchType: 'BROAD' as const,
          relevance: kw.search_volume,
        })),
        headlines,
        descriptions,
        suggestedCampaignName: contentResult.suggestedCampaignName || `${sourceArticle.title} - ${sourceArticle.keywordUsed}`,
        extensions,
      })

      markStepCompleted('keywords')

      // Semi-auto mode: also populate the ads in the adGroup so the next steps are pre-filled
      if (publishMode === 'semi-auto' && headlines.length > 0 && descriptions.length > 0) {
        // Extract path from article URL (using final URL which may be pre-article)
        let path1 = ''
        let path2 = ''
        if (articleFinalUrl) {
          try {
            const url = new URL(articleFinalUrl)
            const pathParts = url.pathname.split('/').filter(p => p && p !== 'pre') // Exclude 'pre' from path
            if (pathParts.length > 0) {
              path1 = pathParts[0].slice(0, 15) // Max 15 chars
            }
            if (pathParts.length > 1) {
              path2 = pathParts[1].slice(0, 15) // Max 15 chars
            }
          } catch {
            // Invalid URL, use empty paths
          }
        }

        // Create the ad with generated content
        const newAd = {
          id: `ad-semi-${Date.now()}`,
          headlines,
          descriptions,
          finalUrl: articleFinalUrl,
          path1,
          path2,
        }

        // Update the ad group with the new ad
        updateAdGroup(activeAdGroup, { ads: [newAd] })
        markStepCompleted('search_ads')

        // Extensions are already populated via setExtensionsData above
        if (extensions) {
          markStepCompleted('extensions')
        }

        // Mark semi-auto as done and auto-advance after a short delay
        setSemiAutoStep('done')
        setIsContentGenerating(false)
        setTimeout(() => {
          setSemiAutoStep(null)
          // Auto-advance to review step in semi-auto mode
          goToNextStep() // Goes to search_ads
          goToNextStep() // Goes to extensions
          goToNextStep() // Goes to review
        }, 1500) // Show "done" for 1.5 seconds before advancing
      } else {
        // Not in semi-auto mode, just clear loading state
        setIsContentGenerating(false)
      }

    } catch (error) {
      console.error('Erro ao gerar conteúdo do artigo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar conteúdo. Tente novamente.'
      setAiError(errorMessage)
      setIsContentGenerating(false)
      if (publishMode === 'semi-auto') {
        setSemiAutoError(errorMessage)
      }
    }
  }, [
    sourceArticle,
    publishMode,
    account,
    generateKeywordIdeasMutation,
    mineKeywordsMutation,
    expandKeywordMutation,
    generateFromArticleMutation,
    addKeywordToAdGroup,
    activeAdGroup,
    setExtensionsData,
    setGeneratedFromArticle,
    markStepCompleted,
    updateAdGroup,
    goToNextStep,
    setAiError,
    setSemiAutoError,
    setIsContentGenerating,
    setSemiAutoStep,
  ])

  // Handler for retry in semi-auto mode
  const handleSemiAutoRetry = () => {
    setSemiAutoStep(null)
    setSemiAutoError(null)
    setIsContentGenerating(false)
    semiAutoTriggered.current = false
    handleGenerateFromArticle()
  }

  // Handler for cancel in semi-auto mode
  const handleSemiAutoCancel = () => {
    setSemiAutoStep(null)
    setSemiAutoError(null)
    setIsContentGenerating(false)
    setPublishMode(null)
  }

  // Auto-trigger generation in semi-auto mode when entering this step
  useEffect(() => {
    if (
      publishMode === 'semi-auto' &&
      sourceArticle &&
      sourceArticle.keywordUsed &&
      !semiAutoTriggered.current &&
      !hasGeneratedContent() &&
      !isGenerating
    ) {
      semiAutoTriggered.current = true
      handleGenerateFromArticle()
    }
  }, [publishMode, sourceArticle, hasGeneratedContent, isGenerating, handleGenerateFromArticle])

  // Reset trigger when publish mode changes
  useEffect(() => {
    if (publishMode === null) {
      semiAutoTriggered.current = false
    }
  }, [publishMode])

  const handleAddKeywords = () => {
    if (!keywordText.trim()) return

    // Parse multiple keywords (one per line or comma separated)
    const keywords = keywordText
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0)

    keywords.forEach((text) => {
      const keyword: GoogleKeyword = {
        id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        matchType,
        status: 'ENABLED',
      }
      addKeywordToAdGroup(activeAdGroup, keyword)
    })

    setKeywordText('')
    markStepCompleted('keywords')
  }

  const handleAddNegativeKeywords = () => {
    if (!negativeKeywordText.trim()) return

    const keywords = negativeKeywordText
      .split(/[\n,]/)
      .map(k => k.trim())
      .filter(k => k.length > 0)

    const currentAdGroup = adGroups[activeAdGroup]
    const newNegatives = keywords.map((text) => ({
      id: `neg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      matchType: 'BROAD' as const,
      level: 'ad_group' as const,
    }))

    updateAdGroup(activeAdGroup, {
      negativeKeywords: [...currentAdGroup.negativeKeywords, ...newNegatives],
    })

    setNegativeKeywordText('')
  }

  const handleGenerateKeywords = async () => {
    if (!seedKeyword.trim()) {
      setAiError('Digite uma palavra-chave semente para gerar sugestoes')
      return
    }

    // Language is required - must come from article's keyword snapshot
    const language = sourceArticle?.keywordSnapshot?.language
    if (!language) {
      setAiError('Selecione um artigo com idioma definido na keyword para gerar keywords com IA')
      return
    }

    setAiError(null)

    try {
      const result = await generateKeywordsMutation.mutateAsync({
        seedKeywords: [seedKeyword.trim()],
        productName: seedKeyword.trim(),
        count: 10,
        language, // Required for AI generation
      })

      if (result.success && result.keywords.length > 0) {
        result.keywords.forEach((kw) => {
          const keyword: GoogleKeyword = {
            id: `kw-ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: kw.text,
            matchType: kw.matchType as KeywordMatchType || 'BROAD',
            status: 'ENABLED',
          }
          addKeywordToAdGroup(activeAdGroup, keyword)
        })
        markStepCompleted('keywords')
        setSeedKeyword('')
      } else {
        setAiError('Nao foi possivel gerar keywords. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao gerar keywords:', error)
      setAiError('Erro ao gerar keywords. Verifique seus creditos.')
    }
  }

  // Fetch keyword metrics from Google Ads Keyword Planner
  const handleFetchMetrics = async () => {
    if (!account?.connectionId || !account?.customerId) {
      setAiError('Selecione uma conta Google Ads primeiro.')
      return
    }

    const keywords = currentAdGroup.keywords.map(kw => kw.text)
    if (keywords.length === 0) {
      setAiError('Adicione palavras-chave primeiro para buscar metricas.')
      return
    }

    setAiError(null)

    try {
      const result = await getKeywordMetricsMutation.mutateAsync({
        connectionId: account.connectionId,
        keywords,
        customerId: account.customerId,
        loginCustomerId: account.loginCustomerId,
      })

      if (result.success && result.keywords) {
        // Update keywords with metrics
        const updatedKeywords = currentAdGroup.keywords.map(kw => {
          const metrics = result.keywords?.find(m => m.keyword === kw.text)
          if (metrics) {
            return {
              ...kw,
              avgMonthlySearches: metrics.avgMonthlySearches,
              competition: metrics.competition,
              competitionIndex: metrics.competitionIndex,
              lowTopOfPageBidMicros: metrics.lowTopOfPageBidMicros,
              highTopOfPageBidMicros: metrics.highTopOfPageBidMicros,
            }
          }
          return kw
        })

        updateAdGroup(activeAdGroup, { keywords: updatedKeywords })
        setShowMetrics(true)
      } else {
        setAiError(result.error || 'Nao foi possivel buscar metricas.')
      }
    } catch (error) {
      console.error('Erro ao buscar metricas:', error)
      setAiError('Erro ao buscar metricas. O Developer Token pode nao ter acesso ao Keyword Planner.')
    }
  }

  // Generate keyword ideas using Google Ads Keyword Planner
  const handleGenerateKeywordIdeas = async () => {
    if (!account?.connectionId || !account?.customerId) {
      setAiError('Selecione uma conta Google Ads primeiro.')
      return
    }

    if (!seedKeyword.trim() && !sourceArticle?.articleUrl) {
      setAiError('Digite uma palavra-chave semente ou selecione um artigo.')
      return
    }

    setAiError(null)

    try {
      const result = await generateKeywordIdeasMutation.mutateAsync({
        connectionId: account.connectionId,
        seedKeywords: seedKeyword.trim() ? [seedKeyword.trim()] : undefined,
        url: sourceArticle?.articleUrl,
        customerId: account.customerId,
        loginCustomerId: account.loginCustomerId,
      })

      if (result.success && result.ideas && result.ideas.length > 0) {
        result.ideas.slice(0, 20).forEach((idea) => {
          const keyword: GoogleKeyword = {
            id: `kw-gads-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: idea.keyword,
            matchType: 'BROAD',
            status: 'ENABLED',
            avgMonthlySearches: idea.avgMonthlySearches,
            competition: idea.competition,
            competitionIndex: idea.competitionIndex,
            lowTopOfPageBidMicros: idea.lowTopOfPageBidMicros,
            highTopOfPageBidMicros: idea.highTopOfPageBidMicros,
          }
          addKeywordToAdGroup(activeAdGroup, keyword)
        })
        markStepCompleted('keywords')
        setSeedKeyword('')
        setShowMetrics(true)
      } else {
        setAiError(result.error || 'Nao foi possivel gerar ideias de keywords.')
      }
    } catch (error) {
      console.error('Erro ao gerar ideias:', error)
      setAiError('Erro ao gerar ideias. O Developer Token pode nao ter acesso ao Keyword Planner.')
    }
  }

  const currentAdGroup = adGroups[activeAdGroup]

  // Check if any keyword has metrics
  const hasMetrics = currentAdGroup.keywords.some(kw => kw.avgMonthlySearches !== undefined)

  const formatKeywordDisplay = useCallback((keyword: GoogleKeyword) => {
    switch (keyword.matchType) {
      case 'PHRASE':
        return `"${keyword.text}"`
      case 'EXACT':
        return `[${keyword.text}]`
      default:
        return keyword.text
    }
  }, [])

  // Show semi-auto progress modal when in semi-auto mode and generating
  if (semiAutoStep !== null) {
    return (
      <div className={styles.stepContent}>
        <SemiAutoProgress
          currentStep={semiAutoStep}
          error={semiAutoError}
          onRetry={handleSemiAutoRetry}
          onCancel={handleSemiAutoCancel}
        />
      </div>
    )
  }

  return (
    <div className={styles.stepContent}>
      {/* Article Source Banner */}
      {sourceArticle && (
        <div className={styles.articleSourceBanner}>
          <FileText size={20} className={styles.articleSourceBannerIcon} />
          <div className={styles.articleSourceBannerContent}>
            <span className={styles.articleSourceBannerTitle}>
              Artigo selecionado: {sourceArticle.title}
            </span>
            <span className={styles.articleSourceBannerMeta}>
              {sourceArticle.keywordUsed && `Palavra-chave: ${sourceArticle.keywordUsed}`}
              {sourceArticle.keywordUsed && sourceArticle.words && ' | '}
              {sourceArticle.words && `${sourceArticle.words.toLocaleString()} palavras`}
            </span>
          </div>
          <div className={styles.articleSourceBannerActions}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              onClick={handleGenerateFromArticle}
              disabled={isGenerating || !sourceArticle.keywordUsed}
            >
              {mineKeywordsMutation.isPending
                ? 'Minerando keywords...'
                : generateAdCopyMutation.isPending
                  ? 'Gerando títulos...'
                  : generateFromArticleMutation.isPending
                    ? 'Gerando extensões...'
                    : hasGeneratedContent()
                      ? 'Regenerar Conteúdo'
                      : 'Gerar Conteúdo do Artigo'}
            </Button>
          </div>
        </div>
      )}

      {/* Generated content info */}
      {generatedFromArticle && generatedFromArticle.keywords.length > 0 && (
        <Alert variant="success">
          <strong>Conteúdo gerado com sucesso!</strong>
          <br />
          ✓ {generatedFromArticle.keywords.length} keywords (ordenadas por volume)
          {generatedFromArticle.headlines && generatedFromArticle.headlines.length > 0 && (
            <><br />✓ {generatedFromArticle.headlines.length} títulos para anúncios</>
          )}
          {generatedFromArticle.descriptions && generatedFromArticle.descriptions.length > 0 && (
            <><br />✓ {generatedFromArticle.descriptions.length} descrições para anúncios</>
          )}
          {generatedFromArticle.extensions && (
            <><br />✓ Extensões (sitelinks, callouts, snippets)</>
          )}
        </Alert>
      )}

      {/* Ad Groups Tabs */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Grupos de Anuncios</h3>
        <p className={styles.sectionDescription}>
          Organize suas palavras-chave em grupos tematicos para melhor relevancia
        </p>

        <div className={styles.tabsContainer}>
          {adGroups.map((group, index) => (
            <button
              key={index}
              type="button"
              className={`${styles.tab} ${activeAdGroup === index ? styles.active : ''}`}
              onClick={() => setActiveAdGroup(index)}
            >
              {group.name}
              {adGroups.length > 1 && (
                <X
                  size={14}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeAdGroup(index)
                    if (activeAdGroup >= index && activeAdGroup > 0) {
                      setActiveAdGroup(activeAdGroup - 1)
                    }
                  }}
                />
              )}
            </button>
          ))}
          <button
            type="button"
            className={styles.tab}
            onClick={addAdGroup}
          >
            <Plus size={14} /> Novo grupo
          </button>
        </div>
      </section>

      {/* Ad Group Name */}
      <section className={styles.section}>
        <div className={styles.formGroup}>
          <Input
            label="Nome do Grupo de Anuncios"
            value={currentAdGroup.name}
            onChange={(e) => updateAdGroup(activeAdGroup, { name: e.target.value })}
            placeholder="Ex: Servicos de Marketing"
          />
        </div>
      </section>

      {/* Keywords Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Palavras-chave</h3>
        <p className={styles.sectionDescription}>
          Adicione as palavras-chave que acionarao seus anuncios. Use correspondencia ampla para maior alcance ou exata para maior precisao.
        </p>

        <div className={styles.keywordsContainer}>
          <div className={styles.keywordInput}>
            <Textarea
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              placeholder="Digite palavras-chave (uma por linha ou separadas por virgula)&#10;Ex:&#10;marketing digital&#10;agencia de publicidade&#10;gestao de redes sociais"
              rows={5}
            />
            <div>
              <Select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as KeywordMatchType)}
                options={KEYWORD_MATCH_TYPES.map(m => ({
                  value: m.value,
                  label: `${m.label} ${m.symbol ? `(${m.symbol})` : ''}`,
                }))}
                className={styles.matchTypeSelect}
              />
              <Button
                variant="primary"
                onClick={handleAddKeywords}
                disabled={!keywordText.trim()}
                style={{ marginTop: '8px', width: '100%' }}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {/* AI Generation */}
          <div className={styles.aiSection}>
            <span className={styles.aiSectionTitle}>
              <Sparkles size={16} />
              Sugestao com IA
            </span>
            <p className={styles.sectionDescription}>
              Gere sugestoes de palavras-chave baseadas no seu negocio
            </p>
            {aiError && (
              <Alert variant="error" onClose={() => setAiError(null)}>{aiError}</Alert>
            )}
            <div className={styles.aiInputRow}>
              <Input
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Digite o tema ou produto (ex: marketing digital)"
                fullWidth
              />
              <Button
                variant="outline"
                leftIcon={generateKeywordsMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                onClick={handleGenerateKeywords}
                disabled={generateKeywordsMutation.isPending || !seedKeyword.trim()}
              >
                {generateKeywordsMutation.isPending ? 'Gerando...' : 'Gerar (2 creditos)'}
              </Button>
            </div>
            {/* Google Ads Keyword Planner */}
            {account?.connectionId && account?.customerId && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={generateKeywordIdeasMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    onClick={handleGenerateKeywordIdeas}
                    disabled={generateKeywordIdeasMutation.isPending || (!seedKeyword.trim() && !sourceArticle?.articleUrl)}
                  >
                    {generateKeywordIdeasMutation.isPending ? 'Buscando...' : 'Ideias Google Ads'}
                  </Button>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>
                    Gerar ideias do Keyword Planner (inclui volume e CPC)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Keywords List */}
          {currentAdGroup.keywords.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h4 className={styles.sectionSubtitle} style={{ margin: 0 }}>
                  {currentAdGroup.keywords.length} palavra(s)-chave adicionada(s)
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {account?.connectionId && account?.customerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={getKeywordMetricsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                      onClick={handleFetchMetrics}
                      disabled={getKeywordMetricsMutation.isPending}
                    >
                      {getKeywordMetricsMutation.isPending ? 'Buscando...' : 'Buscar Metricas'}
                    </Button>
                  )}
                  {hasMetrics && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<TrendingUp size={14} />}
                      onClick={() => setShowMetrics(!showMetrics)}
                    >
                      {showMetrics ? 'Ocultar Metricas' : 'Mostrar Metricas'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Keywords with metrics table */}
              {showMetrics && hasMetrics ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                  }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontWeight: 500 }}>Palavra-chave</th>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 500 }}>Volume</th>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'center', fontWeight: 500 }}>Competicao</th>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 500 }}>CPC Min</th>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 500 }}>CPC Max</th>
                        <th style={{ padding: 'var(--space-2) var(--space-3)', width: '40px' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {currentAdGroup.keywords.map((keyword) => (
                        <tr key={keyword.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                            <span className={`${styles.keywordTag} ${styles[keyword.matchType.toLowerCase()]}`} style={{ margin: 0 }}>
                              {formatKeywordDisplay(keyword)}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontFamily: 'monospace' }}>
                            {formatSearchVolume(keyword.avgMonthlySearches ?? null)}
                          </td>
                          <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              fontWeight: 500,
                              color: getCompetitionColor(keyword.competition ?? null),
                              background: `${getCompetitionColor(keyword.competition ?? null)}15`,
                            }}>
                              {getCompetitionLabel(keyword.competition ?? null)}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                            {formatCpcFromMicros(keyword.lowTopOfPageBidMicros ?? null, account?.currency || 'BRL')}
                          </td>
                          <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                            {formatCpcFromMicros(keyword.highTopOfPageBidMicros ?? null, account?.currency || 'BRL')}
                          </td>
                          <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.keywordRemove}
                              onClick={() => removeKeywordFromAdGroup(activeAdGroup, keyword.id)}
                              style={{ position: 'static', padding: '4px' }}
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.keywordsList}>
                  {currentAdGroup.keywords.map((keyword) => (
                    <span
                      key={keyword.id}
                      className={`${styles.keywordTag} ${styles[keyword.matchType.toLowerCase()]}`}
                    >
                      {formatKeywordDisplay(keyword)}
                      {keyword.avgMonthlySearches !== undefined && keyword.avgMonthlySearches !== null && (
                        <span style={{ marginLeft: '4px', opacity: 0.7, fontSize: '10px' }}>
                          ({formatSearchVolume(keyword.avgMonthlySearches)})
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.keywordRemove}
                        onClick={() => removeKeywordFromAdGroup(activeAdGroup, keyword.id)}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Match Type Legend */}
          <div className={styles.infoBox}>
            <Info size={16} className={styles.infoIcon} />
            <div>
              <strong>Tipos de correspondencia:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                <li><strong>Ampla:</strong> marketing digital - alcanca buscas relacionadas</li>
                <li><strong>Frase:</strong> "marketing digital" - alcanca buscas que incluem a frase</li>
                <li><strong>Exata:</strong> [marketing digital] - alcanca buscas com o mesmo significado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Negative Keywords */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Palavras-chave Negativas</h3>
        <p className={styles.sectionDescription}>
          Evite que seus anuncios aparecam para buscas irrelevantes
        </p>

        <div className={styles.keywordsContainer}>
          <div className={styles.keywordInput}>
            <Textarea
              value={negativeKeywordText}
              onChange={(e) => setNegativeKeywordText(e.target.value)}
              placeholder="Digite palavras-chave negativas (uma por linha)&#10;Ex:&#10;gratis&#10;barato&#10;emprego"
              rows={3}
            />
            <Button
              variant="outline"
              onClick={handleAddNegativeKeywords}
              disabled={!negativeKeywordText.trim()}
            >
              Adicionar
            </Button>
          </div>

          {currentAdGroup.negativeKeywords.length > 0 && (
            <div className={styles.keywordsList}>
              {currentAdGroup.negativeKeywords.map((keyword) => (
                <span key={keyword.id} className={styles.keywordTag}>
                  -{keyword.text}
                  <button
                    type="button"
                    className={styles.keywordRemove}
                    onClick={() => {
                      updateAdGroup(activeAdGroup, {
                        negativeKeywords: currentAdGroup.negativeKeywords.filter(k => k.id !== keyword.id)
                      })
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
