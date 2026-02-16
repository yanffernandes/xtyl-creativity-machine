import { useMemo } from 'react'
import {
  Check,
  Edit2,
  Users,
  Building2,
  FileText,
  Instagram,
  Target,
  DollarSign,
  Image,
  Type,
  ExternalLink,
  AlertTriangle,
  Play,
  MessageCircle,
  Pause,
  Shield,
} from 'lucide-react'
import { DiversityPreview } from './DiversityPreview' // T070: Import DiversityPreview
import styles from './WizardSteps.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { META_SPECIAL_AD_CATEGORIES, isMessagingDestination, type MetaWizardStep } from '../../types/campaign'
import { formatCurrency } from '../../utils/validation'
import type { GeneratedImageWithConcept } from '../../types/creative'

const STEP_LABELS: Record<MetaWizardStep, string> = {
  articles: 'Artigos',
  adsets_config: 'Conjuntos',
  account: 'Conta de Anúncios',
  pixel: 'Pixel',
  page: 'Página do Facebook',
  instagram: 'Conta do Instagram',
  objective: 'Objetivo',
  targeting: 'Segmentação',
  budget: 'Orçamento',
  creative: 'Criativos',
  creative_ai: 'Geração de Criativos',
  creative_approval: 'Aprovação de Criativos',
  ad_copy: 'Texto do Anúncio',
  review: 'Revisão',
}

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Saiba Mais',
  SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastre-se',
  CONTACT_US: 'Fale Conosco',
  BOOK_NOW: 'Reserve Agora',
  DOWNLOAD: 'Baixar',
  GET_OFFER: 'Ver Oferta',
  GET_QUOTE: 'Pedir Orçamento',
  SUBSCRIBE: 'Inscrever-se',
  SEND_MESSAGE: 'Enviar Mensagem',
}

const OBJECTIVE_LABELS: Record<string, string> = {
  // ODAX objectives
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Leads / Cadastros',
  OUTCOME_APP_PROMOTION: 'Promoção de App',
  OUTCOME_SALES: 'Vendas',
  // Legacy (backward compat)
  TRAFFIC: 'Tráfego',
  MESSAGES: 'Mensagens',
  LEADS: 'Leads',
  SALES: 'Vendas',
}

interface ReviewSectionProps {
  title: string
  icon: React.ReactNode
  isComplete: boolean
  step: MetaWizardStep
  onEdit?: (step: MetaWizardStep) => void
  children: React.ReactNode
}

function ReviewSection({ title, icon, isComplete, step, onEdit, children }: ReviewSectionProps) {
  return (
    <div className={styles.section}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className={styles.sectionTitle}>
          {icon}
          {title}
          {isComplete ? (
            <Check size={16} style={{ color: 'var(--color-success)', marginLeft: 'var(--space-2)' }} />
          ) : (
            <AlertTriangle size={16} style={{ color: 'var(--color-warning)', marginLeft: 'var(--space-2)' }} />
          )}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(step)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: 'var(--space-1) var(--space-2)',
              font: 'var(--font-body-xs)',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <Edit2 size={14} />
            Editar
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

interface ReviewItemProps {
  label: string
  value: string | React.ReactNode
  isMissing?: boolean
}

function ReviewItem({ label, value, isMissing }: ReviewItemProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-secondary)', font: 'var(--font-body-sm)' }}>{label}</span>
      <span style={{
        color: isMissing ? 'var(--color-error)' : 'var(--color-text-primary)',
        font: 'var(--font-body-sm)',
        fontWeight: 500,
        textAlign: 'right',
        maxWidth: '60%',
      }}>
        {value || <span style={{ fontStyle: 'italic' }}>Não definido</span>}
      </span>
    </div>
  )
}

