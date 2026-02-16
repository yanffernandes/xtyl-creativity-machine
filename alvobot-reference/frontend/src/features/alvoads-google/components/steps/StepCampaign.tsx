import { useMemo, useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Input, SearchableSelect, Checkbox, MultiSelect } from '@/shared/components'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'
import { useGoogleGeoTargets, useGoogleLanguages } from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'
import {
  GOOGLE_BIDDING_STRATEGIES,
} from '../../types/campaign'
import {
  formatDateShort,
  slugify,
} from '../../utils/namingConvention'

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

export function StepCampaign() {
  const [searchParams] = useSearchParams()
  const templateId = searchParams.get('id')

  const {
    campaign,
    setCampaignData,
    markStepCompleted,
    markStepIncomplete,
    sourceArticles,
  } = useGoogleAdsWizardStore()

  // Derive current article from arrays (first selected item)
  const sourceArticle = sourceArticles.length > 0 ? sourceArticles[0] : null

  // Fetch geo targets and languages from API
  const { data: geoTargets, isLoading: loadingGeoTargets } = useGoogleGeoTargets()
  const { data: languages, isLoading: loadingLanguages } = useGoogleLanguages()

  // Transform geo targets to MultiSelect format
  const geoTargetOptions = useMemo(() => {
    if (!geoTargets) return []
    return geoTargets.map(target => ({
      value: target.id,
      label: target.name,
    }))
  }, [geoTargets])

  // Transform languages to MultiSelect format
  // Use lang.id (Google Ads criterion ID like "1014") instead of code ("pt")
  // This matches how geo targets work and avoids mapping issues
  const languageOptions = useMemo(() => {
    if (!languages) return []
    return languages.map(lang => ({
      value: lang.id,
      label: lang.name,
    }))
  }, [languages])

  // Budget type options
  const budgetTypeOptions = [
    { value: 'daily', label: 'por dia' },
    { value: 'total', label: 'total da campanha' },
  ]

  // Bidding strategy options
  const biddingOptions = useMemo(() => {
    return GOOGLE_BIDDING_STRATEGIES.map(s => ({
      value: s.value,
      label: s.label,
    }))
  }, [])

  // Local state for maxCpc text input to allow typing "0," without losing the value
  const [maxCpcText, setMaxCpcText] = useState(() =>
    campaign.maxCpc !== undefined ? String(campaign.maxCpc).replace('.', ',') : ''
  )

  // Sync local state when store value changes externally
  useEffect(() => {
    const storeValue = campaign.maxCpc !== undefined ? String(campaign.maxCpc).replace('.', ',') : ''
    // Only update if the parsed values are different (to avoid cursor jumping)
    const localParsed = parseFloat(maxCpcText.replace(',', '.'))
    if (campaign.maxCpc !== localParsed && !isNaN(campaign.maxCpc || 0)) {
      setMaxCpcText(storeValue)
    }
  }, [campaign.maxCpc, maxCpcText])

  const validateAndMarkStep = () => {
    if (campaign.name && campaign.budget > 0) {
      markStepCompleted('campaign')
    } else {
      markStepIncomplete('campaign')
    }
  }

  const handleNameChange = (name: string) => {
    setCampaignData({ name })
    validateAndMarkStep()
  }

  const handleMaxCpcChange = (text: string) => {
    // Allow only numbers, comma and dot
    const sanitized = text.replace(/[^0-9,.]/g, '')
    setMaxCpcText(sanitized)

    // Parse and update store
    const normalized = sanitized.replace(',', '.')
    const parsed = parseFloat(normalized)
    if (!isNaN(parsed) && parsed > 0) {
      setCampaignData({ maxCpc: parsed })
    } else if (sanitized === '' || sanitized === '0' || sanitized === '0,') {
      setCampaignData({ maxCpc: undefined })
    }
  }

  // Preview do nome da campanha com todas as variáveis (novo formato híbrido)
  const previewName = useMemo(() => {
    const articleSlug = sourceArticle?.articleUrl
      ? extractSlugFromUrl(sourceArticle.articleUrl)
      : sourceArticle?.title
        ? slugify(sourceArticle.title, 25)
        : 'sem-artigo'

    const projectSlug = sourceArticle?.projectName
      ? slugify(sourceArticle.projectName, 15)
      : 'projeto'

    return campaign.name
      .replace('{{article_slug}}', articleSlug)
      .replace('{{project_name}}', projectSlug)
      .replace('{{template_id}}', templateId || 'novo')
      .replace('{{wp_post_id}}', sourceArticle?.wpPostId?.toString() || 'NA')
      .replace('{{date_short}}', formatDateShort(new Date()))
      .replace('{{current_date}}', new Date().toLocaleDateString('pt-BR'))
  }, [campaign.name, templateId, sourceArticle])

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Nome da Campanha</h3>
        <Input
          value={campaign.name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Nome da campanha"
          fullWidth
        />
        <p className={styles.hint}>Preview: {previewName}</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Orçamento</h3>
        <div className={styles.budgetInput}>
          <span>R$</span>
          <Input
            type="number"
            value={campaign.budget}
            onChange={(e) => {
              setCampaignData({ budget: Number(e.target.value) })
              validateAndMarkStep()
            }}
            placeholder="50"
            min={1}
          />
          <SearchableSelect
            options={budgetTypeOptions}
            value={campaign.budgetType}
            onChange={(value) => setCampaignData({ budgetType: value as 'daily' | 'total' })}
            placeholder="Selecione..."
          />
        </div>
        <p className={styles.hint}>
          O valor real gasto por dia pode variar de acordo com o desempenho
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Estratégia de Lance</h3>
        <p className={styles.sectionDescription}>
          Escolha como o Google deve otimizar seus lances automaticamente
        </p>

        <div className={styles.formGroup}>
          <SearchableSelect
            options={biddingOptions}
            value={campaign.biddingStrategy}
            onChange={(value) => setCampaignData({ biddingStrategy: value as typeof campaign.biddingStrategy })}
            placeholder="Selecione a estratégia..."
            fullWidth
          />
          <p className={styles.hint}>
            {GOOGLE_BIDDING_STRATEGIES.find(s => s.value === campaign.biddingStrategy)?.description}
          </p>
        </div>

        {campaign.biddingStrategy === 'TARGET_CPA' && (
          <div className={styles.formGroup}>
            <Input
              label="CPA Desejado (R$)"
              type="number"
              value={campaign.targetCpa || ''}
              onChange={(e) => setCampaignData({ targetCpa: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="Ex: 25"
              step="0.01"
              min="0.01"
            />
          </div>
        )}

        {campaign.biddingStrategy === 'TARGET_ROAS' && (
          <div className={styles.formGroup}>
            <Input
              label="ROAS Desejado (%)"
              type="number"
              value={campaign.targetRoas || ''}
              onChange={(e) => setCampaignData({ targetRoas: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="Ex: 400 (para 4x de retorno)"
              step="1"
              min="1"
            />
          </div>
        )}

        {(campaign.biddingStrategy === 'MANUAL_CPC' || campaign.biddingStrategy === 'ENHANCED_CPC' || campaign.biddingStrategy === 'MAXIMIZE_CLICKS') && (
          <div className={styles.formGroup}>
            <Input
              label={campaign.biddingStrategy === 'MAXIMIZE_CLICKS' ? 'CPC Máximo (R$) (opcional)' : 'CPC Máximo (R$)'}
              type="text"
              inputMode="decimal"
              value={maxCpcText}
              onChange={(e) => handleMaxCpcChange(e.target.value)}
              placeholder={campaign.biddingStrategy === 'MAXIMIZE_CLICKS' ? 'Ex: 0,50 (deixe vazio para sem limite)' : 'Ex: 0,50'}
            />
            {campaign.biddingStrategy === 'MAXIMIZE_CLICKS' && (
              <p className={styles.hint}>
                Define o valor máximo por clique. Deixe vazio para permitir que o Google otimize livremente.
              </p>
            )}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Localização</h3>
        <p className={styles.sectionDescription}>
          Selecione as regiões onde deseja exibir seus anúncios
        </p>

        <MultiSelect
          options={geoTargetOptions}
          value={campaign.locations}
          onChange={(values) => setCampaignData({ locations: values })}
          placeholder={loadingGeoTargets ? 'Carregando...' : 'Selecione as localizações...'}
          searchPlaceholder="Buscar cidade ou estado..."
          showSelectAll
          selectAllLabel="Selecionar todos os países"
          deselectAllLabel="Desmarcar todos"
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Idiomas</h3>
        <p className={styles.sectionDescription}>
          Selecione os idiomas que seus clientes falam
        </p>

        <MultiSelect
          options={languageOptions}
          value={campaign.languages}
          onChange={(values) => setCampaignData({ languages: values })}
          placeholder={loadingLanguages ? 'Carregando...' : 'Selecione os idiomas...'}
          searchPlaceholder="Buscar idioma..."
          showSelectAll
          selectAllLabel="Selecionar todos os idiomas"
          deselectAllLabel="Desmarcar todos"
        />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Programação</h3>

        <div className={styles.dateFields}>
          <div className={styles.formGroup}>
            <Input
              label="Data de início (opcional)"
              type="date"
              value={campaign.startDate || ''}
              onChange={(e) => setCampaignData({ startDate: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Data de término (opcional)"
              type="date"
              value={campaign.endDate || ''}
              onChange={(e) => setCampaignData({ endDate: e.target.value })}
            />
            <p className={styles.hint}>Deixe em branco para veicular continuamente</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Opções de Rede</h3>

        <div className={styles.radioGroup}>
          <div className={styles.radioOption}>
            <Checkbox
              checked={campaign.searchPartners || false}
              onChange={(e) => setCampaignData({ searchPartners: e.target.checked })}
              label="Incluir parceiros de pesquisa do Google"
              description="Exiba anúncios em sites parceiros como AOL, Ask.com e outros"
            />
          </div>

          <div className={styles.radioOption}>
            <Checkbox
              checked={campaign.displayNetwork || false}
              onChange={(e) => setCampaignData({ displayNetwork: e.target.checked })}
              label="Incluir Rede de Display do Google"
              description="Estenda o alcance para sites parceiros (pode aumentar conversões)"
            />
          </div>
        </div>

        <div className={styles.infoBox}>
          <Info size={16} className={styles.infoIcon} />
          <span>
            A maioria dos anunciantes de pesquisa obtém melhores resultados focando apenas na rede de pesquisa
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Status ao Publicar</h3>
        <p className={styles.sectionDescription}>
          Escolha se a campanha deve ser publicada ativa ou pausada
        </p>

        <div className={styles.radioGroup}>
          <div className={styles.radioOption}>
            <Checkbox
              checked={campaign.status === 'ENABLED'}
              onChange={() => setCampaignData({ status: 'ENABLED' })}
              label="Publicar Ativa"
              description="A campanha começa a veicular imediatamente após a publicação"
            />
          </div>

          <div className={styles.radioOption}>
            <Checkbox
              checked={campaign.status === 'PAUSED'}
              onChange={() => setCampaignData({ status: 'PAUSED' })}
              label="Publicar Pausada"
              description="A campanha é criada pausada para revisão antes de ativar"
            />
          </div>
        </div>
      </section>

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
