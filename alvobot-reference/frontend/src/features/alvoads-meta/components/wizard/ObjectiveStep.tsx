import { useEffect, useMemo } from 'react'
import {
  Eye, MousePointer, Heart, UserPlus, Smartphone, ShoppingCart,
  Check, Globe, MessageSquare, MessageCircle, Instagram, Phone,
  PlayCircle, ThumbsUp, Calendar, FileText, ShoppingBag, Sparkles,
  CreditCard, Briefcase, Home, Landmark, AlertTriangle, X, Target,
  Zap, BarChart3, Users,
} from 'lucide-react'
import styles from './WizardSteps.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import {
  META_OBJECTIVES,
  META_DESTINATION_BY_OBJECTIVE,
  META_SPECIAL_AD_CATEGORIES,
  getOptimizationOptions,
  isMessagingDestination,
  type MetaObjective,
  type MetaDestinationType,
  type MetaOptimizationGoal,
  type MetaSpecialAdCategory,
} from '../../types/campaign'
import { generateMetaCampaignName } from '../../utils/namingConvention'

// Icon mapping for objectives
const OBJECTIVE_ICONS: Record<MetaObjective, React.ReactNode> = {
  OUTCOME_AWARENESS: <Eye size={24} />,
  OUTCOME_TRAFFIC: <MousePointer size={24} />,
  OUTCOME_ENGAGEMENT: <Heart size={24} />,
  OUTCOME_LEADS: <UserPlus size={24} />,
  OUTCOME_APP_PROMOTION: <Smartphone size={24} />,
  OUTCOME_SALES: <ShoppingCart size={24} />,
}

// Icon mapping for destination types
const DESTINATION_ICONS: Record<string, React.ReactNode> = {
  'globe': <Globe size={20} />,
  'smartphone': <Smartphone size={20} />,
  'message-square': <MessageSquare size={20} />,
  'message-circle': <MessageCircle size={20} />,
  'instagram': <Instagram size={20} />,
  'phone': <Phone size={20} />,
  'play-circle': <PlayCircle size={20} />,
  'thumbs-up': <ThumbsUp size={20} />,
  'calendar': <Calendar size={20} />,
  'file-text': <FileText size={20} />,
  'shopping-bag': <ShoppingBag size={20} />,
  'sparkles': <Sparkles size={20} />,
  'eye': <Eye size={20} />,
}

// Icon mapping for optimization goals
const OPTIMIZATION_ICONS: Record<string, React.ReactNode> = {
  OFFSITE_CONVERSIONS: <Target size={20} />,
  CONVERSATIONS: <MessageCircle size={20} />,
  VALUE: <BarChart3 size={20} />,
  LINK_CLICKS: <MousePointer size={20} />,
  LANDING_PAGE_VIEWS: <Globe size={20} />,
  IMPRESSIONS: <Eye size={20} />,
  REACH: <Users size={20} />,
  AD_RECALL_LIFT: <Zap size={20} />,
  ENGAGED_USERS: <Heart size={20} />,
  POST_ENGAGEMENT: <ThumbsUp size={20} />,
  PAGE_LIKES: <ThumbsUp size={20} />,
  EVENT_RESPONSES: <Calendar size={20} />,
  LEAD_GENERATION: <UserPlus size={20} />,
  QUALITY_LEAD: <UserPlus size={20} />,
  QUALITY_CALL: <Phone size={20} />,
  APP_INSTALLS: <Smartphone size={20} />,
  THRUPLAY: <PlayCircle size={20} />,
  TWO_SECOND_CONTINUOUS_VIDEO_VIEWS: <PlayCircle size={20} />,
  VISIT_INSTAGRAM_PROFILE: <Instagram size={20} />,
}

// Icon mapping for special ad categories
const SPECIAL_AD_CATEGORY_ICONS: Record<MetaSpecialAdCategory, React.ReactNode> = {
  FINANCIAL_PRODUCTS_SERVICES: <CreditCard size={20} />,
  EMPLOYMENT: <Briefcase size={20} />,
  HOUSING: <Home size={20} />,
  ISSUES_ELECTIONS_POLITICS: <Landmark size={20} />,
}

