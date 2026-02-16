import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, X, Sparkles, Loader2, Eye, FileText, Link2, Check } from 'lucide-react'
import { Input, Button, Alert } from '@/shared/components'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'
import { useGenerateGoogleAdCopy } from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'
import { previewUtmString, slugify, getArticleFinalUrl } from '../../utils/utmBuilder'
import type { ResponsiveSearchAd } from '../../types/campaign'

const MAX_HEADLINE_LENGTH = 30
const MAX_DESCRIPTION_LENGTH = 90
const MIN_HEADLINES = 3
const MAX_HEADLINES = 15
const MIN_DESCRIPTIONS = 2
const MAX_DESCRIPTIONS = 4

// Generate display path from keyword (max 15 chars each)
function generateDisplayPath(keyword: string): { path1: string; path2: string } {
  if (!keyword) return { path1: '', path2: '' }

  // Slugify and split by hyphens or spaces
  const slug = slugify(keyword, 50)
  const words = slug.split('-').filter(w => w.length > 0)

  if (words.length === 0) return { path1: '', path2: '' }

  if (words.length === 1) {
    // Single word - use it as path1, leave path2 empty
    return { path1: words[0].slice(0, 15), path2: '' }
  }

  // Multiple words - try to fit first word(s) in path1 and rest in path2
  let path1 = ''
  let path2 = ''
  let usedForPath1 = 0

  // Build path1 with as many words as fit
  for (let i = 0; i < words.length; i++) {
    const potential = path1 ? `${path1}-${words[i]}` : words[i]
    if (potential.length <= 15) {
      path1 = potential
      usedForPath1 = i + 1
    } else {
      break
    }
  }

  // Build path2 with remaining words
  const remainingWords = words.slice(usedForPath1)
  for (const word of remainingWords) {
    const potential = path2 ? `${path2}-${word}` : word
    if (potential.length <= 15) {
      path2 = potential
    } else {
      break
    }
  }

  return { path1, path2 }
}