export function ReviewStep() {
  const {
    accounts,
    pages,
    instagramAccount,
    objective,
    destinationType,
    optimizationGoal,
    conversionEvent,
    templateName,
    targeting,
    budget,
    creativeMode,
    driveImages,
    aiGeneratedImages,
    adCopy,
    completedSteps,
    goToStep,
    // New AI Creative fields
    approvedImages,
    adCopyMap,
    adCopyApplyMode,
    sharedAdCopy,
    sharedGreeting,
    greetingApplyMode,
    imageConfig,
    selectedArticles,
    // T070: Diversity preview fields
    diversityMetrics,
    detectedNiche,
    generatedImages,
    // Publish status
    publishStatus,
    setPublishStatus,
    // Special Ad Categories
    specialAdCategories,
  } = useMetaAdsWizardStore()

  // Determine if using new AI flow (AI-generated images were created and approved)
  const isUsingAIFlow = approvedImages.length > 0

  // T070: Extract diversity data from generated images for DiversityPreview
  const diversityData = useMemo(() => {
    const images = generatedImages.filter((img) => img.status === 'completed')
    const conceptsUsed = images
      .map((img) => (img as GeneratedImageWithConcept).conceptUsed)
      .filter((c): c is NonNullable<typeof c> => c != null)
    const modelsUsed = images
      .map((img) => img.model)
      .filter((m): m is string => !!m)
    const backgroundsUsed = images
      .map((img) => (img as GeneratedImageWithConcept).backgroundStyle)
      .filter((b): b is string => !!b)

    return { conceptsUsed, modelsUsed, backgroundsUsed }
  }, [generatedImages])

  const handleEdit = (step: MetaWizardStep) => {
    goToStep(step)
  }

  // Required steps for campaign validation
  // For AI flow: articles, adsets_config, account, page, instagram, objective, targeting, budget, creative_ai, creative_approval, ad_copy
  // For legacy flow: account, page, instagram, objective, targeting, budget, creative, ad_copy
  const requiredSteps: MetaWizardStep[] = isUsingAIFlow
    ? [
        'articles',
        'adsets_config',
        'account',
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
        'page',
        'instagram',
        'objective',
        'targeting',
        'budget',
        'creative',
        'ad_copy',
      ]

  const allStepsComplete = requiredSteps.every((step) => completedSteps.has(step))

  // Calculate total images - prefer new AI flow if available
  const totalImages = isUsingAIFlow
    ? approvedImages.length
    : driveImages.length + aiGeneratedImages.length

  // Get the ad copy for display - resolve shared vs individual mode
  const firstApprovedImage = approvedImages[0]
  const firstAdCopy = adCopyApplyMode === 'shared' && sharedAdCopy
    ? sharedAdCopy
    : firstApprovedImage ? adCopyMap.get(firstApprovedImage.id) : null

  // Get creative source label
  const getCreativeSourceLabel = () => {
    if (isUsingAIFlow) {
      return 'IA (configurado pelo admin)'
    }
    return creativeMode === 'google_drive' ? 'Google Drive' : 'IA'
  }

  return (
    <div className={styles.stepContent}>
      {/* Status Banner */}
      <div className={styles.section} style={{
        background: allStepsComplete ? 'var(--color-success-alpha-10)' : 'var(--color-warning-alpha-10)',
        border: `1px solid ${allStepsComplete ? 'var(--color-success)' : 'var(--color-warning)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {allStepsComplete ? (
            <>
              <Check size={24} style={{ color: 'var(--color-success)' }} />
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Pronto para publicar!</h4>
                <p style={{ margin: 0, font: 'var(--font-body-sm)', color: 'var(--color-text-secondary)' }}>
                  Todas as etapas foram concluídas. Revise as informações abaixo.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
              <div>
                <h4 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Algumas etapas estão incompletas</h4>
                <p style={{ margin: 0, font: 'var(--font-body-sm)', color: 'var(--color-text-secondary)' }}>
                  Complete todas as etapas para poder publicar a campanha.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Publish Status Selection */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Status ao Publicar</h3>
        <p className={styles.sectionDescription}>
          Escolha se a campanha será publicada ativa (começará a veicular imediatamente) ou pausada (você ativa manualmente depois)
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={() => setPublishStatus('ACTIVE')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              background: publishStatus === 'ACTIVE' ? 'var(--color-success-alpha-10)' : 'var(--color-bg-secondary)',
              border: `2px solid ${publishStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Play size={24} style={{ color: publishStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-secondary)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: publishStatus === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                Ativa
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Começa a veicular imediatamente
              </div>
            </div>
            {publishStatus === 'ACTIVE' && (
              <Check size={20} style={{ color: 'var(--color-success)', marginLeft: 'auto' }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPublishStatus('PAUSED')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              background: publishStatus === 'PAUSED' ? 'var(--color-warning-alpha-10)' : 'var(--color-bg-secondary)',
              border: `2px solid ${publishStatus === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Pause size={24} style={{ color: publishStatus === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-text-secondary)' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 600, color: publishStatus === 'PAUSED' ? 'var(--color-warning)' : 'var(--color-text-primary)' }}>
                Pausada
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Você ativa manualmente depois
              </div>
            </div>
            {publishStatus === 'PAUSED' && (
              <Check size={20} style={{ color: 'var(--color-warning)', marginLeft: 'auto' }} />
            )}
          </button>
        </div>
      </div>

      {/* Account */}
      <ReviewSection
        title={STEP_LABELS.account}
        icon={<Building2 size={20} />}
        isComplete={completedSteps.has('account')}
        step="account"
        onEdit={handleEdit}
      >
        {accounts.length > 0 ? (
          <div className={styles.selectedItemsList}>
            {accounts.map((acc) => (
              <div key={acc.id} className={styles.selectedItemChip}>
                <span>{acc.name || acc.accountId}</span>
              </div>
            ))}
          </div>
        ) : (
          <ReviewItem label="Conta" value="" isMissing />
        )}
      </ReviewSection>

      {/* Page */}
      <ReviewSection
        title={STEP_LABELS.page}
        icon={<FileText size={20} />}
        isComplete={completedSteps.has('page')}
        step="page"
        onEdit={handleEdit}
      >
        {pages.length > 0 ? (
          <div className={styles.selectedItemsList}>
            {pages.map((page) => (
              <div key={page.id} className={styles.selectedItemChip}>
                <span>{page.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <ReviewItem label="Página" value="" isMissing />
        )}
      </ReviewSection>

      {/* Instagram */}
      <ReviewSection
        title={STEP_LABELS.instagram}
        icon={<Instagram size={20} />}
        isComplete={completedSteps.has('instagram')}
        step="instagram"
        onEdit={handleEdit}
      >
        <ReviewItem
          label="Conta Instagram"
          value={instagramAccount ? `@${instagramAccount.username}` : 'Não vinculado (opcional)'}
        />
      </ReviewSection>

      {/* Objective */}
      <ReviewSection
        title={STEP_LABELS.objective}
        icon={<Target size={20} />}
        isComplete={completedSteps.has('objective')}
        step="objective"
        onEdit={handleEdit}
      >
        <ReviewItem label="Nome da Campanha" value={templateName} isMissing={!templateName} />
        <ReviewItem
          label="Objetivo"
          value={objective ? OBJECTIVE_LABELS[objective] || objective : ''}
          isMissing={!objective}
        />
        {destinationType && (
          <ReviewItem label="Local de Conversão" value={destinationType} />
        )}
        {optimizationGoal && (
          <ReviewItem label="Meta de Desempenho" value={optimizationGoal} />
        )}
        {conversionEvent && (
          <ReviewItem label="Evento de Conversão" value={conversionEvent} />
        )}
      </ReviewSection>

      {/* Special Ad Categories (show only if selected) */}
      {specialAdCategories.length > 0 && (
        <ReviewSection
          title="Categoria Especial"
          icon={<Shield size={20} />}
          isComplete={true}
          step="objective"
          onEdit={handleEdit}
        >
          <ReviewItem
            label="Categorias"
            value={specialAdCategories.map(cat => {
              const catInfo = META_SPECIAL_AD_CATEGORIES.find(c => c.value === cat)
              return catInfo?.label || cat
            }).join(', ')}
          />
          <ReviewItem
            label="País"
            value={targeting.countries.length > 0 ? `${targeting.countries.join(', ')  } (da segmentação)` : ''}
            isMissing={targeting.countries.length === 0}
          />
          <div style={{
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-warning-alpha-10)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}>
            <AlertTriangle size={14} />
            <span>Restrições de targeting aplicadas automaticamente pela Meta</span>
          </div>
        </ReviewSection>
      )}

      {/* Targeting */}
      <ReviewSection
        title={STEP_LABELS.targeting}
        icon={<Users size={20} />}
        isComplete={completedSteps.has('targeting')}
        step="targeting"
        onEdit={handleEdit}
      >
        <ReviewItem label="Idade" value={`${targeting.ageMin} - ${targeting.ageMax === 65 ? '65+' : targeting.ageMax} anos`} />
        <ReviewItem
          label="Gênero"
          value={
            targeting.genders.includes(0)
              ? 'Todos'
              : targeting.genders.map((g) => (g === 1 ? 'Masculino' : 'Feminino')).join(', ')
          }
        />
        <ReviewItem
          label="Países"
          value={targeting.countries.length > 0 ? targeting.countries.join(', ') : ''}
          isMissing={targeting.countries.length === 0}
        />
        <ReviewItem
          label="Idiomas"
          value={targeting.languages.length > 0 ? targeting.languages.map((l) => l.name).join(', ') : ''}
          isMissing={targeting.languages.length === 0}
        />
      </ReviewSection>

      {/* Budget */}
      <ReviewSection
        title={STEP_LABELS.budget}
        icon={<DollarSign size={20} />}
        isComplete={completedSteps.has('budget')}
        step="budget"
        onEdit={handleEdit}
      >
        <ReviewItem
          label={budget.type === 'daily' ? 'Orçamento Diário' : 'Orçamento Total'}
          value={formatCurrency(budget.amount)}
          isMissing={budget.amount <= 0}
        />
        <ReviewItem
          label="Estratégia de Lances"
          value={
            budget.bidStrategy === 'LOWEST_COST_WITHOUT_CAP'
              ? 'Menor Custo'
              : budget.bidStrategy === 'COST_CAP'
                ? 'Custo por Resultado'
                : budget.bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS'
                  ? 'ROAS Mínimo'
                  : 'Limite de Lance'
          }
        />
        {budget.bidStrategy === 'COST_CAP' && budget.costPerResult && (
          <ReviewItem label="Custo por Resultado" value={formatCurrency(budget.costPerResult)} />
        )}
        {budget.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' && budget.bidCap && (
          <ReviewItem label="Limite de Lance" value={formatCurrency(budget.bidCap)} />
        )}
        {budget.bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' && budget.minRoas && (
          <ReviewItem label="ROAS Mínimo" value={`${budget.minRoas}x`} />
        )}
      </ReviewSection>

      {/* Creative */}
      <ReviewSection
        title={STEP_LABELS.creative}
        icon={<Image size={20} />}
        isComplete={completedSteps.has('creative')}
        step="creative"
        onEdit={handleEdit}
      >
        <ReviewItem
          label="Fonte"
          value={getCreativeSourceLabel()}
        />
        <ReviewItem
          label="Imagens"
          value={totalImages > 0 ? `${totalImages} ${totalImages === 1 ? 'imagem aprovada' : 'imagens aprovadas'}` : ''}
          isMissing={totalImages === 0}
        />
        {isUsingAIFlow && imageConfig.format && (
          <ReviewItem
            label="Formato"
            value={imageConfig.format === '1:1' ? 'Quadrado (Feed)' : imageConfig.format === '9:16' ? 'Vertical (Stories)' : 'Paisagem'}
          />
        )}
        {totalImages > 0 && (
          <div className={styles.creativeGrid} style={{ marginTop: 'var(--space-3)' }}>
            {isUsingAIFlow ? (
              // Show approved images from new AI flow
              approvedImages.slice(0, 4).map((img) => (
                <div key={img.id} className={styles.creativeCard} style={{ maxHeight: '100px' }}>
                  <img src={img.imageUrl} alt={`Criativo aprovado`} style={{ objectFit: 'cover' }} />
                </div>
              ))
            ) : (
              // Fallback to old flow images
              <>
                {driveImages.slice(0, 4).map((img) => (
                  <div key={img.id} className={styles.creativeCard} style={{ maxHeight: '100px' }}>
                    <img src={img.url} alt={img.name} style={{ objectFit: 'cover' }} />
                  </div>
                ))}
                {aiGeneratedImages.slice(0, 4).map((img) => (
                  <div key={img.id} className={styles.creativeCard} style={{ maxHeight: '100px' }}>
                    <img src={img.url} alt="AI Generated" style={{ objectFit: 'cover' }} />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {totalImages > 4 && (
          <p style={{ font: 'var(--font-body-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
            +{totalImages - 4} mais imagens
          </p>
        )}
      </ReviewSection>

      {/* T070: Diversity Preview (compact mode for review step) */}
      {isUsingAIFlow && diversityMetrics && diversityMetrics.totalGenerated > 0 && (
        <DiversityPreview
          metrics={diversityMetrics}
          conceptsUsed={diversityData.conceptsUsed}
          modelsUsed={diversityData.modelsUsed}
          backgroundsUsed={diversityData.backgroundsUsed}
          detectedNiche={detectedNiche ?? undefined}
          compact
        />
      )}

      {/* Ad Copy */}
      <ReviewSection
        title={STEP_LABELS.ad_copy}
        icon={<Type size={20} />}
        isComplete={completedSteps.has('ad_copy')}
        step="ad_copy"
        onEdit={handleEdit}
      >
        {isUsingAIFlow && firstAdCopy ? (
          // Show ad copy from new AI flow
          <>
            <ReviewItem
              label="Texto Principal"
              value={firstAdCopy.primaryText?.substring(0, 50) + (firstAdCopy.primaryText?.length > 50 ? '...' : '')}
              isMissing={!firstAdCopy.primaryText}
            />
            <ReviewItem label="Título" value={firstAdCopy.headline} isMissing={!firstAdCopy.headline} />
            <ReviewItem label="Descrição" value={firstAdCopy.description} isMissing={!firstAdCopy.description} />
            <ReviewItem label="CTA" value={CTA_LABELS[firstAdCopy.cta] || firstAdCopy.cta} isMissing={!firstAdCopy.cta} />
            {adCopyApplyMode === 'shared' && approvedImages.length > 1 && (
              <p style={{ font: 'var(--font-body-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                Texto único aplicado a {approvedImages.length} criativos
              </p>
            )}
            {adCopyApplyMode === 'individual' && adCopyMap.size > 1 && (
              <p style={{ font: 'var(--font-body-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
                +{adCopyMap.size - 1} textos adicionais para outros criativos
              </p>
            )}
            {/* Show destination URL from selected articles */}
            {selectedArticles.length > 0 && selectedArticles[0].url && (
              <ReviewItem
                label="URL de Destino"
                value={
                  <a href={selectedArticles[0].url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selectedArticles[0].url.replace(/^https?:\/\//, '').substring(0, 30)}
                    <ExternalLink size={12} />
                  </a>
                }
              />
            )}
          </>
        ) : (
          // Fallback to old flow ad copy
          <>
            <ReviewItem label="Texto Principal" value={adCopy.primaryText?.substring(0, 50) + (adCopy.primaryText?.length > 50 ? '...' : '')} isMissing={!adCopy.primaryText} />
            <ReviewItem label="Título" value={adCopy.headline} isMissing={!adCopy.headline} />
            <ReviewItem label="Descrição" value={adCopy.description} isMissing={!adCopy.description} />
            <ReviewItem label="CTA" value={CTA_LABELS[adCopy.callToAction] || adCopy.callToAction} isMissing={!adCopy.callToAction} />
            <ReviewItem
              label="URL de Destino"
              value={
                adCopy.destinationUrl ? (
                  <a href={adCopy.destinationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {adCopy.displayUrl || adCopy.destinationUrl.replace(/^https?:\/\//, '').substring(0, 30)}
                    <ExternalLink size={12} />
                  </a>
                ) : ''
              }
              isMissing={!adCopy.destinationUrl}
            />
          </>
        )}
      </ReviewSection>

      {/* Greeting / Ice Breakers (Message Ads only) */}
      {isMessagingDestination(destinationType) && sharedGreeting && greetingApplyMode === 'shared' && (
        <ReviewSection
          title="Configurador de Conversa"
          icon={<MessageCircle size={20} />}
          isComplete={sharedGreeting.status === 'approved'}
          step="ad_copy"
          onEdit={handleEdit}
        >
          <ReviewItem
            label="Saudação"
            value={sharedGreeting.greeting}
            isMissing={!sharedGreeting.greeting}
          />
          {sharedGreeting.iceBreakers.map((ib, idx) => (
            <ReviewItem
              key={idx}
              label={`Pergunta ${idx + 1}`}
              value={ib.title}
            />
          ))}
        </ReviewSection>
      )}
    </div>
  )
}