// Map ODAX objective to short code for naming
function objectiveToShortCode(objective: MetaObjective): string {
  const map: Record<MetaObjective, string> = {
    OUTCOME_AWARENESS: 'AWR',
    OUTCOME_TRAFFIC: 'TRF',
    OUTCOME_ENGAGEMENT: 'ENG',
    OUTCOME_LEADS: 'LED',
    OUTCOME_APP_PROMOTION: 'APP',
    OUTCOME_SALES: 'VND',
  }
  return map[objective] || 'TRF'
}

export function ObjectiveStep() {
  const {
    objective,
    setObjective,
    destinationType,
    setDestinationType,
    optimizationGoal,
    setOptimizationGoal,
    templateName,
    setTemplateName,
    markStepCompleted,
    markStepIncomplete,
    messageConfig,
    setWhatsappNumber,
    selectedArticles,
    specialAdCategories,
    toggleSpecialAdCategory,
  } = useMetaAdsWizardStore()

  // Get available destinations for current objective
  const availableDestinations = useMemo(() => {
    return META_DESTINATION_BY_OBJECTIVE[objective] || []
  }, [objective])

  // Get available optimizations for current objective + destination
  const availableOptimizations = useMemo(() => {
    return getOptimizationOptions(objective, destinationType)
  }, [objective, destinationType])

  // Is current destination a messaging type?
  const isMessaging = useMemo(() => isMessagingDestination(destinationType), [destinationType])

  // Generate suggested name based on selected articles and objective
  const suggestedName = useMemo(() => {
    if (selectedArticles.length === 0) return null

    const firstArticle = selectedArticles[0]
    // Map ODAX to the old short code for naming convention compat
    return generateMetaCampaignName({
      articleTitle: firstArticle.title || firstArticle.keyword_used || 'campanha',
      projectName: firstArticle.project_name || 'projeto',
      objective: objectiveToShortCode(objective),
      date: new Date(),
    })
  }, [selectedArticles, objective])

  // Auto-set name when suggested name changes and current name is empty or default
  useEffect(() => {
    if (suggestedName && (!templateName || templateName === 'Nova Campanha Meta')) {
      setTemplateName(suggestedName)
    }
  }, [suggestedName, templateName, setTemplateName])

  // Validate on mount and when objective/templateName changes
  useEffect(() => {
    if (objective && templateName) {
      markStepCompleted('objective')
    } else {
      markStepIncomplete('objective')
    }
  }, [objective, templateName, markStepCompleted, markStepIncomplete])

  const handleObjectiveSelect = (value: MetaObjective) => {
    setObjective(value)

    // Update campaign name with new objective if using auto-generated name
    if (selectedArticles.length > 0 && suggestedName && templateName === suggestedName) {
      const newSuggestedName = generateMetaCampaignName({
        articleTitle: selectedArticles[0].title || selectedArticles[0].keyword_used || 'campanha',
        projectName: selectedArticles[0].project_name || 'projeto',
        objective: objectiveToShortCode(value),
        date: new Date(),
      })
      setTemplateName(newSuggestedName)
    }

    if (value && templateName) {
      markStepCompleted('objective')
    }
  }

  const handleDestinationSelect = (value: MetaDestinationType) => {
    setDestinationType(value)
  }

  const handleOptimizationSelect = (value: MetaOptimizationGoal) => {
    setOptimizationGoal(value)
  }

  const handleTemplateNameChange = (name: string) => {
    setTemplateName(name)
    if (name && objective) {
      markStepCompleted('objective')
    } else {
      markStepIncomplete('objective')
    }
  }

  const handleUseSuggestedName = () => {
    if (suggestedName) {
      setTemplateName(suggestedName)
    }
  }

  return (
    <div className={styles.stepContent}>
      {/* Campaign Name */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Nome da Campanha</h3>
        <p className={styles.sectionDescription}>
          Nome padronizado para rastreamento (formato: artigo_projeto_OBJ|tID_DATA)
        </p>

        <div className={styles.formGroup}>
          <input
            type="text"
            className={styles.input}
            value={templateName}
            onChange={(e) => handleTemplateNameChange(e.target.value)}
            placeholder="como-fazer-bolo_meublog_TRF|tnovo_20250104"
            maxLength={100}
          />
          {suggestedName && templateName !== suggestedName && (
            <button
              type="button"
              onClick={handleUseSuggestedName}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                marginTop: 'var(--space-2)',
                padding: 'var(--space-1) var(--space-2)',
                background: 'var(--color-primary-alpha-10)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-primary)',
                fontSize: 'var(--font-size-sm)',
                cursor: 'pointer',
              }}
            >
              <Sparkles size={14} />
              Usar nome sugerido: {suggestedName}
            </button>
          )}
          <span className={styles.hint}>
            O nome segue o padrão UTM-FY para rastreamento automático
          </span>
        </div>
      </section>

      {/* Campaign Objective (ODAX) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Objetivo da Campanha</h3>
        <p className={styles.sectionDescription}>
          Escolha o que você deseja alcançar. O Meta usa o framework ODAX com 6 objetivos
          que determinam como os anúncios são otimizados.
        </p>

        <div className={styles.objectivesGrid}>
          {META_OBJECTIVES.map((obj) => {
            const isSelected = objective === obj.value

            return (
              <button
                key={obj.value}
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleObjectiveSelect(obj.value)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                  <div style={{
                    padding: 'var(--space-2)',
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: isSelected ? 'white' : 'var(--color-text-secondary)',
                  }}>
                    {OBJECTIVE_ICONS[obj.value]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.optionLabel}>{obj.label}</span>
                      {isSelected && (
                        <Check size={20} style={{ color: 'var(--color-success)' }} />
                      )}
                    </div>
                    <span className={styles.optionDescription}>{obj.description}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Destination Type (Local de Conversão) */}
      {objective && availableDestinations.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Local de Conversão</h3>
          <p className={styles.sectionDescription}>
            Onde a conversão vai acontecer? Isso define o <code>destination_type</code> do conjunto de anúncios.
          </p>

          <div className={styles.optionsGrid} style={{
            gridTemplateColumns: availableDestinations.length <= 3
              ? `repeat(${availableDestinations.length}, 1fr)`
              : 'repeat(3, 1fr)',
          }}>
            {availableDestinations.map((dest) => {
              const isSelected = destinationType === dest.value

              return (
                <button
                  key={dest.value}
                  type="button"
                  className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleDestinationSelect(dest.value)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                    <div style={{
                      padding: 'var(--space-2)',
                      background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      color: isSelected ? 'white' : 'var(--color-text-secondary)',
                    }}>
                      {DESTINATION_ICONS[dest.icon] || <Globe size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={styles.optionLabel}>{dest.label}</span>
                        {isSelected && <Check size={18} style={{ color: 'var(--color-success)' }} />}
                      </div>
                      <span className={styles.optionDescription}>{dest.description}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* WhatsApp Number (if WhatsApp destination is selected) */}
      {isMessaging && destinationType === 'WHATSAPP' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Número do WhatsApp Business</h3>
          <p className={styles.sectionDescription}>
            Informe o número do WhatsApp Business que receberá as mensagens
          </p>

          <div className={styles.formGroup}>
            <input
              type="text"
              className={styles.input}
              value={messageConfig?.whatsappNumber || ''}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+55 11 99999-9999"
              maxLength={20}
            />
            <span className={styles.hint}>
              Use o formato internacional com código do país (ex: +55 para Brasil)
            </span>
          </div>
        </section>
      )}

      {/* Optimization Goal (Meta de Desempenho) */}
      {objective && availableOptimizations.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Meta de Desempenho</h3>
          <p className={styles.sectionDescription}>
            Para o que o algoritmo do Meta deve otimizar a entrega dos anúncios?
            Isso define o <code>optimization_goal</code> do conjunto.
          </p>

          <div className={styles.optionsGrid} style={{
            gridTemplateColumns: availableOptimizations.length <= 3
              ? `repeat(${availableOptimizations.length}, 1fr)`
              : 'repeat(3, 1fr)',
          }}>
            {availableOptimizations.map((opt) => {
              const isSelected = optimizationGoal === opt.value

              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handleOptimizationSelect(opt.value)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                    <div style={{
                      padding: 'var(--space-2)',
                      background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      color: isSelected ? 'white' : 'var(--color-text-secondary)',
                    }}>
                      {OPTIMIZATION_ICONS[opt.value] || <Target size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={styles.optionLabel}>{opt.label}</span>
                        {isSelected && <Check size={18} style={{ color: 'var(--color-success)' }} />}
                      </div>
                      <span className={styles.optionDescription}>{opt.description}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Context tip */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {META_OBJECTIVES.find(o => o.value === objective)?.label}
            </strong>
            {' → '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {availableDestinations.find(d => d.value === destinationType)?.label || destinationType}
            </strong>
            {' → '}
            <strong style={{ color: 'var(--color-primary)' }}>
              {availableOptimizations.find(o => o.value === optimizationGoal)?.label || optimizationGoal}
            </strong>
          </div>
        </section>
      )}

      {/* Special Ad Categories */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Categoria Especial de Anúncio</h3>
        <p className={styles.sectionDescription}>
          Se o seu anúncio está relacionado a crédito, emprego, habitação ou questões políticas,
          você <strong>deve</strong> declarar a categoria. Caso contrário, deixe desmarcado.
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {META_SPECIAL_AD_CATEGORIES.map((cat) => {
            const isSelected = specialAdCategories.includes(cat.value)

            return (
              <button
                key={cat.value}
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => toggleSpecialAdCategory(cat.value)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                  <div style={{
                    padding: 'var(--space-2)',
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: isSelected ? 'white' : 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}>
                    {SPECIAL_AD_CATEGORY_ICONS[cat.value]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.optionLabel}>{cat.label}</span>
                      {isSelected && (
                        <Check size={18} style={{ color: 'var(--color-success)' }} />
                      )}
                    </div>
                    <span className={styles.optionDescription}>{cat.description}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Warning when categories are selected */}
        {specialAdCategories.length > 0 && (
          <>
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-warning-alpha-10)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-warning)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)' }}>
                    Restrições automáticas ativadas
                  </strong>
                  <ul style={{
                    margin: 'var(--space-2) 0 0 0',
                    paddingLeft: 'var(--space-4)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.6',
                  }}>
                    <li><strong>Idade:</strong> Somente range completo 18-65+ (sem segmentação específica)</li>
                    <li><strong>Gênero:</strong> Não pode segmentar por gênero (todos os gêneros)</li>
                    <li><strong>Localização:</strong> Raio mínimo de 25 km, sem CEP/ZIP code</li>
                    <li><strong>Interesses:</strong> Várias opções de detailed targeting ficam indisponíveis</li>
                    <li><strong>Exclusão de público:</strong> Não é permitido excluir audiências</li>
                    <li><strong>Lookalike:</strong> Audiências semelhantes não disponíveis</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Selected categories chips */}
            <div style={{
              marginTop: 'var(--space-3)',
              display: 'flex',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
            }}>
              {specialAdCategories.map((cat) => {
                const catInfo = META_SPECIAL_AD_CATEGORIES.find(c => c.value === cat)
                return (
                  <div key={cat} className={styles.selectedItemChip}>
                    {SPECIAL_AD_CATEGORY_ICONS[cat]}
                    <span style={{ marginLeft: '4px' }}>{catInfo?.label}</span>
                    <button
                      type="button"
                      className={styles.selectedItemChipRemove}
                      onClick={() => toggleSpecialAdCategory(cat)}
                      title="Remover categoria"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
