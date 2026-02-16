import { useMemo, useState, useCallback, useRef } from 'react'
import { Columns3 } from 'lucide-react'
import { Spinner, Tooltip } from '@/shared/components'
import { useColumnResize, useColumnReorder } from '@/shared/hooks'
import styles from './CampaignTable.module.css'
import { useCampaignHierarchy, type AdGroup } from '../../api/mutations'
import type { CampaignMetrics, AlertType } from '../../types'

// Extended type to store hierarchy data with URL tracking info
interface CampaignHierarchyData {
  adGroups: AdGroup[]
  trackingUrlTemplate?: string
  finalUrlSuffix?: string
}

// Ad Manager metrics for matching with campaigns
export interface AdManagerLandUriMetrics {
  landUri: string
  revenue: number // In USD
  impressions: number
  clicks: number
  ecpm: number
  ctr: number
}

interface CampaignTableProps {
  campaigns: CampaignMetrics[]
  isLoading?: boolean
  onPause?: (campaign: CampaignMetrics) => void
  onEnable?: (campaign: CampaignMetrics) => void
  onEditBudget?: (campaign: CampaignMetrics) => void
  onEditBid?: (campaign: CampaignMetrics) => void
  onDuplicate?: (campaign: CampaignMetrics) => void
  // Ad Manager integration
  adManagerMetrics?: AdManagerLandUriMetrics[]
  showAdManagerColumns?: boolean
  // Date range for expand queries
  startDate?: string
  endDate?: string
}

type SortableField = 'name' | 'connectionName' | 'status' | 'budget' | 'biddingStrategyType' | 'impressions' | 'clicks' | 'ctr' | 'cost' | 'conversions' | 'cpa' | 'roas'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  key: SortableField
  direction: SortDirection
}

const COLUMN_CONFIG: Array<{
  key: SortableField
  label: string
  align?: 'left' | 'right'
  tooltip?: string
  minWidth: number
  defaultWidth: number
}> = [
  { key: 'name', label: 'Campanha', align: 'left', tooltip: 'Nome da campanha no Google Ads', minWidth: 150, defaultWidth: 200 },
  { key: 'connectionName', label: 'Conta', align: 'left', tooltip: 'Conta Google Ads vinculada', minWidth: 100, defaultWidth: 140 },
  { key: 'status', label: 'Status', align: 'left', tooltip: 'Status atual da campanha (Ativa, Pausada, etc)', minWidth: 70, defaultWidth: 90 },
  { key: 'budget', label: 'Orçamento', align: 'right', tooltip: 'Orçamento diário configurado para a campanha', minWidth: 80, defaultWidth: 110 },
  { key: 'biddingStrategyType', label: 'Estratégia', align: 'left', tooltip: 'Estratégia de lances automáticos (CPA, ROAS, Max Cliques, etc)', minWidth: 90, defaultWidth: 120 },
  { key: 'impressions', label: 'Impressões', align: 'right', tooltip: 'Quantidade de vezes que o anúncio foi exibido', minWidth: 80, defaultWidth: 100 },
  { key: 'clicks', label: 'Cliques', align: 'right', tooltip: 'Quantidade de cliques recebidos nos anúncios', minWidth: 60, defaultWidth: 80 },
  { key: 'ctr', label: 'CTR', align: 'right', tooltip: 'Click-Through Rate - Taxa de cliques (Cliques / Impressões × 100)', minWidth: 50, defaultWidth: 70 },
  { key: 'cost', label: 'Custo', align: 'right', tooltip: 'Valor total gasto com a campanha no período', minWidth: 70, defaultWidth: 100 },
  { key: 'conversions', label: 'Conversões', align: 'right', tooltip: 'Quantidade de ações de conversão (vendas, leads, etc)', minWidth: 80, defaultWidth: 100 },
  { key: 'cpa', label: 'CPA', align: 'right', tooltip: 'Cost Per Acquisition - Custo médio por conversão', minWidth: 60, defaultWidth: 80 },
  { key: 'roas', label: 'ROAS', align: 'right', tooltip: 'Return On Ad Spend - Retorno sobre o investimento em anúncios (Receita / Custo)', minWidth: 60, defaultWidth: 80 },
]

// Map bidding strategy types to user-friendly labels
function getBiddingStrategyLabel(strategyType?: string): string {
  if (!strategyType) return '-'

  const labels: Record<string, string> = {
    'MANUAL_CPC': 'CPC Manual',
    'TARGET_CPA': 'CPA Alvo',
    'TARGET_ROAS': 'ROAS Alvo',
    'MAXIMIZE_CONVERSIONS': 'Max. Conversões',
    'MAXIMIZE_CONVERSION_VALUE': 'Max. Valor',
    'TARGET_SPEND': 'Max. Cliques',
    'TARGET_IMPRESSION_SHARE': 'Impressões',
    'ENHANCED_CPC': 'CPC Otimizado',
  }

  return labels[strategyType] || strategyType
}