export function StepSearchAds() {
  const {
    adGroups,
    campaign,
    updateAdGroup,
    markStepCompleted,
    sourceArticles,
    generatedFromArticle,
  } = useGoogleAdsWizardStore()

  // Derive current article from arrays (first selected item)
  const sourceArticle = sourceArticles.length > 0 ? sourceArticles[0] : null

  const [activeAdGroup, setActiveAdGroup] = useState(0)
  const [productName, setProductName] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [hasAppliedGenerated, setHasAppliedGenerated] = useState(false)

  const generateAdCopyMutation = useGenerateGoogleAdCopy()

  const currentAdGroup = adGroups[activeAdGroup]

  // Generate display path from keyword
  const autoDisplayPath = useMemo(() => {
    return generateDisplayPath(sourceArticle?.keywordUsed || '')
  }, [sourceArticle?.keywordUsed])

  // Get the final URL considering pre-article setting
  const articleFinalUrl = useMemo(() => {
    return getArticleFinalUrl(sourceArticle?.articleUrl, sourceArticle?.usePreArticleUrl)
  }, [sourceArticle?.articleUrl, sourceArticle?.usePreArticleUrl])

  // Get or create the current ad (always work with the first ad in the group)
  const currentAd: ResponsiveSearchAd = useMemo(() => {
    if (currentAdGroup.ads.length > 0) {
      return currentAdGroup.ads[0] as ResponsiveSearchAd
    }
    return {
      id: `ad-${Date.now()}`,
      headlines: ['', '', ''],
      descriptions: ['', ''],
      finalUrl: articleFinalUrl,
      path1: autoDisplayPath.path1,
      path2: autoDisplayPath.path2,
    }
  }, [currentAdGroup.ads, articleFinalUrl, autoDisplayPath])

  // Auto-save function - updates the ad in the store
  // NOTE: We save the BASE URL without UTMs. UTMs will be added at publish time.
  const saveAd = useCallback((updatedAd: ResponsiveSearchAd) => {
    const filledHeadlines = updatedAd.headlines.filter(h => h.trim().length > 0)
    const filledDescriptions = updatedAd.descriptions.filter(d => d.trim().length > 0)

    // Only save if we have minimum content
    if (filledHeadlines.length >= MIN_HEADLINES && filledDescriptions.length >= MIN_DESCRIPTIONS && updatedAd.finalUrl) {
      // Strip any existing UTM parameters - we store only the base URL
      // UTMs will be added at publish time by the backend
      const baseUrl = updatedAd.finalUrl.split('?')[0]

      const adToSave: ResponsiveSearchAd = {
        ...updatedAd,
        headlines: filledHeadlines,
        descriptions: filledDescriptions,
        finalUrl: baseUrl,
      }

      // Update the ad group with the new ad (replace existing or add new)
      updateAdGroup(activeAdGroup, {
        ads: [adToSave],
      })

      markStepCompleted('search_ads')
    }
  }, [activeAdGroup, markStepCompleted, updateAdGroup])

  // Local state for editing (synced with store)
  const [editingAd, setEditingAd] = useState<ResponsiveSearchAd>(currentAd)

  // Sync editing state when switching ad groups or when currentAd changes
  useEffect(() => {
    setEditingAd(currentAd)
  }, [currentAd])

  // Auto-apply generated content when entering this step (if not already applied)
  useEffect(() => {
    if (generatedFromArticle && !hasAppliedGenerated) {
      const hasHeadlines = generatedFromArticle.headlines && generatedFromArticle.headlines.length > 0
      const hasDescriptions = generatedFromArticle.descriptions && generatedFromArticle.descriptions.length > 0

      if (hasHeadlines || hasDescriptions) {
        const newAd: ResponsiveSearchAd = {
          ...editingAd,
          id: editingAd.id || `ad-${Date.now()}`,
          headlines: hasHeadlines
            ? generatedFromArticle.headlines.slice(0, MAX_HEADLINES)
            : editingAd.headlines,
          descriptions: hasDescriptions
            ? generatedFromArticle.descriptions.slice(0, MAX_DESCRIPTIONS)
            : editingAd.descriptions,
          finalUrl: editingAd.finalUrl || articleFinalUrl || '',
          // Auto-fill display path from keyword
          path1: editingAd.path1 || autoDisplayPath.path1,
          path2: editingAd.path2 || autoDisplayPath.path2,
        }

        setEditingAd(newAd)
        setHasAppliedGenerated(true)

        // Auto-save the generated content
        setTimeout(() => saveAd(newAd), 100)
      }
    }
  }, [generatedFromArticle, hasAppliedGenerated, editingAd, articleFinalUrl, saveAd, autoDisplayPath])

  // Pre-fill finalUrl from article URL when available (considering pre-article setting)
  useEffect(() => {
    if (articleFinalUrl && !editingAd.finalUrl) {
      setEditingAd(prev => ({ ...prev, finalUrl: articleFinalUrl }))
    }
  }, [articleFinalUrl, editingAd.finalUrl])

  // Update finalUrl when pre-article setting changes (only if URL is based on article URL)
  useEffect(() => {
    if (!sourceArticle?.articleUrl || !articleFinalUrl) return

    // Check if current URL is based on the article URL (normal or pre version)
    const baseArticleUrl = sourceArticle.articleUrl.split('?')[0]
    const currentBaseUrl = editingAd.finalUrl?.split('?')[0] || ''

    // If current URL contains the article domain/path, update it
    if (currentBaseUrl && baseArticleUrl) {
      try {
        const articleDomain = new URL(baseArticleUrl).hostname
        const currentDomain = new URL(currentBaseUrl).hostname

        // Only update if same domain (user hasn't changed to a different URL)
        if (articleDomain === currentDomain) {
          setEditingAd(prev => ({ ...prev, finalUrl: articleFinalUrl }))
        }
      } catch {
        // Invalid URL, skip update
      }
    }
  }, [
    sourceArticle?.usePreArticleUrl,
    sourceArticle?.articleUrl,
    articleFinalUrl,
    editingAd.finalUrl,
  ]) // Only trigger when pre-article setting changes

  // Auto-save on changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAd(editingAd)
    }, 500) // 500ms debounce

    return () => clearTimeout(timer)
  }, [editingAd, saveAd])

  const handleHeadlineChange = (index: number, value: string) => {
    const newHeadlines = [...editingAd.headlines]
    newHeadlines[index] = value.slice(0, MAX_HEADLINE_LENGTH)
    setEditingAd({ ...editingAd, headlines: newHeadlines })
  }

  const handleDescriptionChange = (index: number, value: string) => {
    const newDescriptions = [...editingAd.descriptions]
    newDescriptions[index] = value.slice(0, MAX_DESCRIPTION_LENGTH)
    setEditingAd({ ...editingAd, descriptions: newDescriptions })
  }

  const addHeadline = () => {
    if (editingAd.headlines.length < MAX_HEADLINES) {
      setEditingAd({
        ...editingAd,
        headlines: [...editingAd.headlines, ''],
      })
    }
  }

  const removeHeadline = (index: number) => {
    if (editingAd.headlines.length > MIN_HEADLINES) {
      const newHeadlines = editingAd.headlines.filter((_, i) => i !== index)
      setEditingAd({ ...editingAd, headlines: newHeadlines })
    }
  }

  const addDescription = () => {
    if (editingAd.descriptions.length < MAX_DESCRIPTIONS) {
      setEditingAd({
        ...editingAd,
        descriptions: [...editingAd.descriptions, ''],
      })
    }
  }

  const removeDescription = (index: number) => {
    if (editingAd.descriptions.length > MIN_DESCRIPTIONS) {
      const newDescriptions = editingAd.descriptions.filter((_, i) => i !== index)
      setEditingAd({ ...editingAd, descriptions: newDescriptions })
    }
  }

  const handleGenerateWithAI = async () => {
    if (!productName.trim()) {
      setAiError('Digite o nome do produto/servico para gerar titulos e descricoes')
      return
    }

    // Language is required - must come from article's keyword snapshot
    const language = sourceArticle?.keywordSnapshot?.language
    if (!language) {
      setAiError('Selecione um artigo com idioma definido na keyword para gerar conteúdo com IA')
      return
    }

    setAiError(null)

    try {
      // Get keywords from current ad group to provide context
      const keywords = currentAdGroup.keywords.map(k => k.text)

      const result = await generateAdCopyMutation.mutateAsync({
        productName: productName.trim(),
        productDescription: productName.trim(),
        keywords: keywords.length > 0 ? keywords : undefined,
        headlineCount: 5,
        descriptionCount: 4,
        language, // Required for AI generation
      })

      if (result.success && (result.headlines.length > 0 || result.descriptions.length > 0)) {
        setEditingAd({
          ...editingAd,
          headlines: result.headlines.slice(0, MAX_HEADLINES),
          descriptions: result.descriptions.slice(0, MAX_DESCRIPTIONS),
        })
        setProductName('')
      } else {
        setAiError('Nao foi possivel gerar titulos e descricoes. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao gerar copy:', error)
      setAiError('Erro ao gerar titulos e descricoes. Verifique seus creditos.')
    }
  }

  // Ad Preview
  const previewHeadlines = editingAd.headlines.filter(h => h.trim()).slice(0, 3)
  const previewDescription = editingAd.descriptions.filter(d => d.trim()).join(' ')

  // Extrair hostname da URL de forma segura
  const getDisplayUrl = (url: string): string => {
    if (!url || !url.trim()) return 'seusite.com.br'
    try {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      return new URL(fullUrl).hostname
    } catch {
      return 'seusite.com.br'
    }
  }
  const displayUrl = getDisplayUrl(editingAd.finalUrl)

  // Preview UTM string for display
  const utmPreview = useMemo(() => {
    if (!editingAd.finalUrl) return ''
    return previewUtmString({
      campaignName: campaign.name,
      adGroupName: currentAdGroup.name,
      contentType: 'ad',
      contentName: 'ad1',
    })
  }, [campaign.name, currentAdGroup.name, editingAd.finalUrl])

  // Check if ad is valid and saved
  const isAdValid = useMemo(() => {
    const filledHeadlines = editingAd.headlines.filter(h => h.trim().length > 0)
    const filledDescriptions = editingAd.descriptions.filter(d => d.trim().length > 0)
    return filledHeadlines.length >= MIN_HEADLINES &&
           filledDescriptions.length >= MIN_DESCRIPTIONS &&
           editingAd.finalUrl.trim().length > 0
  }, [editingAd])

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
          {generatedFromArticle && generatedFromArticle.headlines.length > 0 && (
            <div className={styles.articleSourceBannerActions}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)', fontSize: '13px' }}>
                <Check size={14} /> Conteúdo aplicado automaticamente
              </span>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      {isAdValid && (
        <Alert variant="success">
          <Check size={16} style={{ marginRight: '8px' }} />
          Anúncio salvo automaticamente! Você pode continuar editando ou avançar para o próximo passo.
        </Alert>
      )}

      {/* Ad Groups Navigation */}
      <section className={styles.section}>
        <div className={styles.tabsContainer}>
          {adGroups.map((group, index) => (
            <button
              key={index}
              type="button"
              className={`${styles.tab} ${activeAdGroup === index ? styles.active : ''}`}
              onClick={() => setActiveAdGroup(index)}
            >
              {group.name} ({group.ads.length} anuncios)
            </button>
          ))}
        </div>
      </section>

      {/* Ad Creation Form */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          Anúncio Responsivo de Pesquisa
        </h3>
        <p className={styles.sectionDescription}>
          O Google combina automaticamente seus títulos e descrições para criar as melhores combinações.
          As alterações são salvas automaticamente.
        </p>

        {/* AI Generation */}
        <div className={styles.aiSection}>
          <span className={styles.aiSectionTitle}>
            <Sparkles size={16} />
            Geracao com IA
          </span>
          <p className={styles.sectionDescription}>
            Gere titulos e descricoes persuasivos automaticamente
          </p>
          {aiError && (
            <Alert variant="error" onClose={() => setAiError(null)}>{aiError}</Alert>
          )}
          <div className={styles.aiInputRow}>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Digite o nome do produto/servico (ex: Consultoria de Marketing)"
              fullWidth
            />
            <Button
              variant="outline"
              leftIcon={generateAdCopyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              onClick={handleGenerateWithAI}
              disabled={generateAdCopyMutation.isPending || !productName.trim()}
            >
              {generateAdCopyMutation.isPending ? 'Gerando...' : 'Gerar (2 creditos)'}
            </Button>
          </div>
        </div>

        {/* Headlines */}
        <div className={styles.formGroup}>
          <span className={styles.label}>
            Titulos ({editingAd.headlines.filter(h => h.trim()).length}/{MAX_HEADLINES}) - minimo {MIN_HEADLINES}
          </span>
          <div className={styles.textAssetEditor}>
            {editingAd.headlines.map((headline, index) => (
              <div key={index} className={styles.textAssetRow}>
                <Input
                  value={headline}
                  onChange={(e) => handleHeadlineChange(index, e.target.value)}
                  placeholder={`Titulo ${index + 1}`}
                  maxLength={MAX_HEADLINE_LENGTH}
                  fullWidth
                />
                <span className={`${styles.charCount} ${headline.length >= MAX_HEADLINE_LENGTH ? styles.error : headline.length >= MAX_HEADLINE_LENGTH - 5 ? styles.warning : ''}`}>
                  {headline.length}/{MAX_HEADLINE_LENGTH}
                </span>
                {editingAd.headlines.length > MIN_HEADLINES && (
                  <button
                    type="button"
                    onClick={() => removeHeadline(index)}
                    className={styles.keywordRemove}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {editingAd.headlines.length < MAX_HEADLINES && (
              <button type="button" className={styles.addAssetButton} onClick={addHeadline}>
                <Plus size={14} /> Adicionar titulo
              </button>
            )}
          </div>
        </div>

        {/* Descriptions */}
        <div className={styles.formGroup}>
          <span className={styles.label}>
            Descricoes ({editingAd.descriptions.filter(d => d.trim()).length}/{MAX_DESCRIPTIONS}) - minimo {MIN_DESCRIPTIONS}
          </span>
          <div className={styles.textAssetEditor}>
            {editingAd.descriptions.map((description, index) => (
              <div key={index} className={styles.textAssetRow}>
                <Input
                  value={description}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  placeholder={`Descricao ${index + 1}`}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  fullWidth
                />
                <span className={`${styles.charCount} ${description.length >= MAX_DESCRIPTION_LENGTH ? styles.error : description.length >= MAX_DESCRIPTION_LENGTH - 10 ? styles.warning : ''}`}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
                {editingAd.descriptions.length > MIN_DESCRIPTIONS && (
                  <button
                    type="button"
                    onClick={() => removeDescription(index)}
                    className={styles.keywordRemove}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {editingAd.descriptions.length < MAX_DESCRIPTIONS && (
              <button type="button" className={styles.addAssetButton} onClick={addDescription}>
                <Plus size={14} /> Adicionar descricao
              </button>
            )}
          </div>
        </div>

        {/* URL Fields */}
        <div className={styles.formGroup}>
          <Input
            label="URL Final *"
            value={editingAd.finalUrl}
            onChange={(e) => setEditingAd({ ...editingAd, finalUrl: e.target.value })}
            placeholder="https://seusite.com.br/pagina-destino"
          />
          {utmPreview && (
            <div className={styles.utmPreview}>
              <Link2 size={12} />
              <span className={styles.utmPreviewLabel}>UTMs automaticos:</span>
              <code className={styles.utmPreviewCode}>{utmPreview}</code>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <span className={styles.label}>Caminho de exibicao (opcional)</span>
          <div className={styles.displayPathRow}>
            <span className={styles.displayPathDomain}>{displayUrl}/</span>
            <Input
              value={editingAd.path1 || ''}
              onChange={(e) => setEditingAd({ ...editingAd, path1: e.target.value.slice(0, 15) })}
              placeholder="servicos"
              maxLength={15}
              className={styles.displayPathInput}
            />
            <span className={styles.displayPathSeparator}>/</span>
            <Input
              value={editingAd.path2 || ''}
              onChange={(e) => setEditingAd({ ...editingAd, path2: e.target.value.slice(0, 15) })}
              placeholder="marketing"
              maxLength={15}
              className={styles.displayPathInput}
            />
          </div>
          <p className={styles.hint}>Maximo de 15 caracteres por caminho</p>
        </div>

        {/* Ad Preview */}
        <div className={styles.adPreviewContainer}>
          <span className={styles.label}>
            <Eye size={14} /> Pre-visualizacao do anuncio
          </span>
          <div className={styles.adPreview}>
            <span className={styles.adPreviewLabel}>Anuncio</span>
            <div className={styles.adPreviewSponsor}>Patrocinado</div>
            <div className={styles.adPreviewUrl}>
              {displayUrl}
              {editingAd.path1 && `/${editingAd.path1}`}
              {editingAd.path2 && `/${editingAd.path2}`}
            </div>
            <div className={styles.adPreviewHeadline}>
              {previewHeadlines.length > 0 ? previewHeadlines.join(' | ') : 'Seus titulos aparecerão aqui'}
            </div>
            <div className={styles.adPreviewDescription}>
              {previewDescription || 'Suas descricoes aparecerão aqui. Quanto mais descricoes voce adicionar, mais combinacoes o Google podera testar.'}
            </div>
          </div>
        </div>
      </section>

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