// Get additional info for bidding strategy (target CPA or ROAS value)
function getBiddingStrategyInfo(campaign: CampaignMetrics): string | null {
  if (campaign.targetCpa && campaign.targetCpa > 0) {
    return `CPA: ${formatCurrency(campaign.targetCpa)}`
  }
  if (campaign.targetRoas && campaign.targetRoas > 0) {
    return `ROAS: ${campaign.targetRoas.toFixed(1)}x`
  }
  return null
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

/**
 * Try to match a campaign with Ad Manager land_uri data
 * Uses fuzzy matching based on campaign name containing parts of the land_uri path
 */
function findMatchingAdManagerMetrics(
  campaignName: string,
  adManagerMetrics?: AdManagerLandUriMetrics[]
): AdManagerLandUriMetrics | null {
  if (!adManagerMetrics || adManagerMetrics.length === 0) return null

  // Normalize campaign name for matching
  const normalizedName = campaignName.toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Try to find a match
  for (const metric of adManagerMetrics) {
    // Extract meaningful parts from land_uri (e.g., "/en/some-page-slug" -> "some page slug")
    const pathParts = metric.landUri
      .replace(/^\/[a-z]{2}\//, '/') // Remove language prefix like /en/ or /pt/
      .replace(/^\//, '') // Remove leading slash
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim()

    if (!pathParts) continue

    // Check if campaign name contains significant parts of the path
    const pathWords = pathParts.split(' ').filter(w => w.length > 3)
    const matchingWords = pathWords.filter(word => normalizedName.includes(word))

    // Consider a match if at least 50% of significant words match
    if (pathWords.length > 0 && matchingWords.length >= Math.ceil(pathWords.length * 0.5)) {
      return metric
    }

    // Also check if the land_uri path is contained in the campaign name
    if (normalizedName.includes(pathParts) || pathParts.includes(normalizedName.split(' ').slice(0, 3).join(' '))) {
      return metric
    }
  }

  return null
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function getAlertTitle(alert: AlertType): string {
  switch (alert) {
    case 'low_ctr':
      return 'CTR baixo'
    case 'high_cpa':
      return 'CPA alto'
    case 'no_conversions':
      return 'Sem conversões'
    case 'budget_depleted':
      return 'Orçamento esgotado'
    default:
      return ''
  }
}

function getAlertIcon(alert: AlertType): string {
  switch (alert) {
    case 'low_ctr':
      return '↓'
    case 'high_cpa':
      return '$'
    case 'no_conversions':
      return '0'
    case 'budget_depleted':
      return '!'
    default:
      return ''
  }
}

function getAlertStyle(alert: AlertType): string {
  switch (alert) {
    case 'low_ctr':
      return styles.alertLowCtr
    case 'high_cpa':
      return styles.alertHighCpa
    case 'no_conversions':
      return styles.alertNoConversions
    case 'budget_depleted':
      return styles.alertBudgetDepleted
    default:
      return ''
  }
}

// Format ad group type to user-friendly label with tooltip
function getAdGroupTypeLabel(type?: string): { label: string; isDynamic: boolean; tooltip: string } {
  if (!type) return { label: 'Padrão', isDynamic: false, tooltip: 'Grupo de anúncios padrão' }

  const isDynamic = type.includes('DYNAMIC')

  const typeInfo: Record<string, { label: string; tooltip: string }> = {
    'SEARCH_STANDARD': {
      label: 'Search',
      tooltip: 'Grupo de anúncios de pesquisa padrão. Você define manualmente as palavras-chave e os anúncios são exibidos quando usuários pesquisam esses termos.',
    },
    'SEARCH_DYNAMIC_ADS': {
      label: 'DSA',
      tooltip: 'Dynamic Search Ads - O Google gera automaticamente os títulos dos anúncios com base no conteúdo do seu site. Você só precisa definir as descrições.',
    },
    'DISPLAY_STANDARD': {
      label: 'Display',
      tooltip: 'Anúncios de display padrão. Exibidos em sites parceiros do Google, apps e YouTube.',
    },
    'SHOPPING_PRODUCT_ADS': {
      label: 'Shopping',
      tooltip: 'Anúncios de Shopping que mostram seus produtos com imagem, preço e nome da loja diretamente nos resultados de pesquisa.',
    },
    'SHOPPING_SHOWCASE_ADS': {
      label: 'Showcase',
      tooltip: 'Anúncios de vitrine que agrupam produtos relacionados para usuários que pesquisam termos genéricos.',
    },
    'HOTEL_ADS': {
      label: 'Hotel',
      tooltip: 'Anúncios específicos para hotéis que aparecem no Google Hotel Search e Google Maps.',
    },
    'SHOPPING_SMART_ADS': {
      label: 'Smart Shopping',
      tooltip: 'Campanhas inteligentes de Shopping que usam machine learning para otimizar lances e posicionamentos automaticamente.',
    },
    'VIDEO_BUMPER': {
      label: 'Bumper',
      tooltip: 'Anúncios de vídeo curtos (até 6 segundos) não puláveis. Ideais para alcance e reconhecimento de marca.',
    },
    'VIDEO_TRUE_VIEW_IN_STREAM': {
      label: 'TrueView',
      tooltip: 'Anúncios de vídeo puláveis que aparecem antes, durante ou após vídeos no YouTube. Você só paga quando o usuário assiste.',
    },
    'VIDEO_TRUE_VIEW_IN_DISPLAY': {
      label: 'Discovery',
      tooltip: 'Anúncios de vídeo que aparecem em resultados de pesquisa do YouTube e na página inicial.',
    },
    'VIDEO_NON_SKIPPABLE_IN_STREAM': {
      label: 'Non-Skip',
      tooltip: 'Anúncios de vídeo não puláveis de até 15 segundos. Garantem que toda a mensagem seja vista.',
    },
    'VIDEO_OUTSTREAM': {
      label: 'Outstream',
      tooltip: 'Anúncios de vídeo exibidos fora do YouTube, em sites e apps parceiros do Google.',
    },
    'VIDEO_RESPONSIVE': {
      label: 'Video Resp.',
      tooltip: 'Anúncios de vídeo responsivos que se adaptam a diferentes formatos e posicionamentos.',
    },
    'SMART_CAMPAIGN_ADS': {
      label: 'Smart',
      tooltip: 'Campanhas inteligentes totalmente automatizadas pelo Google. Ideais para pequenos negócios.',
    },
    'APP_PRE_REGISTRATION_ADS': {
      label: 'App Pre-Reg',
      tooltip: 'Anúncios para pré-registro de apps antes do lançamento na Play Store.',
    },
    'APP_AD': {
      label: 'App',
      tooltip: 'Anúncios para promover instalações e engajamento com seu aplicativo.',
    },
    'DISCOVERY_CAROUSEL_ADS': {
      label: 'Carousel',
      tooltip: 'Anúncios em carrossel que permitem mostrar múltiplas imagens ou produtos.',
    },
    'DISCOVERY_MULTI_ASSET_ADS': {
      label: 'Multi-Asset',
      tooltip: 'Anúncios Discovery que combinam múltiplos assets (imagens, títulos, descrições) para criar anúncios otimizados.',
    },
    'TRAVEL_ADS': {
      label: 'Travel',
      tooltip: 'Anúncios específicos para o setor de viagens e turismo.',
    },
    'UNKNOWN': {
      label: 'Desconhecido',
      tooltip: 'Tipo de grupo de anúncios não identificado.',
    },
  }

  const info = typeInfo[type] || { label: type.replace(/_/g, ' '), tooltip: `Tipo de grupo de anúncios: ${type}` }

  return {
    label: info.label,
    isDynamic,
    tooltip: info.tooltip,
  }
}

// Format ad type to user-friendly label with tooltip and style class
function getAdTypeLabel(type?: string): { label: string; tooltip: string; styleClass: string } {
  if (!type) return { label: '?', tooltip: 'Tipo de anúncio não identificado', styleClass: 'typeStandard' }

  const typeInfo: Record<string, { label: string; tooltip: string; styleClass: string }> = {
    'RESPONSIVE_SEARCH_AD': {
      label: 'RSA',
      tooltip: 'Responsive Search Ad - Anúncio de pesquisa responsivo. Você fornece múltiplos títulos e descrições, e o Google combina automaticamente para criar o melhor anúncio.',
      styleClass: 'typeRSA',
    },
    'EXPANDED_TEXT_AD': {
      label: 'ETA',
      tooltip: 'Expanded Text Ad - Anúncio de texto expandido (formato legado). Possui 3 títulos e 2 descrições fixas. Este formato está sendo descontinuado pelo Google.',
      styleClass: 'typeETA',
    },
    'EXPANDED_DYNAMIC_SEARCH_AD': {
      label: 'DSA',
      tooltip: 'Dynamic Search Ad - Os títulos são gerados AUTOMATICAMENTE pelo Google com base no conteúdo do seu site. Você só define as descrições. Ideal para sites com muitas páginas.',
      styleClass: 'typeDSA',
    },
    'CALL_AD': {
      label: 'Call',
      tooltip: 'Anúncio de chamada que incentiva usuários a ligar diretamente para seu negócio. Exibe número de telefone clicável em dispositivos móveis.',
      styleClass: 'typeStandard',
    },
    'RESPONSIVE_DISPLAY_AD': {
      label: 'RDA',
      tooltip: 'Responsive Display Ad - Anúncio de display responsivo que se adapta automaticamente a diferentes tamanhos e formatos na Rede de Display.',
      styleClass: 'typeDisplay',
    },
    'IMAGE_AD': {
      label: 'Imagem',
      tooltip: 'Anúncio de imagem estática para a Rede de Display. Você controla exatamente como o anúncio aparece.',
      styleClass: 'typeDisplay',
    },
    'VIDEO_AD': {
      label: 'Vídeo',
      tooltip: 'Anúncio de vídeo para YouTube e Rede de Display. Pode ser pulável ou não-pulável.',
      styleClass: 'typeVideo',
    },
    'VIDEO_RESPONSIVE_AD': {
      label: 'Video Resp.',
      tooltip: 'Anúncio de vídeo responsivo que se adapta a diferentes formatos e posicionamentos automaticamente.',
      styleClass: 'typeVideo',
    },
    'SHOPPING_PRODUCT_AD': {
      label: 'Shopping',
      tooltip: 'Anúncio de Shopping que mostra seu produto com imagem, preço e nome da loja diretamente nos resultados de pesquisa.',
      styleClass: 'typeShopping',
    },
    'SHOPPING_COMPARISON_LISTING_AD': {
      label: 'Comparação',
      tooltip: 'Anúncio de comparação de preços do Shopping que agrupa ofertas de diferentes vendedores.',
      styleClass: 'typeShopping',
    },
    'APP_AD': {
      label: 'App',
      tooltip: 'Anúncio para promover instalações do seu aplicativo. Exibido em Pesquisa, Play Store e YouTube.',
      styleClass: 'typeStandard',
    },
    'APP_ENGAGEMENT_AD': {
      label: 'App Eng.',
      tooltip: 'Anúncio para engajamento com usuários que já têm seu app instalado. Incentiva ações específicas dentro do app.',
      styleClass: 'typeStandard',
    },
    'APP_PRE_REGISTRATION_AD': {
      label: 'Pre-Reg',
      tooltip: 'Anúncio de pré-registro para apps antes do lançamento na Play Store. Permite capturar interesse antecipadamente.',
      styleClass: 'typeStandard',
    },
    'DISCOVERY_MULTI_ASSET_AD': {
      label: 'Discovery',
      tooltip: 'Anúncio Discovery que aparece no Gmail, YouTube e feed do Google. Combina múltiplos assets para criar anúncios otimizados.',
      styleClass: 'typeDisplay',
    },
    'DISCOVERY_CAROUSEL_AD': {
      label: 'Carousel',
      tooltip: 'Anúncio Discovery em formato carrossel com múltiplas imagens. Ideal para mostrar diferentes produtos ou características.',
      styleClass: 'typeDisplay',
    },
    'SMART_CAMPAIGN_AD': {
      label: 'Smart',
      tooltip: 'Anúncio de campanha inteligente totalmente automatizado pelo Google. Ideal para pequenos negócios sem experiência em anúncios.',
      styleClass: 'typeStandard',
    },
    'LOCAL_AD': {
      label: 'Local',
      tooltip: 'Anúncio local para promover sua loja física. Aparece em Google Maps e resultados de pesquisa local.',
      styleClass: 'typeStandard',
    },
    'HOTEL_AD': {
      label: 'Hotel',
      tooltip: 'Anúncio de hotel que aparece no Google Hotel Search e Maps. Mostra preços, disponibilidade e permite reservas.',
      styleClass: 'typeStandard',
    },
    'TRAVEL_AD': {
      label: 'Viagem',
      tooltip: 'Anúncio do setor de viagens. Exibido para usuários pesquisando destinos e atividades.',
      styleClass: 'typeStandard',
    },
    'DEMAND_GEN_PRODUCT_AD': {
      label: 'Demand Gen',
      tooltip: 'Anúncio de geração de demanda para produtos. Combina formatos de vídeo e imagem para maximizar alcance.',
      styleClass: 'typeDisplay',
    },
    'UNKNOWN': {
      label: '?',
      tooltip: 'Tipo de anúncio não identificado.',
      styleClass: 'typeStandard',
    },
  }

  const info = typeInfo[type] || {
    label: type.replace(/_/g, ' ').substring(0, 12),
    tooltip: `Tipo de anúncio: ${type}`,
    styleClass: 'typeStandard'
  }
  return info
}

export function CampaignTable({
  campaigns,
  isLoading,
  onPause,
  onEnable,
  onEditBudget,
  onEditBid,
  adManagerMetrics,
  showAdManagerColumns = false,
  startDate,
  endDate,
}: CampaignTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'cost', direction: 'desc' })

  // Table ref for resize functionality
  const tableRef = useRef<HTMLTableElement>(null)

  // Initialize column widths
  const initialWidths = useMemo(() => {
    return COLUMN_CONFIG.reduce((acc, col) => {
      acc[col.key] = col.defaultWidth
      return acc
    }, {} as Record<string, number>)
  }, [])

  // Column resize with auto-fit on double-click
  const { columnWidths, handleMouseDown, handleDoubleClick, autoFitAllColumns } = useColumnResize(
    initialWidths,
    tableRef,
    COLUMN_CONFIG.map(c => ({ key: c.key, minWidth: c.minWidth }))
  )

  // Column reorder with drag and drop
  const {
    columnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(COLUMN_CONFIG.map(c => c.key))

  // Reorder columns based on drag state
  const orderedColumns = useMemo(() => {
    return [...COLUMN_CONFIG].sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.key)
      const bIndex = columnOrder.indexOf(b.key)
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [columnOrder])

  // Expand state management (following revenue-dashboard pattern)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [hierarchyData, setHierarchyData] = useState<Map<string, CampaignHierarchyData>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null)
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set())
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set())

  // Hook for fetching hierarchy data
  const hierarchyMutation = useCampaignHierarchy()

  // Pre-compute Ad Manager matches for all campaigns
  const campaignAdManagerMap = useMemo(() => {
    if (!showAdManagerColumns || !adManagerMetrics) return new Map<string, AdManagerLandUriMetrics | null>()

    const map = new Map<string, AdManagerLandUriMetrics | null>()
    for (const campaign of campaigns) {
      map.set(campaign.id, findMatchingAdManagerMetrics(campaign.name, adManagerMetrics))
    }
    return map
  }, [campaigns, adManagerMetrics, showAdManagerColumns])

  const sortedCampaigns = useMemo(() => {
    const sorted = [...campaigns].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      const aNum = Number(aValue) || 0
      const bNum = Number(bValue) || 0
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
    })
    return sorted
  }, [campaigns, sortConfig])

  const handleSort = (key: SortableField) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleAction = (campaign: CampaignMetrics) => {
    if (campaign.status === 'ENABLED' && onPause) {
      onPause(campaign)
    } else if (campaign.status === 'PAUSED' && onEnable) {
      onEnable(campaign)
    }
  }

  // Toggle expand for a campaign row
  const handleToggleCampaign = useCallback(async (campaign: CampaignMetrics) => {
    const campaignKey = campaign.id

    // If already expanded, collapse
    if (expandedCampaigns.has(campaignKey)) {
      setExpandedCampaigns(prev => {
        const next = new Set(prev)
        next.delete(campaignKey)
        return next
      })
      // Also collapse any expanded ad groups within this campaign
      setExpandedAdGroups(prev => {
        const next = new Set(prev)
        for (const key of prev) {
          if (key.startsWith(`${campaignKey}:`)) {
            next.delete(key)
          }
        }
        return next
      })
      return
    }

    // If data already cached, just expand
    if (hierarchyData.has(campaignKey)) {
      setExpandedCampaigns(prev => new Set(prev).add(campaignKey))
      return
    }

    // Fetch hierarchy data
    if (!campaign.connectionId) return

    setLoadingExpand(campaignKey)
    try {
      const result = await hierarchyMutation.mutateAsync({
        campaignId: campaign.id,
        connectionId: campaign.connectionId,
        customerId: campaign.customerId,
        loginCustomerId: campaign.loginCustomerId,
        startDate,
        endDate,
      })

      if (result.success && result.adGroups) {
        setHierarchyData(prev => new Map(prev).set(campaignKey, {
          adGroups: result.adGroups!,
          trackingUrlTemplate: result.trackingUrlTemplate,
          finalUrlSuffix: result.finalUrlSuffix,
        }))
        setExpandedCampaigns(prev => new Set(prev).add(campaignKey))
      }
    } catch (error) {
      console.error('Failed to fetch campaign hierarchy:', error)
    } finally {
      setLoadingExpand(null)
    }
  }, [expandedCampaigns, hierarchyData, hierarchyMutation, startDate, endDate])

  // Toggle expand for an ad group row
  const handleToggleAdGroup = useCallback((campaignId: string, adGroupId: string) => {
    const adGroupKey = `${campaignId}:${adGroupId}`
    setExpandedAdGroups(prev => {
      const next = new Set(prev)
      if (next.has(adGroupKey)) {
        next.delete(adGroupKey)
      } else {
        next.add(adGroupKey)
      }
      return next
    })
  }, [])

  // Toggle expand for an ad row (to show creative/copy)
  const handleToggleAd = useCallback((adKey: string) => {
    setExpandedAds(prev => {
      const next = new Set(prev)
      if (next.has(adKey)) {
        next.delete(adKey)
      } else {
        next.add(adKey)
      }
      return next
    })
  }, [])

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>Nenhuma campanha encontrada</p>
      </div>
    )
  }

  const renderSortIcon = (field: SortableField) => {
    if (sortConfig.key !== field) {
      return <span className={styles.sortIcon}>↕</span>
    }
    return (
      <span className={`${styles.sortIcon} ${styles.active}`}>
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const renderBudgetProgress = (percent: number) => {
    let progressClass = ''
    if (percent >= 95) {
      progressClass = styles.danger
    } else if (percent >= 75) {
      progressClass = styles.warning
    }

    return (
      <div className={styles.budgetProgress}>
        <div
          className={`${styles.budgetProgressBar} ${progressClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    )
  }

  return (
    <div className={styles.tableContainer}>
      {/* Toolbar with auto-fit button */}
      <div className={styles.toolbar}>
        <Tooltip content="Ajustar largura de todas as colunas automaticamente">
          <button
            type="button"
            className={styles.autoFitButton}
            onClick={autoFitAllColumns}
            aria-label="Auto-ajustar colunas"
          >
            <Columns3 size={16} />
          </button>
        </Tooltip>
      </div>
      <table className={styles.table} ref={tableRef}>
        <thead>
          <tr>
            {orderedColumns.map((col, index) => (
              <th
                key={col.key}
                data-column-key={col.key}
                draggable
                onDragStart={(e) => handleDragStart(col.key, e)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(col.key, e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(col.key, e)}
                onClick={() => handleSort(col.key)}
                className={`${draggedColumn === col.key ? styles.headerDragging : ''} ${dragOverColumn === col.key ? styles.headerDragOver : ''}`}
                style={{
                  textAlign: col.align,
                  cursor: 'pointer',
                  width: columnWidths[col.key] || col.defaultWidth,
                  minWidth: col.minWidth,
                  position: 'relative',
                }}
              >
                <span className={styles.headerContent}>
                  {col.label}
                  {col.tooltip && (
                    <Tooltip content={col.tooltip} position="top">
                      <span className={styles.helpIcon}>?</span>
                    </Tooltip>
                  )}
                  {renderSortIcon(col.key)}
                </span>
                {/* Resize handle with double-click for auto-fit */}
                {index < orderedColumns.length - 1 && (
                  <button
                    type="button"
                    className={styles.resizeHandle}
                    onMouseDown={(e) => handleMouseDown(col.key, e)}
                    onDoubleClick={(e) => handleDoubleClick(col.key, e)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Redimensionar coluna ${col.label}`}
                  />
                )}
              </th>
            ))}
            <th style={{ width: 100 }}>
              <Tooltip content="Alertas de desempenho da campanha" position="top">
                <span>Alertas</span>
              </Tooltip>
            </th>
            {showAdManagerColumns && (
              <>
                <th style={{ textAlign: 'right', backgroundColor: 'var(--color-bg-secondary)' }}>
                  <Tooltip content="Receita estimada do Google Ad Manager associada a esta campanha (USD)" position="top">
                    <span style={{ color: 'var(--color-success)' }}>Receita AM</span>
                  </Tooltip>
                </th>
                <th style={{ textAlign: 'right', backgroundColor: 'var(--color-bg-secondary)' }}>
                  <Tooltip content="Impressões registradas no Ad Manager para páginas desta campanha" position="top">
                    <span style={{ color: 'var(--color-info)' }}>Impr. AM</span>
                  </Tooltip>
                </th>
                <th style={{ textAlign: 'right', backgroundColor: 'var(--color-bg-secondary)' }}>
                  <Tooltip content="eCPM do Ad Manager - Receita a cada 1.000 impressões" position="top">
                    <span style={{ color: 'var(--color-warning)' }}>eCPM AM</span>
                  </Tooltip>
                </th>
              </>
            )}
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {sortedCampaigns.flatMap((campaign) => {
            const isExpanded = expandedCampaigns.has(campaign.id)
            const isLoadingCampaign = loadingExpand === campaign.id
            const campaignHierarchy = hierarchyData.get(campaign.id)
            const adGroups = campaignHierarchy?.adGroups || []
            const trackingUrlTemplate = campaignHierarchy?.trackingUrlTemplate
            const finalUrlSuffix = campaignHierarchy?.finalUrlSuffix

            const rows: React.ReactNode[] = []

            // Campaign row (level 0)
            rows.push(
              <tr key={campaign.id} className={styles.rowLevel0}>
                <td>
                  <div className={styles.campaignNameCell}>
                    <button
                      type="button"
                      className={styles.expandBtn}
                      onClick={() => handleToggleCampaign(campaign)}
                      disabled={isLoadingCampaign}
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {isLoadingCampaign ? (
                        <svg className={styles.spinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                      ) : isExpanded ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                    </button>
                    <div className={styles.campaignNameContent}>
                      <span className={styles.campaignName} title={campaign.name}>
                        {campaign.name}
                      </span>
                      <span className={styles.campaignId} title={`ID: ${campaign.id}`}>
                        #{campaign.id}
                      </span>
                    </div>
                  </div>
                </td>
              <td>
                <span className={styles.accountName} title={campaign.connectionName || campaign.connectionId}>
                  {campaign.connectionName || '-'}
                </span>
              </td>
              <td>
                <span
                  className={`${styles.status} ${
                    campaign.status === 'ENABLED'
                      ? styles.statusEnabled
                      : styles.statusPaused
                  }`}
                >
                  {campaign.status === 'ENABLED' ? 'Ativa' : 'Pausada'}
                </span>
              </td>
              <td className={styles.metricCell}>
                <div className={styles.metricValue}>{formatCurrency(campaign.budget)}</div>
                {renderBudgetProgress(campaign.budgetSpentPercent || 0)}
              </td>
              <td>
                <div className={styles.strategyCell}>
                  <span className={styles.strategyLabel}>
                    {getBiddingStrategyLabel(campaign.biddingStrategyType)}
                  </span>
                  {getBiddingStrategyInfo(campaign) && (
                    <span className={styles.strategyInfo}>
                      {getBiddingStrategyInfo(campaign)}
                    </span>
                  )}
                </div>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatNumber(campaign.impressions)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatNumber(campaign.clicks)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatPercent(campaign.ctr)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatCurrency(campaign.cost)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatNumber(campaign.conversions)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{formatCurrency(campaign.cpa)}</span>
              </td>
              <td className={styles.metricCell}>
                <span className={styles.metricValue}>{campaign.roas.toFixed(2)}x</span>
              </td>
              <td>
                <div className={styles.alerts}>
                  {campaign.alerts?.map((alert) => (
                    <span
                      key={alert}
                      className={`${styles.alertBadge} ${getAlertStyle(alert)}`}
                      title={getAlertTitle(alert)}
                    >
                      {getAlertIcon(alert)}
                    </span>
                  ))}
                </div>
              </td>
              {showAdManagerColumns && (() => {
                const adManagerData = campaignAdManagerMap.get(campaign.id)
                return (
                  <>
                    <td className={styles.metricCell} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      {adManagerData ? (
                        <span className={styles.metricValue} style={{ color: 'var(--color-success)', fontWeight: 600 }} title={`land_uri: ${adManagerData.landUri}`}>
                          {formatUSD(adManagerData.revenue)}
                        </span>
                      ) : (
                        <span className={styles.metricValue} style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td className={styles.metricCell} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      {adManagerData ? (
                        <span className={styles.metricValue}>{formatNumber(adManagerData.impressions)}</span>
                      ) : (
                        <span className={styles.metricValue} style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td className={styles.metricCell} style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                      {adManagerData ? (
                        <span className={styles.metricValue}>{formatUSD(adManagerData.ecpm)}</span>
                      ) : (
                        <span className={styles.metricValue} style={{ color: 'var(--color-text-tertiary)' }}>-</span>
                      )}
                    </td>
                  </>
                )
              })()}
              <td className={styles.actionsCell}>
                <div>
                  {campaign.customerId && (
                    <a
                      href={`https://ads.google.com/aw/campaigns?campaignId=${campaign.id}&ocid=${campaign.customerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no Google Ads"
                      className={styles.actionButton}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAction(campaign)}
                    title={campaign.status === 'ENABLED' ? 'Pausar' : 'Ativar'}
                    className={styles.actionButton}
                  >
                    {campaign.status === 'ENABLED' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                  {onEditBudget && (
                    <button
                      type="button"
                      onClick={() => onEditBudget(campaign)}
                      title="Editar orçamento"
                      className={styles.actionButton}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </button>
                  )}
                  {onEditBid && (
                    <button
                      type="button"
                      onClick={() => onEditBid(campaign)}
                      title="Editar lance"
                      className={styles.actionButton}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
            )

            // Ad Group rows (level 1) - only if expanded
            if (isExpanded && adGroups.length > 0) {
              adGroups.forEach((adGroup) => {
                const adGroupKey = `${campaign.id}:${adGroup.id}`
                const isAdGroupExpanded = expandedAdGroups.has(adGroupKey)
                const hasAds = adGroup.ads && adGroup.ads.length > 0

                // Ad Group row
                const adGroupTypeInfo = getAdGroupTypeLabel(adGroup.type)
                rows.push(
                  <tr key={adGroupKey} className={styles.rowLevel1}>
                    <td colSpan={2}>
                      <div className={styles.adGroupNameCell}>
                        {hasAds && (
                          <button
                            type="button"
                            className={styles.expandBtn}
                            onClick={() => handleToggleAdGroup(campaign.id, adGroup.id)}
                            title={isAdGroupExpanded ? 'Recolher anúncios' : 'Ver anúncios'}
                          >
                            {isAdGroupExpanded ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                          </button>
                        )}
                        {!hasAds && <span style={{ width: 24 }} />}
                        <div className={styles.adGroupNameContent}>
                          <div className={styles.adGroupNameRow}>
                            <span className={styles.adGroupName} title={adGroup.name}>
                              {adGroup.name}
                            </span>
                            <span
                              className={`${styles.adGroupTypeBadge} ${adGroupTypeInfo.isDynamic ? styles.typeDynamic : styles.typeStandard}`}
                              title={adGroupTypeInfo.tooltip}
                            >
                              {adGroupTypeInfo.label}
                            </span>
                          </div>
                          <span className={styles.adGroupMeta}>
                            #{adGroup.id} · CPC: {formatCurrency(adGroup.cpcBid)} · {adGroup.ads?.length || 0} anúncios
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.status} ${styles.statusSmall} ${adGroup.status === 'ENABLED' ? styles.statusEnabled : styles.statusPaused}`}>
                        {adGroup.status === 'ENABLED' ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className={styles.metricCell}>-</td>
                    <td>-</td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatNumber(adGroup.metrics.impressions)}</span>
                    </td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatNumber(adGroup.metrics.clicks)}</span>
                    </td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatPercent(adGroup.metrics.ctr)}</span>
                    </td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatCurrency(adGroup.metrics.cost)}</span>
                    </td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatNumber(adGroup.metrics.conversions)}</span>
                    </td>
                    <td className={styles.metricCell}>
                      <span className={styles.metricValue}>{formatCurrency(adGroup.metrics.cpa)}</span>
                    </td>
                    <td className={styles.metricCell}>-</td>
                    <td>-</td>
                    {showAdManagerColumns && (
                      <>
                        <td className={styles.metricCell}>-</td>
                        <td className={styles.metricCell}>-</td>
                        <td className={styles.metricCell}>-</td>
                      </>
                    )}
                    <td>-</td>
                  </tr>
                )

                // Ad rows (level 2) - only if ad group is expanded
                if (isAdGroupExpanded && hasAds) {
                  adGroup.ads.forEach((ad) => {
                    const adKey = `${adGroupKey}:${ad.id}`
                    const isAdExpanded = expandedAds.has(adKey)
                    const finalUrl = ad.finalUrls?.[0] || ''
                    const headline = ad.headlines?.[0] || ad.name || `Ad ${ad.id}`
                    const hasCreative = (ad.headlines && ad.headlines.length > 0) || (ad.descriptions && ad.descriptions.length > 0)

                    // Ad row
                    rows.push(
                      <tr key={adKey} className={styles.rowLevel2}>
                        <td colSpan={2}>
                          <div className={styles.adNameCell}>
                            {hasCreative ? (
                              <button
                                type="button"
                                className={styles.expandBtn}
                                onClick={() => handleToggleAd(adKey)}
                                title={isAdExpanded ? 'Recolher copy' : 'Ver copy'}
                              >
                                {isAdExpanded ? (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                ) : (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                  </svg>
                                )}
                              </button>
                            ) : (
                              <span style={{ width: 24 }} />
                            )}
                            <div className={styles.adNameContent}>
                              <span className={styles.adName} title={headline}>
                                {headline}
                              </span>
                              {finalUrl && (
                                <a
                                  href={finalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.adUrl}
                                  title={finalUrl}
                                >
                                  {finalUrl.replace(/^https?:\/\//, '').substring(0, 50)}
                                  {finalUrl.length > 60 ? '...' : ''}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.status} ${styles.statusSmall} ${ad.status === 'ENABLED' ? styles.statusEnabled : styles.statusPaused}`}>
                            {ad.status === 'ENABLED' ? 'Ativo' : 'Pausado'}
                          </span>
                        </td>
                        <td className={styles.metricCell}>-</td>
                        <td>
                          {(() => {
                            const adTypeInfo = getAdTypeLabel(ad.type)
                            return (
                              <span
                                className={`${styles.adTypeBadge} ${styles[adTypeInfo.styleClass] || styles.typeStandard}`}
                                title={adTypeInfo.tooltip}
                              >
                                {adTypeInfo.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className={styles.metricCell}>
                          <span className={styles.metricValue}>{formatNumber(ad.metrics.impressions)}</span>
                        </td>
                        <td className={styles.metricCell}>
                          <span className={styles.metricValue}>{formatNumber(ad.metrics.clicks)}</span>
                        </td>
                        <td className={styles.metricCell}>
                          <span className={styles.metricValue}>{formatPercent(ad.metrics.ctr)}</span>
                        </td>
                        <td className={styles.metricCell}>
                          <span className={styles.metricValue}>{formatCurrency(ad.metrics.cost)}</span>
                        </td>
                        <td className={styles.metricCell}>
                          <span className={styles.metricValue}>{formatNumber(ad.metrics.conversions)}</span>
                        </td>
                        <td className={styles.metricCell}>-</td>
                        <td className={styles.metricCell}>-</td>
                        <td>-</td>
                        {showAdManagerColumns && (
                          <>
                            <td className={styles.metricCell}>-</td>
                            <td className={styles.metricCell}>-</td>
                            <td className={styles.metricCell}>-</td>
                          </>
                        )}
                        <td>
                          {finalUrl && (
                            <a
                              href={finalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.actionButton}
                              title="Abrir URL de destino"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
                          )}
                        </td>
                      </tr>
                    )

                    // Ad creative row (level 3) - only if ad is expanded
                    // Also show if we have URLs to display
                    const hasUrlInfo = finalUrl || ad.displayUrl || ad.path1 || ad.path2
                    if (isAdExpanded && (hasCreative || hasUrlInfo)) {
                      // Build display URL preview
                      let displayUrlPreview = ''
                      if (ad.displayUrl) {
                        displayUrlPreview = ad.displayUrl
                      } else if (finalUrl) {
                        try {
                          const urlObj = new URL(finalUrl)
                          displayUrlPreview = urlObj.hostname
                          if (ad.path1) displayUrlPreview += `/${ad.path1}`
                          if (ad.path2) displayUrlPreview += `/${ad.path2}`
                        } catch {
                          displayUrlPreview = finalUrl.replace(/^https?:\/\//, '').split('/')[0]
                        }
                      }

                      rows.push(
                        <tr key={`${adKey}:creative`} className={styles.rowLevel3}>
                          <td colSpan={showAdManagerColumns ? 17 : 14}>
                            <div className={styles.adCreativeContainer}>
                              {/* URL Section - Most important for understanding where the ad goes */}
                              <div className={styles.adCreativeSection}>
                                <span className={styles.adCreativeLabel}>URLs do Anúncio:</span>
                                <div className={styles.adUrlSection}>
                                  {/* DSA ads have dynamic URLs - show explanation */}
                                  {ad.type === 'EXPANDED_DYNAMIC_SEARCH_AD' && !finalUrl && (
                                    <div className={styles.adUrlRow}>
                                      <span className={styles.dsaUrlNote}>
                                        🔄 <strong>URLs Dinâmicas:</strong> As URLs são selecionadas automaticamente pelo Google com base no conteúdo do seu site e na pesquisa do usuário.
                                        O Google escolhe a página mais relevante do seu domínio para cada consulta de pesquisa.
                                      </span>
                                    </div>
                                  )}
                                  {displayUrlPreview && (
                                    <div className={styles.adUrlRow}>
                                      <span className={styles.adUrlLabel}>URL de Exibição:</span>
                                      <span className={styles.adDisplayUrl} title="URL mostrada no anúncio (pode ter paths customizados)">
                                        {displayUrlPreview}
                                      </span>
                                    </div>
                                  )}
                                  {finalUrl && (
                                    <div className={styles.adUrlRow}>
                                      <span className={styles.adUrlLabel}>URL Final:</span>
                                      <a
                                        href={finalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.adFinalUrl}
                                        title="URL real de destino quando o usuário clica"
                                      >
                                        {finalUrl}
                                      </a>
                                    </div>
                                  )}
                                  {ad.finalUrls && ad.finalUrls.length > 1 && (
                                    <div className={styles.adUrlRow}>
                                      <span className={styles.adUrlLabel}>URLs Adicionais:</span>
                                      <div className={styles.adCreativeList}>
                                        {ad.finalUrls.slice(1).map((url: string, i: number) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.adFinalUrl}>
                                            {url}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Campaign URL Settings - Tracking template and final URL suffix */}
                              {/* Only show if at least one is configured - follows minimalist design (Nielsen #8) */}
                              {(trackingUrlTemplate || finalUrlSuffix) && (
                                <div className={styles.adCreativeSection}>
                                  <span className={styles.adCreativeLabel}>
                                    Rastreamento de URL:
                                    <span className={styles.autogenLabel} title="Parâmetros UTM e tracking aplicados automaticamente a todos os cliques desta campanha">
                                      (Campanha)
                                    </span>
                                  </span>
                                  <div className={styles.adUrlSection}>
                                    {trackingUrlTemplate && (
                                      <div className={styles.adUrlRow}>
                                        <span className={styles.adUrlLabel} title="Template de rastreamento que envolve a URL final com parâmetros de tracking">
                                          Tracking Template:
                                        </span>
                                        <code className={styles.trackingTemplate} title="Este template é aplicado a todas as URLs finais da campanha">
                                          {trackingUrlTemplate}
                                        </code>
                                      </div>
                                    )}
                                    {finalUrlSuffix && (
                                      <div className={styles.adUrlRow}>
                                        <span className={styles.adUrlLabel} title="Parâmetros adicionados ao final de cada URL (ex: UTMs)">
                                          Sufixo da URL:
                                        </span>
                                        <code className={styles.trackingTemplate} title="Estes parâmetros são adicionados ao final de todas as URLs">
                                          {finalUrlSuffix}
                                        </code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {ad.headlines && ad.headlines.length > 0 && (
                                <div className={styles.adCreativeSection}>
                                  <span className={styles.adCreativeLabel}>
                                    Headlines ({ad.headlines.length}):
                                    {ad.type === 'EXPANDED_DYNAMIC_SEARCH_AD' && (
                                      <span className={styles.autogenLabel} title="Os headlines de DSA são gerados automaticamente pelo Google">
                                        (Auto-gerados)
                                      </span>
                                    )}
                                  </span>
                                  <div className={styles.adCreativeList}>
                                    {ad.headlines.map((h: string, i: number) => (
                                      <span key={i} className={styles.adHeadline}>{h}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {ad.type === 'EXPANDED_DYNAMIC_SEARCH_AD' && (!ad.headlines || ad.headlines.length === 0) && (
                                <div className={styles.adCreativeSection}>
                                  <span className={styles.adCreativeLabel}>
                                    Headlines:
                                    <span className={styles.autogenLabel} title="DSA usa machine learning para criar títulos relevantes">(Dinâmico)</span>
                                  </span>
                                  <span className={styles.autogenNote}>
                                    Gerados automaticamente pelo Google com base no conteúdo do site e na busca do usuário
                                  </span>
                                </div>
                              )}
                              {ad.descriptions && ad.descriptions.length > 0 && (
                                <div className={styles.adCreativeSection}>
                                  <span className={styles.adCreativeLabel}>Descrições ({ad.descriptions.length}):</span>
                                  <div className={styles.adCreativeList}>
                                    {ad.descriptions.map((d: string, i: number) => (
                                      <span key={i} className={styles.adDescription}>{d}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  })
                }
              })
            }

            return rows
          })}
        </tbody>
      </table>
    </div>
  )
}
