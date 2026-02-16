/**
 * UnifiedCampaignPerformanceTable Component
 *
 * A unified table that displays campaigns from both Google Ads and Meta Ads
 * in the same data structure with platform indicators and expandable hierarchy.
 *
 * Google Ads: Campaign -> Ad Groups -> Ads -> Creative details
 * Meta Ads: Campaign -> Ad Sets -> Ads -> Creative details
 */

import { useMemo, useState, useCallback, useRef, useEffect, type DragEvent } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Pause,
  Play,
  DollarSign,
  Loader2,
  ExternalLink,
  HelpCircle,
  Columns3,
  Search,
  RotateCcw,
  Download,
  MoreVertical,
  Copy,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CampaignMetrics } from '@/features/alvoads-google-dashboard/types'
import {
  Button,
  Checkbox,
  Input,
  PopoverContent,
  PopoverRoot as Popover,
  PopoverTrigger,
  Select,
  Spinner,
  Toggle as Switch,
  TooltipContent,
  TooltipProvider,
  TooltipRoot as Tooltip,
  TooltipTrigger,
  type SelectOption,
} from '@/shared/components'
import { useColumnResize } from '@/shared/hooks/useColumnResize'
import { useUnifiedAdsPause, useUnifiedAdsEnable, fetchMetaCreativeDetails, type ProgressInfo } from '../../api'
import { getCTALabel, getOptimizationGoalInfo, getObjectTypeLabel, getObjectiveInfo, generateCsv, generateExcelXml, downloadFile, type ExportFormat, type ExportRow  } from '../../utils'
import { AlvobotBadge } from '../AlvobotBadge'
import { MetricFiltersBar } from '../MetricFiltersBar'
import { ObjectiveBadge } from '../ObjectiveBadge'
import { PlatformBadge } from '../PlatformBadge'
import styles from './UnifiedCampaignPerformanceTable.module.css'
import type { MetaAd, MetaCreativeDetails, PageWelcomeMessage } from '../../api/mutations'
import type { MetaCampaignMetrics } from '../../api/queries'
import type { AdsPlatform, UnifiedAdObject } from '../../types'
import type { MetricFilter } from '../../types/filters'

// ============================================
// Types
// ============================================

// Unified row type that works for both platforms
export interface UnifiedCampaignRow {
  id: string
  platform: AdsPlatform
  name: string
  accountName: string
  accountId: string
  connectionId: string
  status: 'ACTIVE' | 'PAUSED' | 'ENABLED' | 'REMOVED' | 'DELETED' | 'ARCHIVED'
  objective?: string
  budget: number
  budgetType: 'daily' | 'lifetime'
  isABO?: boolean
  specialAdCategories?: string[]
  // Core metrics
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
  // Calculated metrics
  cpc: number // Custo por Clique (cost / clicks)
  cpa: number // Custo por Conversão (cost / conversions)
  roas?: number // Return on Ad Spend
  // Meta-specific metrics
  reach?: number // Alcance (pessoas únicas)
  frequency?: number // Frequência (impressions / reach)
  landingPageViews?: number // Visualizações de página
  // Platform-specific data for actions and hierarchy
  platformData: CampaignMetrics | MetaCampaignMetrics
}

// Google Ad type for hierarchy expansion
interface GoogleAd {
  id: string
  name?: string
  status: string
  type?: string
  headlines?: string[]
  descriptions?: string[]
  finalUrls?: string[]
  finalMobileUrls?: string[]
  displayUrl?: string
  path1?: string
  path2?: string
  addedByGoogleAds?: boolean
  devicePreference?: string
  // Tracking & UTM fields
  trackingUrlTemplate?: string
  finalUrlSuffix?: string
  urlCustomParameters?: Array<{ key: string; value: string }>
  // Inherited tracking (for display purposes)
  adGroupTrackingUrlTemplate?: string
  adGroupFinalUrlSuffix?: string
  campaignTrackingUrlTemplate?: string
  campaignFinalUrlSuffix?: string
  campaignUrlCustomParameters?: Array<{ key: string; value: string }>
  // Call Ad
  callAd?: {
    countryCode?: string
    phoneNumber?: string
    businessName?: string
    headline1?: string
    headline2?: string
    description1?: string
    description2?: string
    callTracked?: boolean
    disableCallConversion?: boolean
    path1?: string
    path2?: string
  }
  // Image Ad
  imageAd?: {
    pixelWidth?: number
    pixelHeight?: number
    imageUrl?: string
    previewPixelWidth?: number
    previewPixelHeight?: number
    previewImageUrl?: string
    mimeType?: string
    name?: string
  }
  // Responsive Display Ad
  responsiveDisplayAd?: {
    headlines?: string[]
    longHeadline?: string
    descriptions?: string[]
    businessName?: string
    mainColor?: string
    accentColor?: string
    allowFlexibleColor?: boolean
    callToActionText?: string
    pricePrefix?: string
    promoText?: string
    formatSetting?: string
  }
  metrics?: {
    impressions?: number
    clicks?: number
    ctr?: number
    cost?: number
    conversions?: number
    cpa?: number
  }
}

// Ad Group type for Google hierarchy (derived from UnifiedAdObject)
interface AdGroup {
  id: string
  name: string
  status: string
  type?: string
  cpcBid?: number
  metrics?: {
    impressions?: number
    clicks?: number
    ctr?: number
    cost?: number
    conversions?: number
    cpa?: number
  }
  ads?: GoogleAd[]
}

// Ad Set type for Meta hierarchy (derived from UnifiedAdObject)
interface AdSet {
  id: string
  name: string
  status: string
  optimizationGoal?: string
  billingEvent?: string
  dailyBudget?: number
  lifetimeBudget?: number
  bidAmount?: number
  targeting?: {
    ageMin?: number
    ageMax?: number
    genders?: number[]
    geoLocations?: string[]
    interests?: string[]
    behaviors?: string[]
  }
  metrics?: {
    impressions?: number
    clicks?: number
    ctr?: number
    spend?: number
    conversions?: number
    cpa?: number
  }
  ads?: MetaAd[]
}

// Hierarchy data stored per campaign - uses unified types
interface CampaignHierarchyData {
  // Children from unified API (ad groups for Google, ad sets for Meta)
  children?: UnifiedAdObject[]
  // Legacy format (computed from children for compatibility)
  adGroups?: AdGroup[]
  adSets?: AdSet[]
  trackingUrlTemplate?: string
  finalUrlSuffix?: string
}

/**
 * Convert UnifiedAdObject children to legacy AdGroup format
 */
function convertToAdGroups(children: UnifiedAdObject[]): AdGroup[] {
  return children
    .filter(child => child.level === 'adset') // Ad groups from Google are level 'adset' in unified API
    .map(child => ({
      id: child.id,
      name: child.name,
      status: child.status,
      type: child.biddingStrategyType,
      cpcBid: child.maxCpc,
      metrics: {
        impressions: child.impressions,
        clicks: child.clicks,
        ctr: child.ctr,
        cost: child.cost,
        conversions: child.conversions,
        cpa: child.cpa,
      },
      // Ads are fetched on-demand when expanding the ad group
      ads: [],
    }))
}

/**
 * Convert UnifiedAdObject children to legacy AdSet format
 */
function convertToAdSets(children: UnifiedAdObject[]): AdSet[] {
  return children
    .filter(child => child.level === 'adset')
    .map(child => ({
      id: child.id,
      name: child.name,
      status: child.status === 'ENABLED' ? 'ACTIVE' : child.status,
      optimizationGoal: child.objective,
      dailyBudget: child.budgetType === 'daily' ? child.budget : undefined,
      lifetimeBudget: child.budgetType === 'lifetime' ? child.budget : undefined,
      targeting: child.targeting,
      metrics: {
        impressions: child.impressions,
        clicks: child.clicks,
        ctr: child.ctr,
        spend: child.cost,
        conversions: child.conversions,
        cpa: child.cpa,
      },
      ads: [], // Ads are fetched separately on expand
    }))
}

// Callback params for expand campaign
export interface ExpandCampaignParams {
  campaignId: string
  platform: AdsPlatform
  connectionId: string
  // Google Ads specific - required for API calls
  customerId?: string
  loginCustomerId?: string
  // Meta Ads specific
  adAccountId?: string
}

// Callback result for expand campaign
export interface ExpandCampaignResult {
  success: boolean
  children: UnifiedAdObject[]
  error?: string
}

// ProgressInfo is imported from '../../api'

type SortableField = 'platform' | 'name' | 'accountName' | 'status' | 'budget' | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cost' | 'conversions' | 'cpa' | 'roas' | 'reach' | 'frequency' | 'landingPageViews'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  key: SortableField
  direction: SortDirection
}

interface UnifiedCampaignPerformanceTableProps {
  campaigns: UnifiedCampaignRow[]
  isLoading?: boolean
  isFetching?: boolean // Background refetch indicator
  startDate?: string
  endDate?: string
  filters: PerformanceTableFilters
  onFiltersChange: (filters: PerformanceTableFilters) => void
  pageSize: number
  onPageSizeChange: (pageSize: number) => void
  // Server-side pagination - when provided, disables client-side slicing
  serverPagination?: {
    page: number
    totalPages: number
    totalItems: number
  }
  onPageChange?: (page: number) => void
  // Server-side sorting - when provided, uses external sortConfig
  sortConfig?: SortConfig
  onSortChange?: (sortConfig: SortConfig) => void
  // Unified handlers - work for both Google and Meta
  onPause?: (row: UnifiedCampaignRow) => Promise<void>
  onEnable?: (row: UnifiedCampaignRow) => Promise<void>
  onEditBudget?: (row: UnifiedCampaignRow) => void
  /** Prefetch campaign hierarchy (ad sets/ad groups) on hover */
  onPrefetchHierarchy?: (params: {
    campaignId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => void
  /** Prefetch ad set/ad group hierarchy (ads) on hover */
  onPrefetchAdSetHierarchy?: (params: {
    adSetId: string
    platform: AdsPlatform
    connectionId: string
    customerId?: string
    loginCustomerId?: string
    adAccountId?: string
  }) => void
  /** Expand campaign to fetch children (ad sets/ad groups) - uses unified API */
  onExpandCampaign?: (params: ExpandCampaignParams) => Promise<ExpandCampaignResult>
  /** Expand ad set/ad group to fetch ads - uses unified API */
  onExpandAdSet?: (params: ExpandCampaignParams & { parentId: string }) => Promise<ExpandCampaignResult>
  /** Progress info for progressive loading */
  progress?: ProgressInfo
  /** Show progress bar during loading */
  showProgress?: boolean
  /** Number of pending sources (for skeleton rows) */
  pendingSources?: number
  /** Set of campaign IDs created by AlvoBot (for badge display) */
  alvobotCampaignIds?: Set<string>
  /** Error message to display as a banner above the table */
  errorMessage?: string
  /** Callback for retry action on error banner */
  onRetry?: () => void
}

interface ColumnConfig {
  key: SortableField
  label: string
  align?: 'left' | 'right' | 'center'
  tooltip?: string
  width?: number
  minWidth?: number
}

// Column visibility state
export interface ColumnVisibility {
  name: boolean
  status: boolean
  budget: boolean
  impressions: boolean
  clicks: boolean
  ctr: boolean
  cpc: boolean
  cost: boolean
  conversions: boolean
  cpa: boolean
  roas: boolean
  reach: boolean
  frequency: boolean
  landingPageViews: boolean
}

export type PerformanceStatusFilter = 'all' | 'active' | 'paused'

export interface PerformanceTableFilters {
  search: string
  status: PerformanceStatusFilter
  objective: string
  /** Filter to show only AlvoBot-created campaigns */
  alvobotOnly?: boolean
  /** Advanced metric filters (impressions > 0, cost < 100, etc.) */
  metricFilters?: MetricFilter[]
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  name: true,
  status: true,
  budget: true,
  impressions: true,
  clicks: true,
  ctr: true,
  cpc: false, // Hidden by default
  cost: true,
  conversions: true,
  cpa: false, // Hidden by default
  roas: false, // Hidden by default
  reach: false, // Hidden by default (Meta only)
  frequency: false, // Hidden by default (Meta only)
  landingPageViews: false, // Hidden by default (Meta only)
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { key: 'name', label: 'Campanha', align: 'left', tooltip: 'Nome da campanha e conta', width: 380, minWidth: 200 },
  { key: 'status', label: 'Status', align: 'center', tooltip: 'Status atual da campanha (Ativa, Pausada, etc)', width: 80, minWidth: 60 },
  { key: 'budget', label: 'Orçamento', align: 'right', tooltip: 'Orçamento diário ou total configurado para a campanha', width: 130, minWidth: 100 },
  { key: 'impressions', label: 'Impressões', align: 'right', tooltip: 'Número total de vezes que o anúncio foi exibido', width: 110, minWidth: 90 },
  { key: 'clicks', label: 'Cliques', align: 'right', tooltip: 'Número total de cliques recebidos', width: 90, minWidth: 70 },
  { key: 'ctr', label: 'CTR', align: 'right', tooltip: 'Click-Through Rate: Porcentagem de impressões que resultaram em cliques', width: 80, minWidth: 60 },
  { key: 'cpc', label: 'CPC', align: 'right', tooltip: 'Custo Por Clique: Valor médio pago por cada clique', width: 100, minWidth: 80 },
  { key: 'cost', label: 'Gasto', align: 'right', tooltip: 'Valor total gasto no período selecionado', width: 110, minWidth: 90 },
  { key: 'conversions', label: 'Conv.', align: 'right', tooltip: 'Número total de conversões (vendas, leads, etc)', width: 90, minWidth: 70 },
  { key: 'cpa', label: 'CPA', align: 'right', tooltip: 'Custo Por Aquisição: Custo médio por conversão', width: 100, minWidth: 80 },
  { key: 'roas', label: 'ROAS', align: 'right', tooltip: 'Return On Ad Spend: Retorno sobre o investimento em anúncios', width: 90, minWidth: 70 },
  { key: 'reach', label: 'Alcance', align: 'right', tooltip: 'Número de pessoas únicas que viram o anúncio (Meta)', width: 100, minWidth: 80 },
  { key: 'frequency', label: 'Freq.', align: 'right', tooltip: 'Frequência média: Quantas vezes cada pessoa viu o anúncio (Meta)', width: 80, minWidth: 60 },
  { key: 'landingPageViews', label: 'Vis. Página', align: 'right', tooltip: 'Visualizações de página de destino após clicar no anúncio (Meta)', width: 110, minWidth: 90 },
]

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  name: 'Campanha',
  status: 'Status',
  budget: 'Orçamento',
  impressions: 'Impressões',
  clicks: 'Cliques',
  ctr: 'CTR',
  cpc: 'CPC',
  cost: 'Gasto',
  conversions: 'Conversões',
  cpa: 'CPA',
  roas: 'ROAS',
  reach: 'Alcance (Meta)',
  frequency: 'Frequência (Meta)',
  landingPageViews: 'Vis. Página (Meta)',
}

const METRIC_COLUMNS: SortableField[] = [
  'impressions',
  'clicks',
  'ctr',
  'cpc',
  'cost',
  'conversions',
  'cpa',
  'roas',
  'reach',
  'frequency',
  'landingPageViews',
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativas' },
  { value: 'paused', label: 'Pausadas' },
]

const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: '10', label: '10 / página' },
  { value: '20', label: '20 / página' },
  { value: '50', label: '50 / página' },
]

interface TableStorageState {
  sortConfig: SortConfig
  columnVisibility: ColumnVisibility
  columnOrder: SortableField[]
}

const TABLE_STORAGE_KEY = 'unified-ads-performance-table-v1'

const sanitizeColumnOrder = (order?: SortableField[]): SortableField[] => {
  const allKeys = COLUMN_CONFIG.map(col => col.key)
  const normalized = Array.isArray(order)
    ? order.filter((key): key is SortableField => allKeys.includes(key))
    : []
  const missing = allKeys.filter(key => !normalized.includes(key))
  return [...normalized, ...missing]
}

const sanitizeColumnVisibility = (visibility?: Partial<ColumnVisibility>): ColumnVisibility => {
  const next = { ...DEFAULT_COLUMN_VISIBILITY, ...visibility }
  ;(Object.keys(DEFAULT_COLUMN_VISIBILITY) as Array<keyof ColumnVisibility>).forEach((key) => {
    next[key] = Boolean(next[key])
  })
  return next
}

const sanitizeSortConfig = (config?: SortConfig): SortConfig => {
  const validKeys = COLUMN_CONFIG.map(col => col.key)
  if (!config || !validKeys.includes(config.key)) {
    return { key: 'cost', direction: 'desc' }
  }
  const direction = config.direction === 'asc' || config.direction === 'desc' ? config.direction : 'desc'
  return { key: config.key, direction }
}

const loadTableState = (): Partial<TableStorageState> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(TABLE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<TableStorageState>
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

const buildPageItems = (page: number, totalPages: number): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const items: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(totalPages - 1, page + 1)

  if (start > 2) items.push('ellipsis')
  for (let i = start; i <= end; i += 1) {
    items.push(i)
  }
  if (end < totalPages - 1) items.push('ellipsis')
  items.push(totalPages)

  return items
}

// ============================================
// Platform URL Generators
// ============================================

/**
 * Generate URL to view campaign/adset/ad directly in Google Ads platform
 */
function getGoogleAdsUrl(params: {
  level: 'campaign' | 'adgroup' | 'ad'
  customerId: string
  campaignId: string
  adGroupId?: string
  adId?: string
}): string {
  const { level, customerId, campaignId, adGroupId } = params
  const baseUrl = 'https://ads.google.com/aw'
  const customerParam = `ocid=${customerId}`

  switch (level) {
    case 'campaign':
      return `${baseUrl}/campaigns?${customerParam}&campaignId=${campaignId}`
    case 'adgroup':
      return `${baseUrl}/adgroups?${customerParam}&campaignId=${campaignId}${adGroupId ? `&adGroupId=${adGroupId}` : ''}`
    case 'ad':
      return `${baseUrl}/ads?${customerParam}&campaignId=${campaignId}${adGroupId ? `&adGroupId=${adGroupId}` : ''}`
    default:
      return `${baseUrl}/campaigns?${customerParam}`
  }
}

/**
 * Generate URL to view campaign/adset/ad directly in Meta Ads Manager
 */
function getMetaAdsUrl(params: {
  level: 'campaign' | 'adset' | 'ad'
  adAccountId: string
  campaignId?: string
  adSetId?: string
  adId?: string
}): string {
  const { level, adAccountId, campaignId, adSetId, adId } = params
  // Remove 'act_' prefix if present for URL
  const accountId = adAccountId.replace('act_', '')
  const baseUrl = `https://adsmanager.facebook.com/adsmanager/manage`

  switch (level) {
    case 'campaign':
      return `${baseUrl}/campaigns?act=${accountId}${campaignId ? `&selected_campaign_ids=${campaignId}` : ''}`
    case 'adset':
      return `${baseUrl}/adsets?act=${accountId}${campaignId ? `&campaign_id=${campaignId}` : ''}${adSetId ? `&selected_adset_ids=${adSetId}` : ''}`
    case 'ad':
      return `${baseUrl}/ads?act=${accountId}${campaignId ? `&campaign_id=${campaignId}` : ''}${adSetId ? `&adset_id=${adSetId}` : ''}${adId ? `&selected_ad_ids=${adId}` : ''}`
    default:
      return `${baseUrl}/campaigns?act=${accountId}`
  }
}

/**
 * Copy text to clipboard with fallback
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textArea)
    }
  }
}

// ============================================
// Component
// ============================================

export function UnifiedCampaignPerformanceTable({
  campaigns,
  isLoading,
  isFetching,
  filters,
  onFiltersChange,
  pageSize,
  onPageSizeChange,
  serverPagination,
  onPageChange,
  sortConfig: externalSortConfig,
  onSortChange,
  onPause,
  onEnable,
  onEditBudget,
  onPrefetchHierarchy,
  onPrefetchAdSetHierarchy,
  onExpandCampaign,
  onExpandAdSet,
  progress,
  showProgress = false,
  pendingSources = 0,
  alvobotCampaignIds,
  errorMessage,
  onRetry,
}: UnifiedCampaignPerformanceTableProps) {
  const safeFilters: PerformanceTableFilters = useMemo(
    () => filters || { search: '', status: 'all', objective: 'all', metricFilters: [] },
    [filters]
  )
  const handleFiltersChange = useCallback(
    (next: PerformanceTableFilters) => {
      onFiltersChange?.(next)
    },
    [onFiltersChange]
  )

  // Table ref for column resize
  const tableRef = useRef<HTMLTableElement>(null)

  const storedTableState = useMemo(() => loadTableState(), [])

  // Sorting state - use external if provided (controlled mode), otherwise internal
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig>(() => sanitizeSortConfig(storedTableState.sortConfig))
  const sortConfig = externalSortConfig ?? internalSortConfig

  // When sortConfig changes, call the external handler if provided
  const setSortConfig = useCallback((newConfig: SortConfig | ((prev: SortConfig) => SortConfig)) => {
    const resolvedConfig = typeof newConfig === 'function' ? newConfig(sortConfig) : newConfig
    setInternalSortConfig(resolvedConfig)
    onSortChange?.(resolvedConfig)
  }, [sortConfig, onSortChange])
  const [isDraggingColumn, setIsDraggingColumn] = useState(false)
  const [draggedColumn, setDraggedColumn] = useState<SortableField | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<SortableField | null>(null)

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => sanitizeColumnVisibility(storedTableState.columnVisibility))

  // Column order state
  const [columnOrder, setColumnOrder] = useState<SortableField[]>(() => sanitizeColumnOrder(storedTableState.columnOrder))

  // Pagination state
  const [page, setPage] = useState(1)

  // Column resize with auto-fit
  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    COLUMN_CONFIG.forEach(col => {
      widths[col.key] = col.width || 100
    })
    return widths
  }, [])

  const { columnWidths, handleMouseDown, handleDoubleClick, autoFitAllColumns } = useColumnResize(
    initialWidths,
    tableRef,
    COLUMN_CONFIG.map(col => ({ key: col.key, minWidth: col.minWidth }))
  )

  // Expansion state
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())
  const [hierarchyData, setHierarchyData] = useState<Map<string, CampaignHierarchyData>>(new Map())
  const [loadingExpand, setLoadingExpand] = useState<Set<string>>(new Set()) // Multiple loading support
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set()) // Google: Ad Groups
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set()) // Meta: Ad Sets
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set())
  const [expandedCreativeTexts, setExpandedCreativeTexts] = useState<Set<string>>(new Set())
  const [creativeDetailsCache, setCreativeDetailsCache] = useState<Map<string, MetaCreativeDetails>>(new Map())
  const [loadingCreativeDetails, setLoadingCreativeDetails] = useState<Set<string>>(new Set())
  const [thumbnailFallbackIndex, setThumbnailFallbackIndex] = useState<Map<string, number>>(new Map())

  const bumpThumbnailFallback = useCallback((key: string, max: number) => {
    setThumbnailFallbackIndex(prev => {
      const current = prev.get(key) ?? 0
      if (max <= 1 || current >= max - 1) return prev
      const next = new Map(prev)
      next.set(key, current + 1)
      return next
    })
  }, [])

  const normalizeInstagramUrl = useCallback((url: string) => {
    try {
      const u = new URL(url)
      if (u.hostname === 'instagram.com') u.hostname = 'www.instagram.com'
      return u.toString()
    } catch {
      return url
    }
  }, [])

  // Unified mutations for ad group/ad set and ad actions
  const pauseUnifiedMutation = useUnifiedAdsPause()
  const enableUnifiedMutation = useUnifiedAdsEnable()

  // State to track ads loaded for each ad set (Meta)
  const [adSetAdsData, setAdSetAdsData] = useState<Map<string, MetaAd[]>>(new Map())
  const [loadingAdSetAds, setLoadingAdSetAds] = useState<Set<string>>(new Set()) // Multiple loading support

  // State to track ads loaded for each ad group (Google)
  const [adGroupAdsData, setAdGroupAdsData] = useState<Map<string, GoogleAd[]>>(new Map())
  const [loadingAdGroupAds, setLoadingAdGroupAds] = useState<Set<string>>(new Set())


  // Optimistic update state for campaign status
  const [loadingStatusChange, setLoadingStatusChange] = useState<Set<string>>(new Set())
  const [optimisticStatus, setOptimisticStatus] = useState<Map<string, 'ACTIVE' | 'PAUSED' | 'ENABLED'>>(new Map())

  // Clear optimistic status only when the SERVER confirms the status change
  // This prevents premature clearing when the campaigns array reference changes
  useEffect(() => {
    if (optimisticStatus.size === 0) return

    // Check each optimistic status against server data
    const keysToRemove: string[] = []

    optimisticStatus.forEach((optimisticValue, key) => {
      // Find the campaign in the current data
      const campaign = campaigns.find(c => `${c.platform}-${c.id}` === key)
      if (!campaign) return // Campaign not in current page, keep optimistic status

      const serverStatus = campaign.status

      // Normalize statuses for comparison (ENABLED and ACTIVE are equivalent)
      const normalizeStatus = (status: string) => {
        if (status === 'ENABLED' || status === 'ACTIVE') return 'ACTIVE'
        return status
      }

      const normalizedOptimistic = normalizeStatus(optimisticValue)
      const normalizedServer = normalizeStatus(serverStatus)

      // Clear optimistic status only when server confirms it matches
      if (normalizedOptimistic === normalizedServer) {
        keysToRemove.push(key)
      }
    })

    if (keysToRemove.length > 0) {
      setOptimisticStatus(prev => {
        const next = new Map(prev)
        keysToRemove.forEach(key => next.delete(key))
        return next
      })
    }
  }, [campaigns, optimisticStatus])


  // Persist table preferences offline
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const payload: TableStorageState = {
        sortConfig,
        columnVisibility,
        columnOrder,
      }
      window.localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('Failed to persist table preferences:', error)
    }
  }, [sortConfig, columnVisibility, columnOrder])

  const handleFilterChange = useCallback(
    (next: Partial<PerformanceTableFilters>) => {
      handleFiltersChange({ ...safeFilters, ...next })
    },
    [handleFiltersChange, safeFilters],
  )

  const objectiveOptions = useMemo<SelectOption[]>(() => {
    const set = new Set<string>()
    campaigns.forEach(campaign => {
      if (campaign.objective) {
        set.add(campaign.objective)
      }
    })

    const sorted = Array.from(set).sort((a, b) => {
      const labelA = getObjectiveInfo(a)?.label || a
      const labelB = getObjectiveInfo(b)?.label || b
      return labelA.localeCompare(labelB, 'pt-BR')
    })

    return [
      { value: 'all', label: 'Todos objetivos' },
      ...sorted.map(objective => ({
        value: objective,
        label: getObjectiveInfo(objective)?.label || objective,
      })),
    ]
  }, [campaigns])

  useEffect(() => {
    if (safeFilters.objective === 'all') return
    const exists = objectiveOptions.some(option => option.value === safeFilters.objective)
    if (!exists) {
      onFiltersChange?.({ ...safeFilters, objective: 'all' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectiveOptions, safeFilters.objective])

  // Determine if we should use server-side pagination (defined early for use in callbacks)
  const useServerPagination = !!serverPagination && !!onPageChange

  // Page change handler - uses onPageChange for server pagination, setPage for client
  const handlePageChange = useCallback((newPage: number) => {
    if (useServerPagination && onPageChange) {
      onPageChange(newPage)
    } else {
      setPage(newPage)
    }
  }, [useServerPagination, onPageChange])

  // Reset to page 1 when filters change (only for client-side pagination)
  // Server-side pagination reset is handled by the parent component
  useEffect(() => {
    if (!useServerPagination) {
      setPage(1)
    }
  }, [pageSize, safeFilters.objective, safeFilters.search, safeFilters.status, useServerPagination])

  // Helper to get effective status for filtering (considers optimistic updates)
  const getFilterStatus = useCallback((campaign: UnifiedCampaignRow) => {
    const campaignKey = `${campaign.platform}-${campaign.id}`
    return optimisticStatus.get(campaignKey) ?? campaign.status
  }, [optimisticStatus])

  const filteredCampaigns = useMemo(() => {
    // ── Server-side pagination mode ──
    // Search, status, and objective filters are already applied by the backend.
    // Only apply local filters for:
    // 1. Optimistic status updates (immediate feedback when user pauses/enables)
    // 2. REMOVED/DELETED/ARCHIVED exclusion (safety net)
    if (useServerPagination) {
      return campaigns.filter(campaign => {
        const effectiveStatus = getFilterStatus(campaign)

        // Safety net: always exclude removed/deleted/archived campaigns
        if (effectiveStatus === 'REMOVED' || effectiveStatus === 'DELETED' || effectiveStatus === 'ARCHIVED') {
          return false
        }

        // Optimistic update support: if user just paused a campaign while
        // viewing "active" filter, hide it immediately without waiting for server
        if (safeFilters.status !== 'all') {
          const isCampaignActive = effectiveStatus === 'ACTIVE' || effectiveStatus === 'ENABLED'
          if (safeFilters.status === 'active' && !isCampaignActive) return false
          if (safeFilters.status === 'paused' && effectiveStatus !== 'PAUSED') return false
        }

        return true
      })
    }

    // ── Client-side pagination mode (fallback) ──
    // Apply all filters locally since there's no server handling them
    const search = safeFilters.search.trim().toLowerCase()

    return campaigns.filter(campaign => {
      if (search) {
        const matchesSearch =
          campaign.name.toLowerCase().includes(search) ||
          campaign.accountName.toLowerCase().includes(search) ||
          campaign.accountId.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      const effectiveStatus = getFilterStatus(campaign)

      // Always exclude removed/deleted/archived campaigns
      if (effectiveStatus === 'REMOVED' || effectiveStatus === 'DELETED' || effectiveStatus === 'ARCHIVED') {
        return false
      }

      if (safeFilters.status !== 'all') {
        const isCampaignActive = effectiveStatus === 'ACTIVE' || effectiveStatus === 'ENABLED'
        if (safeFilters.status === 'active' && !isCampaignActive) return false
        if (safeFilters.status === 'paused' && effectiveStatus !== 'PAUSED') return false
      }

      if (safeFilters.objective !== 'all') {
        if (!campaign.objective || campaign.objective !== safeFilters.objective) return false
      }

      return true
    })
  }, [campaigns, safeFilters, getFilterStatus, useServerPagination])

  // Sorted campaigns
  // Note: When using server pagination, sorting is also done server-side
  const sortedCampaigns = useMemo(() => {
    // Skip client-side sorting when using server pagination (data already sorted)
    if (useServerPagination) {
      return filteredCampaigns
    }

    const sorted = [...filteredCampaigns].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'pt-BR')
      } else {
        comparison = (aValue as number) - (bValue as number)
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
    return sorted
  }, [filteredCampaigns, sortConfig, useServerPagination])

  // Pagination calculations (useServerPagination was defined earlier for use in callbacks)
  const totalItems = useServerPagination
    ? serverPagination.totalItems
    : sortedCampaigns.length
  const totalPages = useServerPagination
    ? serverPagination.totalPages
    : (totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0)
  const currentPage = useServerPagination
    ? serverPagination.page
    : (totalPages > 0 ? Math.min(page, totalPages) : 1)
  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, totalItems)

  // When using server pagination, don't slice - data is already paginated
  // When using client pagination, slice the sorted campaigns
  const paginatedCampaigns = useServerPagination
    ? sortedCampaigns // Already paginated from server
    : sortedCampaigns.slice(
        (currentPage - 1) * pageSize,
        (currentPage - 1) * pageSize + pageSize,
      )
  const pageItems = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages])

  // Only adjust local page state for client-side pagination
  useEffect(() => {
    if (useServerPagination) return // Server controls pagination
    if (totalPages === 0) return
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages, useServerPagination])

  // Handlers
  const handleSort = (key: SortableField) => {
    if (isDraggingColumn) return
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const handleDragStart = (key: SortableField) => (event: DragEvent<HTMLElement>) => {
    setDraggedColumn(key)
    setIsDraggingColumn(true)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }

  const handleDragOver = (key: SortableField) => (event: DragEvent<HTMLTableCellElement>) => {
    event.preventDefault()
    if (dragOverColumn !== key) {
      setDragOverColumn(key)
    }
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (key: SortableField) => (event: DragEvent<HTMLTableCellElement>) => {
    event.preventDefault()
    const sourceKey = draggedColumn || (event.dataTransfer.getData('text/plain') as SortableField)
    if (!sourceKey || sourceKey === key) {
      setDraggedColumn(null)
      setDragOverColumn(null)
      setIsDraggingColumn(false)
      return
    }

    setColumnOrder(prev => {
      const next = prev.filter(colKey => colKey !== sourceKey)
      const insertIndex = next.indexOf(key)
      if (insertIndex === -1) return prev
      next.splice(insertIndex, 0, sourceKey)
      return next
    })

    setDraggedColumn(null)
    setDragOverColumn(null)
    setIsDraggingColumn(false)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
    setDragOverColumn(null)
    setIsDraggingColumn(false)
  }

  // Toggle campaign expand
  const handleToggleCampaign = useCallback(async (campaign: UnifiedCampaignRow) => {
    const campaignKey = `${campaign.platform}-${campaign.id}`

    // If already expanded, collapse
    if (expandedCampaigns.has(campaignKey)) {
      setExpandedCampaigns(prev => {
        const next = new Set(prev)
        next.delete(campaignKey)
        return next
      })
      // Also collapse nested items
      setExpandedAdGroups(prev => {
        const next = new Set(prev)
        for (const key of prev) {
          if (key.startsWith(`${campaignKey}:`)) {
            next.delete(key)
          }
        }
        return next
      })
      setExpandedAdSets(prev => {
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

    // If no expand callback, can't fetch data
    if (!onExpandCampaign) {
      console.warn('onExpandCampaign callback not provided')
      return
    }

    // Fetch hierarchy data using unified API
    setLoadingExpand(prev => new Set(prev).add(campaignKey))
    try {
      // Extract platform-specific IDs from platformData for API calls
      const googleData = campaign.platform === 'google' ? campaign.platformData as CampaignMetrics : null
      const metaData = campaign.platform === 'meta' ? campaign.platformData as MetaCampaignMetrics : null

      const result = await onExpandCampaign({
        campaignId: campaign.id,
        platform: campaign.platform,
        connectionId: campaign.connectionId,
        // Google Ads specific
        customerId: googleData?.customerId,
        loginCustomerId: googleData?.loginCustomerId,
        // Meta Ads specific
        adAccountId: metaData?.adAccountId,
      })

      if (result.success && result.children.length > 0) {
        // Convert to legacy format based on platform
        const hierarchyEntry: CampaignHierarchyData = {
          children: result.children,
        }

        // Add legacy format for compatibility with existing render code
        if (campaign.platform === 'google') {
          hierarchyEntry.adGroups = convertToAdGroups(result.children)
        } else if (campaign.platform === 'meta') {
          hierarchyEntry.adSets = convertToAdSets(result.children)
        }

        setHierarchyData(prev => new Map(prev).set(campaignKey, hierarchyEntry))
        setExpandedCampaigns(prev => new Set(prev).add(campaignKey))
      }
    } catch (error) {
      console.error('Failed to fetch campaign hierarchy:', error)
    } finally {
      setLoadingExpand(prev => {
        const next = new Set(prev)
        next.delete(campaignKey)
        return next
      })
    }
  }, [expandedCampaigns, hierarchyData, onExpandCampaign])

  // Toggle ad group (Google) - fetches ads via API when expanding
  const handleToggleAdGroup = useCallback(async (
    campaignKey: string,
    adGroupId: string,
    connectionId: string,
    platformIds?: { customerId?: string; loginCustomerId?: string }
  ) => {
    const adGroupKey = `${campaignKey}:${adGroupId}`

    // If already expanded, collapse
    if (expandedAdGroups.has(adGroupKey)) {
      setExpandedAdGroups(prev => {
        const next = new Set(prev)
        next.delete(adGroupKey)
        return next
      })
      // Also collapse nested ads - batched update
      setExpandedAds(p => {
        const keysToRemove = Array.from(p).filter(key => key.startsWith(`${adGroupKey}:`))
        if (keysToRemove.length === 0) return p
        const n = new Set(p)
        keysToRemove.forEach(key => n.delete(key))
        return n
      })
      return
    }

    // If ads already cached, just expand
    if (adGroupAdsData.has(adGroupKey)) {
      setExpandedAdGroups(prev => new Set(prev).add(adGroupKey))
      return
    }

    // If no expand callback, can't fetch data
    if (!onExpandAdSet) {
      console.warn('onExpandAdSet callback not provided for Google ad group expand')
      return
    }

    // Fetch ads for this ad group using unified API
    setLoadingAdGroupAds(prev => new Set(prev).add(adGroupKey))
    try {
      const result = await onExpandAdSet({
        campaignId: '', // Not used for ad group expand
        parentId: adGroupId,
        platform: 'google',
        connectionId,
        // Platform-specific IDs for API calls
        customerId: platformIds?.customerId,
        loginCustomerId: platformIds?.loginCustomerId,
      })

      if (result.success && result.children?.length > 0) {
        // Convert UnifiedAdObject to GoogleAd format
        // Creative data is inside the `creative` object in UnifiedAdObject
        const ads: GoogleAd[] = result.children.map(child => {
          const creative = child.creative
          return {
            id: child.id,
            name: child.name,
            status: child.status,
            type: creative?.type || (child.platformData as { type?: string })?.type,
            // Basic RSA/ETA fields
            headlines: creative?.headlines || [],
            descriptions: creative?.descriptions || [],
            finalUrls: creative?.finalUrls || (creative?.finalUrl ? [creative.finalUrl] : []),
            finalMobileUrls: creative?.finalMobileUrls || [],
            displayUrl: creative?.displayUrl || (child.platformData as { displayUrl?: string })?.displayUrl,
            path1: creative?.path1,
            path2: creative?.path2,
            addedByGoogleAds: creative?.addedByGoogleAds,
            devicePreference: creative?.devicePreference,
            // Tracking & UTM fields
            trackingUrlTemplate: creative?.trackingUrlTemplate,
            finalUrlSuffix: creative?.finalUrlSuffix,
            urlCustomParameters: creative?.urlCustomParameters,
            // Inherited tracking
            adGroupTrackingUrlTemplate: creative?.adGroupTrackingUrlTemplate,
            adGroupFinalUrlSuffix: creative?.adGroupFinalUrlSuffix,
            campaignTrackingUrlTemplate: creative?.campaignTrackingUrlTemplate,
            campaignFinalUrlSuffix: creative?.campaignFinalUrlSuffix,
            campaignUrlCustomParameters: creative?.campaignUrlCustomParameters,
            // Ad type specific
            callAd: creative?.callAd,
            imageAd: creative?.imageAd,
            responsiveDisplayAd: creative?.responsiveDisplayAd,
            // Metrics
            metrics: {
              impressions: child.impressions,
              clicks: child.clicks,
              ctr: child.ctr,
              cost: child.cost,
              conversions: child.conversions,
              cpa: child.cpa,
            },
          }
        })
        setAdGroupAdsData(prev => new Map(prev).set(adGroupKey, ads))
        setExpandedAdGroups(prev => new Set(prev).add(adGroupKey))
      }
    } catch (error) {
      console.error('Failed to fetch ads for ad group:', error)
    } finally {
      setLoadingAdGroupAds(prev => {
        const next = new Set(prev)
        next.delete(adGroupKey)
        return next
      })
    }
  }, [expandedAdGroups, adGroupAdsData, onExpandAdSet])

  // Toggle ad set (Meta) or ad group (Google) - fetches ads when expanding
  const handleToggleAdSet = useCallback(async (
    campaignKey: string,
    adSetId: string,
    connectionId: string,
    platform: AdsPlatform = 'meta',
    platformIds?: { customerId?: string; loginCustomerId?: string; adAccountId?: string }
  ) => {
    const adSetKey = `${campaignKey}:${adSetId}`

    // If already expanded, collapse
    if (expandedAdSets.has(adSetKey)) {
      setExpandedAdSets(prev => {
        const next = new Set(prev)
        next.delete(adSetKey)
        return next
      })
      // Also collapse nested ads - batched update
      setExpandedAds(prev => {
        const keysToRemove = Array.from(prev).filter(key => key.startsWith(`${adSetKey}:`))
        if (keysToRemove.length === 0) return prev
        const next = new Set(prev)
        keysToRemove.forEach(key => next.delete(key))
        return next
      })
      return
    }

    // If ads already cached, just expand
    if (adSetAdsData.has(adSetKey)) {
      setExpandedAdSets(prev => new Set(prev).add(adSetKey))
      return
    }

    // If no expand callback, can't fetch data
    if (!onExpandAdSet) {
      console.warn('onExpandAdSet callback not provided')
      return
    }

    // Fetch ads for this ad set using unified API
    setLoadingAdSetAds(prev => new Set(prev).add(adSetKey))
    try {
      const result = await onExpandAdSet({
        campaignId: '', // Not used for ad set expand
        parentId: adSetId,
        platform,
        connectionId,
        // Platform-specific IDs for API calls
        customerId: platformIds?.customerId,
        loginCustomerId: platformIds?.loginCustomerId,
        adAccountId: platformIds?.adAccountId,
      })

      if (result.success && result.children.length > 0) {
        // Convert UnifiedAdObject[] to the format expected by the table
        setAdSetAdsData(prev => new Map(prev).set(adSetKey, result.children as unknown as MetaAd[]))
        setExpandedAdSets(prev => new Set(prev).add(adSetKey))
      }
    } catch (error) {
      console.error('Failed to fetch ad set ads:', error)
    } finally {
      setLoadingAdSetAds(prev => {
        const next = new Set(prev)
        next.delete(adSetKey)
        return next
      })
    }
  }, [expandedAdSets, adSetAdsData, onExpandAdSet])

  // Toggle ad expand
  const handleToggleAd = useCallback(
    async (adKey: string, adId?: string, connectionId?: string, platform?: AdsPlatform) => {
      let shouldFetchCreativeDetails = false

      setExpandedAds(prev => {
        const next = new Set(prev)
        if (next.has(adKey)) {
          next.delete(adKey)
        } else {
          next.add(adKey)
          shouldFetchCreativeDetails = true
        }
        return next
      })

      // For Meta ads, fetch high-quality creative details when expanding (avoid duplicate requests).
      if (
        shouldFetchCreativeDetails &&
        platform === 'meta' &&
        adId &&
        connectionId &&
        !creativeDetailsCache.has(adKey) &&
        !loadingCreativeDetails.has(adKey)
      ) {
        setLoadingCreativeDetails(prevLoading => {
          const nextLoading = new Set(prevLoading)
          nextLoading.add(adKey)
          return nextLoading
        })
        fetchMetaCreativeDetails(adId, connectionId)
          .then(data => {
            setCreativeDetailsCache(cache => {
              const newCache = new Map(cache)
              newCache.set(adKey, data)
              return newCache
            })
          })
          .catch(err => {
            console.error('Failed to fetch creative details:', err)
          })
          .finally(() => {
            setLoadingCreativeDetails(prevLoading => {
              const nextLoading = new Set(prevLoading)
              nextLoading.delete(adKey)
              return nextLoading
            })
          })
      }
    },
    [creativeDetailsCache, loadingCreativeDetails],
  )

  // Column visibility handler
  const handleToggleColumn = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column],
    }))
  }

  const handleSelectAllColumns = () => {
    const allVisible = (Object.keys(DEFAULT_COLUMN_VISIBILITY) as Array<keyof ColumnVisibility>).reduce(
      (acc, key) => {
        acc[key] = true
        return acc
      },
      {} as ColumnVisibility
    )
    setColumnVisibility(allVisible)
  }

  // Export handlers
  const handleExport = (format: ExportFormat) => {
    const rows: ExportRow[] = sortedCampaigns.map(campaign => ({
      platform: campaign.platform === 'google' ? 'Google Ads' : 'Meta Ads',
      name: campaign.name,
      accountName: campaign.accountName,
      status: formatStatus(campaign.status),
      budget: campaign.budget,
      budgetType: campaign.budgetType === 'daily' ? 'Diário' : 'Total',
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      ctr: campaign.ctr,
      cpc: campaign.cpc,
      cost: campaign.cost,
      conversions: campaign.conversions,
      cpa: campaign.cpa,
      roas: campaign.roas || 0,
      reach: campaign.reach || 0,
      frequency: campaign.frequency || 0,
      landingPageViews: campaign.landingPageViews || 0,
    }))

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '')
    const extension = format === 'xlsx' ? 'xls' : format
    const filename = `campanhas_${dateStr}_${timeStr}.${extension}`

    if (format === 'csv') {
      const content = generateCsv(rows)
      downloadFile(content, filename, 'text/csv;charset=utf-8;')
    } else {
      const content = generateExcelXml(rows)
      downloadFile(content, filename, 'application/vnd.ms-excel')
    }
  }

  // Visible columns count
  const visibleColumnsCount = Object.values(columnVisibility).filter(Boolean).length

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return COLUMN_CONFIG.filter(col => columnVisibility[col.key as keyof ColumnVisibility] !== false)
  }, [columnVisibility])

  // Action handlers with optimistic updates
  const handlePause = useCallback(async (row: UnifiedCampaignRow) => {
    if (!onPause) return
    const campaignKey = `${row.platform}-${row.id}`

    // Set loading and optimistic status
    setLoadingStatusChange(prev => new Set(prev).add(campaignKey))
    setOptimisticStatus(prev => new Map(prev).set(campaignKey, 'PAUSED'))

    try {
      await onPause(row)
      // Success - keep optimistic status until data refreshes
    } catch {
      // Error - revert optimistic status
      setOptimisticStatus(prev => {
        const next = new Map(prev)
        next.delete(campaignKey)
        return next
      })
    } finally {
      setLoadingStatusChange(prev => {
        const next = new Set(prev)
        next.delete(campaignKey)
        return next
      })
    }
  }, [onPause])

  const handleEnable = useCallback(async (row: UnifiedCampaignRow) => {
    if (!onEnable) return
    const campaignKey = `${row.platform}-${row.id}`

    // Set loading and optimistic status (use ENABLED for Google, ACTIVE for Meta)
    setLoadingStatusChange(prev => new Set(prev).add(campaignKey))
    const newStatus = row.platform === 'google' ? 'ENABLED' : 'ACTIVE'
    setOptimisticStatus(prev => new Map(prev).set(campaignKey, newStatus))

    try {
      await onEnable(row)
      // Success - keep optimistic status until data refreshes
    } catch {
      // Error - revert optimistic status
      setOptimisticStatus(prev => {
        const next = new Map(prev)
        next.delete(campaignKey)
        return next
      })
    } finally {
      setLoadingStatusChange(prev => {
        const next = new Set(prev)
        next.delete(campaignKey)
        return next
      })
    }
  }, [onEnable])

  const handleEditBudget = (row: UnifiedCampaignRow) => {
    onEditBudget?.(row)
  }

  // Helper function to get effective status (considering optimistic updates)
  const getEffectiveStatus = useCallback((campaign: UnifiedCampaignRow) => {
    const campaignKey = `${campaign.platform}-${campaign.id}`
    return optimisticStatus.get(campaignKey) ?? campaign.status
  }, [optimisticStatus])

  // Helper functions
  const isActive = (status: string) => status === 'ACTIVE' || status === 'ENABLED'

  // Check if a campaign status change is loading
  const isStatusLoading = useCallback((campaign: UnifiedCampaignRow) => {
    const campaignKey = `${campaign.platform}-${campaign.id}`
    return loadingStatusChange.has(campaignKey)
  }, [loadingStatusChange])


  const handleToggleCreativeText = useCallback((key: string) => {
    setExpandedCreativeTexts((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])


  const formatStatus = (status: string) => {
    if (status === 'ACTIVE' || status === 'ENABLED') return 'Ativa'
    if (status === 'PAUSED') return 'Pausada'
    if (status === 'REMOVED' || status === 'DELETED') return 'Removida'
    if (status === 'ARCHIVED') return 'Arquivada'
    return status
  }

  const renderMetricValue = (key: SortableField, value?: number | null) => {
    if (value === undefined || value === null) return '-'

    switch (key) {
      case 'impressions':
      case 'clicks':
      case 'conversions':
      case 'reach':
      case 'landingPageViews':
        return value.toLocaleString('pt-BR')
      case 'ctr':
        return `${value.toFixed(2)}%`
      case 'cpc':
      case 'cost':
        return `R$ ${value.toFixed(2)}`
      case 'cpa':
        return value > 0 ? `R$ ${value.toFixed(2)}` : '-'
      case 'roas':
        return value > 0 ? `${value.toFixed(2)}x` : '-'
      case 'frequency':
        return value.toFixed(2)
      default:
        return '-'
    }
  }

  const renderMetricCells = (values: Partial<Record<SortableField, number | null | undefined>>) => {
    return visibleColumns
      .filter(col => METRIC_COLUMNS.includes(col.key))
      .map(col => (
        <td key={col.key} className={`${styles.td} ${styles[col.align || 'right']}`} data-column-key={col.key}>
          {renderMetricValue(col.key, values[col.key])}
        </td>
      ))
  }

  const detailColSpan = visibleColumns.length
  // emptyColSpan accounts for: expand btn + status + ID + visible columns + actions
  const emptyColSpan = visibleColumns.length + 4

  // ============================================
  // Render
  // ============================================

  return (
    <TooltipProvider delayDuration={200}>
      {/* Progress bar for progressive loading */}
      {showProgress && progress && progress.total > 0 && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
          />
          <span className={styles.progressLabel}>
            <Loader2 size={14} className={styles.progressSpinner} />
            {progress.currentSource}
          </span>
          <span className={styles.progressText}>
            {progress.current}/{progress.total} conexões
          </span>
        </div>
      )}

      {/* Error banner - shows API errors without hiding the table */}
      {errorMessage && (
        <div className={styles.errorBanner}>
          <div className={styles.errorBannerContent}>
            <AlertTriangle size={16} className={styles.errorBannerIcon} />
            <span>{errorMessage}</span>
          </div>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              leftIcon={<RotateCcw size={14} />}
            >
              Tentar Novamente
            </Button>
          )}
        </div>
      )}

      {/* Table wrapper groups toolbar + table + pagination */}
      <div className={styles.tableWrapper}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <Input
            placeholder="Buscar campanha ou conta..."
            leftIcon={<Search size={16} />}
            value={safeFilters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className={styles.searchInput}
            size="md"
          />

          {/* Filters */}
          <div className={styles.filtersGroup}>
            <Select
              value={safeFilters.status}
              onValueChange={(value) => handleFilterChange({ status: value as PerformanceStatusFilter })}
              options={STATUS_OPTIONS}
              placeholder="Status"
              size="md"
            />

            <Select
              value={safeFilters.objective}
              onValueChange={(value) => handleFilterChange({ objective: value })}
              disabled={objectiveOptions.length <= 1}
              options={objectiveOptions}
              placeholder="Objetivo"
              size="md"
            />

            {/* AlvoBot Filter Toggle */}
            <button
              type="button"
              className={`${styles.alvobotFilterBtn} ${safeFilters.alvobotOnly ? styles.active : ''}`}
              onClick={() => handleFilterChange({ alvobotOnly: !safeFilters.alvobotOnly })}
              title={safeFilters.alvobotOnly ? 'Mostrar todas as campanhas' : 'Mostrar apenas campanhas AlvoBot'}
            >
              <span className={styles.alvobotFilterIcon}>A</span>
              AlvoBot
            </button>

            {/* Advanced Metric Filters */}
            <MetricFiltersBar
              filters={safeFilters.metricFilters || []}
              onChange={(metricFilters) => handleFilterChange({ metricFilters })}
            />
          </div>
        </div>

        <div className={styles.toolbarRight}>

          {/* Column selector */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={styles.toolbarButton}
                type="button"
                title="Configurar colunas visíveis"
              >
                <Columns3 size={16} />
                <span>Colunas</span>
                <span className={styles.columnCount}>{visibleColumnsCount}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-4" style={{ minWidth: 'auto', maxWidth: 'none' }}>
              <div className="mb-2 font-medium text-sm">Colunas Visíveis</div>
              <div className={styles.dropdownOptions}>
                {(columnOrder as Array<keyof ColumnVisibility>).map((column) => (
                  <label
                    key={column}
                    className={`${styles.dropdownOption} ${columnVisibility[column] ? styles.dropdownOptionActive : ''}`}
                  >
                    <Checkbox
                      checked={columnVisibility[column]}
                      onCheckedChange={() => handleToggleColumn(column)}
                      aria-label={`Mostrar coluna ${COLUMN_LABELS[column]}`}
                      size="sm"
                      density="compact"
                    />
                    <span className={styles.dropdownLabel}>{COLUMN_LABELS[column]}</span>
                  </label>
                ))}
              </div>
              <div className={styles.dropdownFooter}>
                <div className={styles.dropdownFooterActions}>
                  <button
                    className={styles.resetButton}
                    onClick={handleSelectAllColumns}
                    type="button"
                  >
                    Selecionar todos
                  </button>
                  <button
                    className={styles.resetButton}
                    onClick={() => setColumnVisibility(DEFAULT_COLUMN_VISIBILITY)}
                    type="button"
                  >
                    <RotateCcw size={14} />
                    Restaurar padrão
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Auto-fit button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-md"
                onClick={autoFitAllColumns}
                aria-label="Ajustar largura das colunas"
              >
                <Columns3 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajustar colunas</TooltipContent>
          </Tooltip>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-md"
                aria-label="Exportar dados"
              >
                <Download className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Exportar Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div
        className={`${styles.tableContainer} ${styles.tableContainerWithToolbar} ${
          totalItems > 0 ? styles.tableContainerWithFooter : ''
        }`}
      >
        <table className={`${styles.table} ${isFetching ? styles.tableFetching : ''}`} ref={tableRef}>
          <thead>
            <tr>
              <th className={styles.th} style={{ width: 40 }} />
              <th className={`${styles.th} ${styles.center}`} style={{ width: 80 }}>Status</th>
              <th className={`${styles.th} ${styles.left}`} style={{ width: 120 }}>ID</th>
              {visibleColumns.filter(col => col.key !== 'status').map(col => (
                <th
                  key={col.key}
                  className={`${styles.th} ${styles.thResizable} ${styles[col.align || 'left']} ${draggedColumn === col.key ? styles.thDragging : ''} ${dragOverColumn === col.key ? styles.thDragOver : ''}`}
                  style={{ width: columnWidths[col.key] || col.width }}
                  data-column-key={col.key}
                  onDragOver={handleDragOver(col.key)}
                  onDrop={handleDrop(col.key)}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={styles.thContent}
                        onClick={() => handleSort(col.key)}
                        draggable
                        onDragStart={handleDragStart(col.key)}
                        onDragEnd={handleDragEnd}
                      >
                        <span>{col.label}</span>
                        {sortConfig.key === col.key && (
                          sortConfig.direction === 'asc'
                            ? <ChevronUp size={14} />
                            : <ChevronDown size={14} />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{col.tooltip || col.label}</TooltipContent>
                  </Tooltip>
                  {/* Resize handle - must be last child for proper stacking */}
                  <button
                    type="button"
                    className={styles.resizeHandle}
                    aria-label="Redimensionar coluna"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleMouseDown(col.key, e)
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDoubleClick(col.key, e)
                    }}
                  />
                </th>
              ))}
              <th className={`${styles.th} ${styles.center}`} style={{ width: 80 }}>Ações</th>
            </tr>
          </thead>
        <tbody>
          {/* Skeleton rows during initial loading */}
          {isLoading && paginatedCampaigns.length === 0 && (
            Array.from({ length: pageSize }).map((_, index) => (
              <tr key={`skeleton-${index}`} className={styles.skeletonRow}>
                <td className={styles.td}><div className={styles.skeletonBtn} /></td>
                <td className={`${styles.td} ${styles.center}`}><div className={styles.skeletonToggle} /></td>
                <td className={styles.td}><div className={`${styles.skeleton} ${styles.skeletonNarrow}`} /></td>
                {visibleColumns.map((col) => (
                  <td key={col.key} className={`${styles.td} ${col.key === 'name' ? '' : styles.right}`}>
                    <div className={`${styles.skeleton} ${col.key === 'name' ? styles.skeletonWide : styles.skeletonNarrow}`} />
                  </td>
                ))}
                <td className={`${styles.td} ${styles.center}`}><div className={styles.skeletonActions} /></td>
              </tr>
            ))
          )}

          {/* Empty state */}
          {!isLoading && paginatedCampaigns.length === 0 && (
            <tr>
              <td className={styles.emptyState} colSpan={emptyColSpan}>
                {campaigns.length === 0
                  ? 'Nenhuma campanha encontrada. Crie uma campanha para ver as métricas de performance aqui.'
                  : 'Nenhuma campanha encontrada com os filtros atuais. Tente alterar os filtros.'}
              </td>
            </tr>
          )}

          {/* Campaign rows */}
          {paginatedCampaigns.length > 0 && paginatedCampaigns.flatMap((campaign) => {
            const campaignKey = `${campaign.platform}-${campaign.id}`
            const isExpanded = expandedCampaigns.has(campaignKey)
            const isLoadingCampaign = loadingExpand.has(campaignKey)
            const hierarchy = hierarchyData.get(campaignKey)

            // Extract platform-specific data for prefetch/expand
            const googleData = campaign.platform === 'google' ? campaign.platformData as CampaignMetrics : undefined
            const metaData = campaign.platform === 'meta' ? campaign.platformData as MetaCampaignMetrics : undefined

            const rows: React.ReactNode[] = []

            // Level 0: Campaign row
            rows.push(
              <tr
                key={campaignKey}
                className={styles.rowLevel0}
                onMouseEnter={() => onPrefetchHierarchy?.({
                  campaignId: campaign.id,
                  platform: campaign.platform,
                  connectionId: campaign.connectionId,
                  customerId: googleData?.customerId,
                  loginCustomerId: googleData?.loginCustomerId,
                  adAccountId: metaData?.adAccountId,
                })}
              >
                <td className={styles.td}>
                  <button
                    className={styles.expandBtn}
                    onClick={() => handleToggleCampaign(campaign)}
                    type="button"
                    aria-label={isExpanded ? `Recolher campanha ${campaign.name}` : `Expandir campanha ${campaign.name}`}
                    aria-expanded={isExpanded}
                  >
                    {isLoadingCampaign ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                </td>
                <td className={`${styles.td} ${styles.center}`}>
                  <div className={styles.toggleWrapper}>
                    {isStatusLoading(campaign) ? (
                      <Loader2 size={14} className={styles.spinner} />
                    ) : (
                      <Switch
                        size="sm"
                        density="compact"
                        checked={isActive(getEffectiveStatus(campaign))}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            handleEnable(campaign)
                          } else {
                            handlePause(campaign)
                          }
                        }}
                        disabled={campaign.status === 'REMOVED' || campaign.status === 'DELETED' || campaign.status === 'ARCHIVED'}
                        aria-label={`Ativar/pausar campanha ${campaign.name}`}
                      />
                    )}
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.idCell} title={campaign.id}>{campaign.id}</span>
                </td>
                {columnVisibility.name && (
                  <td className={styles.td} data-column-key="name">
                    <div className={styles.campaignCell}>
                      <PlatformBadge platform={campaign.platform} size="sm" />
                      <div className={styles.campaignInfo}>
                        <div className={styles.campaignNameRow}>
                          <span className={styles.campaignName} title={campaign.name}>
                            {campaign.name}
                          </span>
                          {alvobotCampaignIds?.has(campaign.id) && <AlvobotBadge />}
                        </div>
                        <div className={styles.campaignMeta}>
                          <span className={styles.accountName}>{campaign.accountName}</span>
                          <ObjectiveBadge
                            objective={campaign.objective}
                            specialAdCategories={campaign.specialAdCategories}
                            platform={campaign.platform}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                )}
                {columnVisibility.budget && (
                  <td className={`${styles.td} ${styles.right}`} data-column-key="budget">
                    {campaign.isABO ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={styles.aboBadge}>
                            ABO
                            <HelpCircle size={12} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Esta campanha usa ABO (Ad Set Budget Optimization). O orçamento é definido individualmente em cada conjunto de anúncios.</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className={styles.budget}>
                        R$ {campaign.budget.toFixed(2)}
                        <span className={styles.budgetType}>/{campaign.budgetType === 'daily' ? 'dia' : 'total'}</span>
                      </span>
                    )}
                  </td>
                )}
                {renderMetricCells({
                  impressions: campaign.impressions,
                  clicks: campaign.clicks,
                  ctr: campaign.ctr,
                  cpc: campaign.cpc,
                  cost: campaign.cost,
                  conversions: campaign.conversions,
                  cpa: campaign.cpa,
                  roas: campaign.roas,
                  reach: campaign.reach,
                  frequency: campaign.frequency,
                  landingPageViews: campaign.landingPageViews,
                })}
                <td className={`${styles.td} ${styles.center}`}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={styles.actionButton}
                        type="button"
                        aria-label={`Ações para campanha ${campaign.name}`}
                      >
                        {isStatusLoading(campaign) ? (
                          <Loader2 size={14} className={styles.spinner} />
                        ) : (
                          <MoreVertical size={16} />
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={styles.actionsDropdown}>
                      {isActive(getEffectiveStatus(campaign)) ? (
                        <DropdownMenuItem onClick={() => handlePause(campaign)}>
                          <Pause size={14} />
                          <span>Pausar campanha</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleEnable(campaign)}>
                          <Play size={14} />
                          <span>Ativar campanha</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEditBudget(campaign)}>
                        <DollarSign size={14} />
                        <span>Editar orçamento</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(campaign.id)}>
                        <Copy size={14} />
                        <span>Copiar ID</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const url = campaign.platform === 'google'
                            ? getGoogleAdsUrl({
                                level: 'campaign',
                                customerId: googleData?.customerId || campaign.accountId,
                                campaignId: campaign.id,
                              })
                            : getMetaAdsUrl({
                                level: 'campaign',
                                adAccountId: metaData?.adAccountId || campaign.accountId,
                                campaignId: campaign.id,
                              })
                          window.open(url, '_blank', 'noopener,noreferrer')
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>Ver na plataforma</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )

            // Level 1: Ad Groups (Google) or Ad Sets (Meta)
            if (isExpanded && hierarchy) {
              // Google Ad Groups
              if (campaign.platform === 'google' && hierarchy.adGroups) {
                hierarchy.adGroups.forEach((adGroup) => {
                  const adGroupKey = `${campaignKey}:${adGroup.id}`
                  const isAdGroupExpanded = expandedAdGroups.has(adGroupKey)
                  const isLoadingAds = loadingAdGroupAds.has(adGroupKey)
                  // Get ads from state (fetched on expand) - no longer bundled with ad group
                  const adsForGroup = adGroupAdsData.get(adGroupKey) || []

                  rows.push(
                    <tr
                      key={adGroupKey}
                      className={styles.rowLevel1}
                      onMouseEnter={() => onPrefetchAdSetHierarchy?.({
                        adSetId: adGroup.id,
                        platform: campaign.platform,
                        connectionId: campaign.connectionId,
                        customerId: googleData?.customerId,
                        loginCustomerId: googleData?.loginCustomerId,
                      })}
                    >
                      <td className={styles.td}>
                        <button
                          className={styles.expandBtn}
                          onClick={() => handleToggleAdGroup(
                            campaignKey,
                            adGroup.id,
                            campaign.connectionId,
                            {
                              customerId: googleData?.customerId,
                              loginCustomerId: googleData?.loginCustomerId,
                            }
                          )}
                          type="button"
                          aria-label={isAdGroupExpanded ? `Recolher grupo ${adGroup.name}` : `Expandir grupo ${adGroup.name}`}
                          aria-expanded={isAdGroupExpanded}
                        >
                          {isLoadingAds ? (
                            <Spinner size="sm" />
                          ) : isAdGroupExpanded ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                        </button>
                      </td>
                      <td className={`${styles.td} ${styles.center}`}>
                        <div className={styles.toggleWrapper}>
                          <Switch
                            size="sm"
                            density="compact"
                            checked={isActive(adGroup.status)}
                            onCheckedChange={(checked) => {
                              const mutation = checked ? enableUnifiedMutation : pauseUnifiedMutation
                              mutation.mutate({
                                platform: 'google',
                                level: 'adset',
                                objectId: adGroup.id,
                                connectionId: campaign.connectionId,
                              })
                            }}
                            disabled={adGroup.status === 'REMOVED' || adGroup.status === 'DELETED'}
                            aria-label={`Ativar/pausar grupo de anúncios ${adGroup.name}`}
                          />
                        </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.idCell} title={adGroup.id}>{adGroup.id}</span>
                      </td>
                      {columnVisibility.name && (
                        <td className={styles.td} data-column-key="name">
                          <div className={styles.level1Name}>
                            <span className={styles.levelLabel}>Grupo:</span>
                            <span title={adGroup.name}>{adGroup.name}</span>
                            {adGroup.type && (
                              <span className={styles.typeBadge}>{getObjectTypeLabel(adGroup.type)}</span>
                            )}
                          </div>
                        </td>
                      )}
                      {columnVisibility.budget && (
                        <td className={`${styles.td} ${styles.right}`} data-column-key="budget">
                          {adGroup.cpcBid ? `R$ ${adGroup.cpcBid.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {renderMetricCells({
                        impressions: adGroup.metrics?.impressions,
                        clicks: adGroup.metrics?.clicks,
                        ctr: adGroup.metrics?.ctr,
                        cpc: adGroup.metrics?.clicks ? (adGroup.metrics.cost || 0) / adGroup.metrics.clicks : 0,
                        cost: adGroup.metrics?.cost,
                        conversions: adGroup.metrics?.conversions,
                        cpa: adGroup.metrics?.cpa,
                      })}
                      <td className={`${styles.td} ${styles.center}`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={styles.actionButton}
                              type="button"
                              aria-label={`Ações para grupo ${adGroup.name}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={styles.actionsDropdown}>
                            {isActive(adGroup.status) ? (
                              <DropdownMenuItem onClick={() => {
                                pauseUnifiedMutation.mutate({
                                  platform: 'google',
                                  level: 'adset',
                                  objectId: adGroup.id,
                                  connectionId: campaign.connectionId,
                                })
                              }}>
                                <Pause size={14} />
                                <span>Pausar grupo</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => {
                                enableUnifiedMutation.mutate({
                                  platform: 'google',
                                  level: 'adset',
                                  objectId: adGroup.id,
                                  connectionId: campaign.connectionId,
                                })
                              }}>
                                <Play size={14} />
                                <span>Ativar grupo</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyToClipboard(adGroup.id)}>
                              <Copy size={14} />
                              <span>Copiar ID</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const url = getGoogleAdsUrl({
                                  level: 'adgroup',
                                  customerId: googleData?.customerId || campaign.accountId,
                                  campaignId: campaign.id,
                                  adGroupId: adGroup.id,
                                })
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }}
                            >
                              <ExternalLink size={14} />
                              <span>Ver na plataforma</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )

                  // Level 2: Ads (Google) - fetched on-demand from API
                  if (isAdGroupExpanded && adsForGroup.length > 0) {
                    adsForGroup.forEach((ad) => {
                      const adKey = `${adGroupKey}:${ad.id}`
                      const isAdExpanded = expandedAds.has(adKey)

                      rows.push(
                        <tr key={adKey} className={styles.rowLevel2}>
                          <td className={styles.td}>
                            <button
                              className={styles.expandBtn}
                              onClick={() => handleToggleAd(adKey, undefined, undefined, 'google')}
                              type="button"
                              aria-label={isAdExpanded ? `Recolher anúncio ${ad.name || ad.id}` : `Expandir anúncio ${ad.name || ad.id}`}
                              aria-expanded={isAdExpanded}
                            >
                              {isAdExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          </td>
                          <td className={`${styles.td} ${styles.center}`}>
                            <div className={styles.toggleWrapper}>
                              <Switch
                                size="sm"
                                density="compact"
                                checked={isActive(ad.status)}
                                onCheckedChange={(checked) => {
                                  const mutation = checked ? enableUnifiedMutation : pauseUnifiedMutation
                                  mutation.mutate({
                                    platform: 'google',
                                    level: 'ad',
                                    objectId: ad.id,
                                    connectionId: campaign.connectionId,
                                  })
                                }}
                                disabled={ad.status === 'REMOVED' || ad.status === 'DELETED'}
                                aria-label={`Ativar/pausar anúncio ${ad.name || ad.id}`}
                              />
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.idCell} title={ad.id}>{ad.id}</span>
                          </td>
                          {columnVisibility.name && (
                            <td className={styles.td} data-column-key="name">
                              <div className={styles.level2Name}>
                                <span className={styles.levelLabel}>Anúncio:</span>
                                <span title={ad.name}>{ad.name || `Ad ${ad.id}`}</span>
                                {ad.type && (
                                  <span className={styles.typeBadge}>{getObjectTypeLabel(ad.type)}</span>
                                )}
                                {ad.finalUrls?.[0] && (
                                  <a
                                    href={ad.finalUrls[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.urlLink}
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </td>
                          )}
                          {columnVisibility.budget && (
                            <td className={`${styles.td} ${styles.right}`} data-column-key="budget">-</td>
                          )}
                          {renderMetricCells({
                            impressions: ad.metrics?.impressions,
                            clicks: ad.metrics?.clicks,
                            ctr: ad.metrics?.ctr,
                            cpc: ad.metrics?.clicks ? (ad.metrics.cost || 0) / ad.metrics.clicks : 0,
                            cost: ad.metrics?.cost,
                            conversions: ad.metrics?.conversions,
                            cpa: ad.metrics?.conversions ? (ad.metrics.cost || 0) / ad.metrics.conversions : 0,
                          })}
                          <td className={`${styles.td} ${styles.center}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={styles.actionButton}
                                  type="button"
                                  aria-label={`Ações para anúncio ${ad.name || ad.id}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={styles.actionsDropdown}>
                                {isActive(ad.status) ? (
                                  <DropdownMenuItem onClick={() => {
                                    pauseUnifiedMutation.mutate({
                                      platform: 'google',
                                      level: 'ad',
                                      objectId: ad.id,
                                      connectionId: campaign.connectionId,
                                    })
                                  }}>
                                    <Pause size={14} />
                                    <span>Pausar anúncio</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => {
                                    enableUnifiedMutation.mutate({
                                      platform: 'google',
                                      level: 'ad',
                                      objectId: ad.id,
                                      connectionId: campaign.connectionId,
                                    })
                                  }}>
                                    <Play size={14} />
                                    <span>Ativar anúncio</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => copyToClipboard(ad.id)}>
                                  <Copy size={14} />
                                  <span>Copiar ID</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = getGoogleAdsUrl({
                                      level: 'ad',
                                      customerId: googleData?.customerId || campaign.accountId,
                                      campaignId: campaign.id,
                                      adGroupId: adGroup.id,
                                      adId: ad.id,
                                    })
                                    window.open(url, '_blank', 'noopener,noreferrer')
                                  }}
                                >
                                  <ExternalLink size={14} />
                                  <span>Ver na plataforma</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )

                      // Level 3: Creative details (Google) - Always show when expanded
                      if (isAdExpanded) {
                        // Get tracking URL parameters from ad level (already resolved hierarchy in backend)
                        const trackingUrlTemplate = ad.trackingUrlTemplate || hierarchy.trackingUrlTemplate
                        const finalUrlSuffix = ad.finalUrlSuffix || hierarchy.finalUrlSuffix
                        const urlCustomParameters = ad.urlCustomParameters || ad.campaignUrlCustomParameters

                        const hasAnyContent = (ad.headlines && ad.headlines.length > 0) ||
                                             (ad.descriptions && ad.descriptions.length > 0) ||
                                             (ad.finalUrls && ad.finalUrls.length > 0) ||
                                             ad.type || ad.displayUrl || trackingUrlTemplate || finalUrlSuffix ||
                                             ad.callAd || ad.imageAd || ad.responsiveDisplayAd

                        rows.push(
                          <tr key={`${adKey}-details`} className={styles.rowLevel3}>
                            <td className={styles.td} colSpan={detailColSpan + 4}>
                              <div className={styles.creativeDetails}>
                                {/* Left Column: Text Content */}
                                <div className={styles.creativeContent}>
                                  {/* Meta badges row */}
                                  {ad.type && (
                                    <div className={styles.creativeMetaRow}>
                                      <span className={styles.creativeMetaItem}>
                                        <span className={styles.creativeMetaLabel}>Tipo:</span>
                                        <span className={styles.creativeMetaValue}>{getObjectTypeLabel(ad.type)}</span>
                                      </span>
                                      {ad.devicePreference && (
                                        <span className={styles.creativeMetaItem}>
                                          <span className={styles.creativeMetaLabel}>Dispositivo:</span>
                                          <span className={styles.creativeMetaValue}>{ad.devicePreference}</span>
                                        </span>
                                      )}
                                      {ad.addedByGoogleAds && (
                                        <span className={styles.creativeMetaItem}>
                                          <span className={styles.creativeMetaValue}>Criado pelo Google</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* RSA/ETA Headlines & Descriptions */}
                                  {ad.headlines && ad.headlines.length > 0 && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Títulos ({ad.headlines.length})</span>
                                      <div className={styles.creativeList}>
                                        {ad.headlines.map((h, i) => (
                                          <span key={i} className={styles.creativeItem}>{h}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {ad.descriptions && ad.descriptions.length > 0 && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Descrições ({ad.descriptions.length})</span>
                                      <div className={styles.creativeList}>
                                        {ad.descriptions.map((d, i) => (
                                          <span key={i} className={styles.creativeItem}>{d}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Call Ad Details */}
                                  {ad.callAd && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Anúncio de Ligação</span>
                                      <div className={styles.creativeList}>
                                        {ad.callAd.businessName && (
                                          <span className={styles.creativeItem}><strong>Empresa:</strong> {ad.callAd.businessName}</span>
                                        )}
                                        {ad.callAd.phoneNumber && (
                                          <span className={styles.creativeItem}><strong>Telefone:</strong> +{ad.callAd.countryCode} {ad.callAd.phoneNumber}</span>
                                        )}
                                        {ad.callAd.headline1 && (
                                          <span className={styles.creativeItem}><strong>Título 1:</strong> {ad.callAd.headline1}</span>
                                        )}
                                        {ad.callAd.headline2 && (
                                          <span className={styles.creativeItem}><strong>Título 2:</strong> {ad.callAd.headline2}</span>
                                        )}
                                        {ad.callAd.description1 && (
                                          <span className={styles.creativeItem}><strong>Descrição 1:</strong> {ad.callAd.description1}</span>
                                        )}
                                        {ad.callAd.description2 && (
                                          <span className={styles.creativeItem}><strong>Descrição 2:</strong> {ad.callAd.description2}</span>
                                        )}
                                        {ad.callAd.callTracked !== undefined && (
                                          <span className={styles.creativeItem}><strong>Rastreamento:</strong> {ad.callAd.callTracked ? 'Ativado' : 'Desativado'}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Image Ad Details */}
                                  {ad.imageAd && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Anúncio de Imagem</span>
                                      <div className={styles.creativeList}>
                                        {ad.imageAd.name && (
                                          <span className={styles.creativeItem}><strong>Nome:</strong> {ad.imageAd.name}</span>
                                        )}
                                        {ad.imageAd.pixelWidth && ad.imageAd.pixelHeight && (
                                          <span className={styles.creativeItem}><strong>Dimensões:</strong> {ad.imageAd.pixelWidth}x{ad.imageAd.pixelHeight}</span>
                                        )}
                                        {ad.imageAd.mimeType && (
                                          <span className={styles.creativeItem}><strong>Formato:</strong> {ad.imageAd.mimeType}</span>
                                        )}
                                        {ad.imageAd.imageUrl && (
                                          <a href={ad.imageAd.imageUrl} target="_blank" rel="noopener noreferrer" className={styles.urlItem}>
                                            <ExternalLink size={12} />
                                            Ver imagem
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Responsive Display Ad Details */}
                                  {ad.responsiveDisplayAd && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Anúncio Responsivo de Display</span>
                                      <div className={styles.creativeList}>
                                        {ad.responsiveDisplayAd.businessName && (
                                          <span className={styles.creativeItem}><strong>Empresa:</strong> {ad.responsiveDisplayAd.businessName}</span>
                                        )}
                                        {ad.responsiveDisplayAd.longHeadline && (
                                          <span className={styles.creativeItem}><strong>Título longo:</strong> {ad.responsiveDisplayAd.longHeadline}</span>
                                        )}
                                        {ad.responsiveDisplayAd.headlines && ad.responsiveDisplayAd.headlines.length > 0 && (
                                          <>
                                            <span className={styles.creativeItem}><strong>Títulos curtos:</strong></span>
                                            {ad.responsiveDisplayAd.headlines.map((h, i) => (
                                              <span key={i} className={styles.creativeItem}>• {h}</span>
                                            ))}
                                          </>
                                        )}
                                        {ad.responsiveDisplayAd.descriptions && ad.responsiveDisplayAd.descriptions.length > 0 && (
                                          <>
                                            <span className={styles.creativeItem}><strong>Descrições:</strong></span>
                                            {ad.responsiveDisplayAd.descriptions.map((d, i) => (
                                              <span key={i} className={styles.creativeItem}>• {d}</span>
                                            ))}
                                          </>
                                        )}
                                        {ad.responsiveDisplayAd.callToActionText && (
                                          <span className={styles.creativeItem}><strong>CTA:</strong> {ad.responsiveDisplayAd.callToActionText}</span>
                                        )}
                                        {ad.responsiveDisplayAd.promoText && (
                                          <span className={styles.creativeItem}><strong>Promoção:</strong> {ad.responsiveDisplayAd.promoText}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* URLs Section */}
                                  {ad.finalUrls && ad.finalUrls.length > 0 && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>URL de destino</span>
                                      <div className={styles.creativeList}>
                                        {ad.finalUrls.map((url, i) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.urlItem}>
                                            <ExternalLink size={12} />
                                            {url}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {ad.finalMobileUrls && ad.finalMobileUrls.length > 0 && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>URL mobile</span>
                                      <div className={styles.creativeList}>
                                        {ad.finalMobileUrls.map((url, i) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.urlItem}>
                                            <ExternalLink size={12} />
                                            {url}
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {ad.displayUrl && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>URL de exibição</span>
                                      <span className={styles.creativeItem}>
                                        {ad.displayUrl}
                                        {(ad.path1 || ad.path2) && (
                                          <span> / {ad.path1}{ad.path2 ? ` / ${ad.path2}` : ''}</span>
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {/* Tracking URL Parameters */}
                                  {(trackingUrlTemplate || finalUrlSuffix || (urlCustomParameters && urlCustomParameters.length > 0)) && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Parâmetros de URL / UTM</span>
                                      {trackingUrlTemplate && (
                                        <div className={styles.urlParamRow}>
                                          <span className={styles.urlParamLabel}>Template de rastreamento:</span>
                                          <code className={styles.codeBlock}>{trackingUrlTemplate}</code>
                                        </div>
                                      )}
                                      {finalUrlSuffix && (
                                        <div className={styles.urlParamRow}>
                                          <span className={styles.urlParamLabel}>Sufixo de URL (UTM):</span>
                                          <code className={styles.codeBlock}>{finalUrlSuffix}</code>
                                        </div>
                                      )}
                                      {urlCustomParameters && urlCustomParameters.length > 0 && (
                                        <div className={styles.urlParamRow}>
                                          <span className={styles.urlParamLabel}>Parâmetros personalizados:</span>
                                          <code className={styles.codeBlock}>
                                            {urlCustomParameters.map(p => `{_${p.key}}=${p.value}`).join('&')}
                                          </code>
                                        </div>
                                      )}
                                      {/* Show inheritance info */}
                                      {(ad.adGroupTrackingUrlTemplate || ad.adGroupFinalUrlSuffix ||
                                        ad.campaignTrackingUrlTemplate || ad.campaignFinalUrlSuffix) && (
                                        <div className={styles.urlParamRow}>
                                          <span className={styles.urlParamLabel} style={{ fontSize: '11px', opacity: 0.7 }}>
                                            (Valores herdados: {[
                                              ad.adGroupTrackingUrlTemplate && 'Template do grupo',
                                              ad.adGroupFinalUrlSuffix && 'Sufixo do grupo',
                                              ad.campaignTrackingUrlTemplate && 'Template da campanha',
                                              ad.campaignFinalUrlSuffix && 'Sufixo da campanha'
                                            ].filter(Boolean).join(', ')})
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {!hasAnyContent && (
                                    <div className={styles.noContent}>
                                      <span>Nenhum detalhe de criativo disponível para este anúncio.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                    })
                  }
                })
              }

              // Meta Ad Sets
              if (campaign.platform === 'meta' && hierarchy.adSets) {
                const metaData = campaign.platformData as MetaCampaignMetrics
                hierarchy.adSets.forEach((adSet) => {
                  const adSetKey = `${campaignKey}:${adSet.id}`
                  const isAdSetExpanded = expandedAdSets.has(adSetKey)
                  const isLoadingAds = loadingAdSetAds.has(adSetKey)
                  // Get ads from separate state (fetched on expand) or from hierarchy (for backwards compat)
                  const adsForSet = adSetAdsData.get(adSetKey) || adSet.ads || []

                  rows.push(
                    <tr
                      key={adSetKey}
                      className={styles.rowLevel1}
                      onMouseEnter={() => onPrefetchAdSetHierarchy?.({
                        adSetId: adSet.id,
                        platform: campaign.platform,
                        connectionId: campaign.connectionId,
                        adAccountId: metaData.adAccountId,
                      })}
                    >
                      <td className={styles.td}>
                        <button
                          className={styles.expandBtn}
                          onClick={() => handleToggleAdSet(
                            campaignKey,
                            adSet.id,
                            campaign.connectionId,
                            'meta',
                            { adAccountId: metaData.adAccountId }
                          )}
                          type="button"
                          aria-label={isAdSetExpanded ? `Recolher conjunto ${adSet.name}` : `Expandir conjunto ${adSet.name}`}
                          aria-expanded={isAdSetExpanded}
                        >
                          {isLoadingAds ? (
                            <Loader2 size={12} className={styles.spinner} />
                          ) : isAdSetExpanded ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                        </button>
                      </td>
                      <td className={`${styles.td} ${styles.center}`}>
                        <div className={styles.toggleWrapper}>
                          <Switch
                            size="sm"
                            density="compact"
                            checked={isActive(adSet.status)}
                            onCheckedChange={(checked) => {
                              const mutation = checked ? enableUnifiedMutation : pauseUnifiedMutation
                              mutation.mutate({
                                platform: 'meta',
                                level: 'adset',
                                objectId: adSet.id,
                                connectionId: campaign.connectionId,
                                adAccountId: metaData.adAccountId,
                              })
                            }}
                            disabled={adSet.status === 'DELETED' || adSet.status === 'ARCHIVED'}
                            aria-label={`Ativar/pausar conjunto de anúncios ${adSet.name}`}
                          />
                          </div>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.idCell} title={adSet.id}>{adSet.id}</span>
                      </td>
                      {columnVisibility.name && (
                        <td className={styles.td} data-column-key="name">
                          <div className={styles.level1Name}>
                            <span className={styles.levelLabel}>Conjunto:</span>
                            <span title={adSet.name}>{adSet.name}</span>
                            {adSet.optimizationGoal && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={styles.typeBadge}>
                                    {getOptimizationGoalInfo(adSet.optimizationGoal)?.label || adSet.optimizationGoal}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{getOptimizationGoalInfo(adSet.optimizationGoal)?.description || adSet.optimizationGoal}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      )}
                      {columnVisibility.budget && (
                        <td className={`${styles.td} ${styles.right}`} data-column-key="budget">
                          {adSet.dailyBudget ? `R$ ${adSet.dailyBudget.toFixed(2)}/dia` : adSet.lifetimeBudget ? `R$ ${adSet.lifetimeBudget.toFixed(2)}` : '-'}
                        </td>
                      )}
                      {renderMetricCells({
                        impressions: adSet.metrics?.impressions,
                        clicks: adSet.metrics?.clicks,
                        ctr: adSet.metrics?.ctr,
                        cpc: adSet.metrics?.clicks ? (adSet.metrics.spend || 0) / adSet.metrics.clicks : 0,
                        cost: adSet.metrics?.spend,
                        conversions: adSet.metrics?.conversions,
                        cpa: adSet.metrics?.cpa,
                      })}
                      <td className={`${styles.td} ${styles.center}`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={styles.actionButton}
                              type="button"
                              aria-label={`Ações para conjunto ${adSet.name}`}
                            >
                              <MoreVertical size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className={styles.actionsDropdown}>
                            {isActive(adSet.status) ? (
                              <DropdownMenuItem onClick={() => {
                                pauseUnifiedMutation.mutate({
                                  platform: 'meta',
                                  level: 'adset',
                                  objectId: adSet.id,
                                  connectionId: campaign.connectionId,
                                  adAccountId: metaData.adAccountId,
                                })
                              }}>
                                <Pause size={14} />
                                <span>Pausar conjunto</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => {
                                enableUnifiedMutation.mutate({
                                  platform: 'meta',
                                  level: 'adset',
                                  objectId: adSet.id,
                                  connectionId: campaign.connectionId,
                                  adAccountId: metaData.adAccountId,
                                })
                              }}>
                                <Play size={14} />
                                <span>Ativar conjunto</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => copyToClipboard(adSet.id)}>
                              <Copy size={14} />
                              <span>Copiar ID</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const url = getMetaAdsUrl({
                                  level: 'adset',
                                  adAccountId: metaData.adAccountId,
                                  campaignId: campaign.id,
                                  adSetId: adSet.id,
                                })
                                window.open(url, '_blank', 'noopener,noreferrer')
                              }}
                            >
                              <ExternalLink size={14} />
                              <span>Ver na plataforma</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )

                  // Level 2: Ads (Meta)
                  if (isAdSetExpanded && adsForSet.length > 0) {
                    adsForSet.forEach((ad) => {
                      const adKey = `${adSetKey}:${ad.id}`
                      const isAdExpanded = expandedAds.has(adKey)

                      rows.push(
                        <tr key={adKey} className={styles.rowLevel2}>
                          <td className={styles.td}>
                            <button
                              className={styles.expandBtn}
                              onClick={() => handleToggleAd(adKey, ad.id, campaign.connectionId, 'meta')}
                              type="button"
                              aria-label={isAdExpanded ? `Recolher anúncio ${ad.name}` : `Expandir anúncio ${ad.name}`}
                              aria-expanded={isAdExpanded}
                            >
                              {isAdExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          </td>
                          <td className={`${styles.td} ${styles.center}`}>
                            <div className={styles.toggleWrapper}>
                              <Switch
                                size="sm"
                                density="compact"
                                checked={isActive(ad.status)}
                                onCheckedChange={(checked) => {
                                  const mutation = checked ? enableUnifiedMutation : pauseUnifiedMutation
                                  mutation.mutate({
                                    platform: 'meta',
                                    level: 'ad',
                                    objectId: ad.id,
                                    connectionId: campaign.connectionId,
                                    adAccountId: metaData.adAccountId,
                                  })
                                }}
                                disabled={ad.status === 'DELETED' || ad.status === 'ARCHIVED'}
                                aria-label={`Ativar/pausar anúncio ${ad.name}`}
                              />
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.idCell} title={ad.id}>{ad.id}</span>
                          </td>
                          {columnVisibility.name && (
                            <td className={styles.td} data-column-key="name">
                              <div className={styles.level2Name}>
                                <span className={styles.levelLabel}>Anúncio:</span>
                                <span title={ad.name}>{ad.name}</span>
                                {ad.previewUrl && (
                                  <a
                                    href={ad.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.urlLink}
                                    title="Ver preview"
                                  >
                                    <ExternalLink size={12} />
                                  </a>
                                )}
                              </div>
                            </td>
                          )}
                          {columnVisibility.budget && (
                            <td className={`${styles.td} ${styles.right}`} data-column-key="budget">-</td>
                          )}
                          {renderMetricCells({
                            impressions: ad.metrics?.impressions,
                            clicks: ad.metrics?.clicks,
                            ctr: ad.metrics?.ctr,
                            cpc: ad.metrics?.clicks ? (ad.metrics.spend || 0) / ad.metrics.clicks : 0,
                            cost: ad.metrics?.spend,
                            conversions: ad.metrics?.conversions,
                            cpa: ad.metrics?.cpa,
                          })}
                          <td className={`${styles.td} ${styles.center}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className={styles.actionButton}
                                  type="button"
                                  aria-label={`Ações para anúncio ${ad.name}`}
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={styles.actionsDropdown}>
                                {isActive(ad.status) ? (
                                  <DropdownMenuItem onClick={() => {
                                    pauseUnifiedMutation.mutate({
                                      platform: 'meta',
                                      level: 'ad',
                                      objectId: ad.id,
                                      connectionId: campaign.connectionId,
                                      adAccountId: metaData.adAccountId,
                                    })
                                  }}>
                                    <Pause size={14} />
                                    <span>Pausar anúncio</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => {
                                    enableUnifiedMutation.mutate({
                                      platform: 'meta',
                                      level: 'ad',
                                      objectId: ad.id,
                                      connectionId: campaign.connectionId,
                                      adAccountId: metaData.adAccountId,
                                    })
                                  }}>
                                    <Play size={14} />
                                    <span>Ativar anúncio</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => copyToClipboard(ad.id)}>
                                  <Copy size={14} />
                                  <span>Copiar ID</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = getMetaAdsUrl({
                                      level: 'ad',
                                      adAccountId: metaData.adAccountId,
                                      campaignId: campaign.id,
                                      adSetId: adSet.id,
                                      adId: ad.id,
                                    })
                                    window.open(url, '_blank', 'noopener,noreferrer')
                                  }}
                                >
                                  <ExternalLink size={14} />
                                  <span>Ver na plataforma</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      )

                      // Level 3: Creative details (Meta) - Always show when expanded
                      if (isAdExpanded) {
                        // Get creative details from cache or fallback to ad.creative
                        const cachedCreative = creativeDetailsCache.get(adKey)
                        const isCreativeLoading = loadingCreativeDetails.has(adKey) && !cachedCreative

                        // Normalize creative fields between API (snake_case) and table data (camelCase)
                        const creativeTitle = cachedCreative?.title ?? ad.creative?.title
                        const creativeBody = cachedCreative?.body ?? ad.creative?.body
                        const creativeLinkUrl = cachedCreative?.link_url ?? ad.creative?.linkUrl
                        const creativeCallToAction =
                          cachedCreative?.call_to_action_type ?? ad.creative?.callToAction
                        const creativeImageUrlFallback = ad.creative?.imageUrl
                        const creativeVideoUrlFallback = ad.creative?.videoUrl
                        
                        // Check if has video first
                        const videoEmbedUrl =
                          cachedCreative?.videoEmbedUrl ||
                          cachedCreative?.object_story_spec?.video_data?.videoEmbedUrl

                        const videoSourceUrl =
                          cachedCreative?.videoSourceUrl ||
                          cachedCreative?.object_story_spec?.video_data?.videoSourceUrl

                        const instagramPermalinkUrl = cachedCreative?.instagram_permalink_url
                        const urlTags = cachedCreative?.url_tags
                        const objectType = cachedCreative?.object_type

                        // Parse page_welcome_message (conversation configurator for message ads)
                        const rawWelcomeMessage =
                          cachedCreative?.object_story_spec?.link_data?.page_welcome_message ??
                          cachedCreative?.object_story_spec?.video_data?.page_welcome_message
                        let parsedWelcomeMessage: PageWelcomeMessage | null = null
                        if (rawWelcomeMessage) {
                          try {
                            parsedWelcomeMessage =
                              typeof rawWelcomeMessage === 'string'
                                ? JSON.parse(rawWelcomeMessage)
                                : rawWelcomeMessage
                          } catch {
                            // Invalid JSON, ignore
                          }
                        }
                        const welcomeGreeting =
                          parsedWelcomeMessage?.text_format?.message?.text
                        const welcomeIceBreakers =
                          parsedWelcomeMessage?.text_format?.message?.ice_breakers
                        const hasConversationConfig = !!(welcomeGreeting || (welcomeIceBreakers && welcomeIceBreakers.length > 0))

                        const hasVideo = !!(videoSourceUrl || videoEmbedUrl || creativeVideoUrlFallback)
                        
                        // Use high-res image if available (prioritize 1024 > 512 > original)
                        const imageUrl = cachedCreative?.imageUrls?.url_1024 
                          || cachedCreative?.imageUrls?.url_512 
                          || cachedCreative?.image_url 
                          || creativeImageUrlFallback
                        
                        const hasAnyContent = creativeTitle || creativeBody ||
                                             creativeCallToAction || creativeLinkUrl ||
                                             imageUrl || hasVideo || ad.thumbnailUrl ||
                                             hasConversationConfig
                        const ctaLabel = creativeCallToAction ? getCTALabel(creativeCallToAction) : null

                        // Compute external URL once for media
                        const mediaExternalUrl = instagramPermalinkUrl || 
                          (cachedCreative?.effective_object_story_id 
                            ? `https://www.facebook.com/${cachedCreative.effective_object_story_id}`
                            : undefined)

                        rows.push(
                          <tr key={`${adKey}-details`} className={styles.rowLevel3}>
                            <td className={styles.td} colSpan={detailColSpan + 4}>
                              <div className={styles.creativeDetails}>
                                {/* Left Column: Text Content */}
                                <div className={styles.creativeContent}>
                                  {/* Meta badges row */}
                                  {(objectType || ctaLabel) && (
                                    <div className={styles.creativeMetaRow}>
                                      {objectType && (
                                        <span className={styles.creativeMetaItem}>
                                          <span className={styles.creativeMetaLabel}>Tipo:</span>
                                          <span className={styles.creativeMetaValue}>
                                            {getObjectTypeLabel(objectType)}
                                          </span>
                                        </span>
                                      )}
                                      {ctaLabel && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className={styles.creativeMetaItem}>
                                              <span className={styles.creativeMetaLabel}>CTA:</span>
                                              <span className={styles.creativeMetaValue}>{ctaLabel}</span>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>{ctaLabel}</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  )}

                                  {creativeTitle && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Título</span>
                                      <span className={styles.creativeItem}>{creativeTitle}</span>
                                    </div>
                                  )}

                                  {creativeBody && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Texto do anúncio</span>
                                      {(() => {
                                        const bodyKey = `${adKey}:body`
                                        const isExpanded = expandedCreativeTexts.has(bodyKey)
                                        const isLong = creativeBody.length > 140

                                        return (
                                          <div className={styles.creativeTextWrapper}>
                                            <span
                                              className={`${styles.creativeText} ${!isExpanded ? styles.creativeTextTruncated : ''}`}
                                            >
                                              {creativeBody}
                                            </span>
                                            {isLong && (
                                              <button
                                                type="button"
                                                className={styles.creativeTextToggle}
                                                onClick={() => handleToggleCreativeText(bodyKey)}
                                              >
                                                {isExpanded ? 'Ver menos' : 'Ver mais'}
                                              </button>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                  )}

                                  {creativeLinkUrl && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>URL de destino</span>
                                      <a href={creativeLinkUrl} target="_blank" rel="noopener noreferrer" className={styles.urlItem}>
                                        <ExternalLink size={12} />
                                        {creativeLinkUrl}
                                      </a>
                                    </div>
                                  )}

                                  {urlTags && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>Parâmetros UTM</span>
                                      <code className={styles.codeBlock}>{urlTags}</code>
                                    </div>
                                  )}

                                  {/* Conversation configurator (ice breakers for message ads) */}
                                  {hasConversationConfig && (
                                    <div className={styles.creativeSection}>
                                      <span className={styles.creativeLabel}>
                                        <MessageCircle size={13} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                        Configurador de conversa
                                      </span>
                                      <div className={styles.conversationConfig}>
                                        {welcomeGreeting && (
                                          <div className={styles.conversationGreeting}>
                                            <span className={styles.conversationGreetingLabel}>Saudação</span>
                                            <span className={styles.conversationGreetingText}>{welcomeGreeting}</span>
                                          </div>
                                        )}
                                        {welcomeIceBreakers && welcomeIceBreakers.length > 0 && (
                                          <div className={styles.conversationIceBreakers}>
                                            <span className={styles.conversationIceBreakersLabel}>Perguntas e respostas</span>
                                            {welcomeIceBreakers.map((ib, idx) => (
                                              <div key={idx} className={styles.iceBreaker}>
                                                <span className={styles.iceBreakerNumber}>{idx + 1}</span>
                                                <div className={styles.iceBreakerContent}>
                                                  <span className={styles.iceBreakerTitle}>{ib.title}</span>
                                                  {ib.response && (
                                                    <span className={styles.iceBreakerResponse}>{ib.response}</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {!hasAnyContent && (
                                    <div className={styles.noContent}>
                                      <span>Nenhum detalhe disponível para este anúncio.</span>
                                    </div>
                                  )}
                                </div>

                                {/* Right Column: Media Preview */}
                                {(hasVideo || imageUrl || ad.thumbnailUrl) && (
                                  <div className={styles.creativeMediaCard}>
                                    <div className={styles.creativeMediaHeader}>
                                      <span className={styles.creativeMediaLabel}>
                                        {hasVideo ? 'Preview' : 'Preview'}
                                      </span>
                                      {objectType && (
                                        <span className={styles.creativeTypeTag}>
                                          {getObjectTypeLabel(objectType)}
                                        </span>
                                      )}
                                    </div>
                                    {isCreativeLoading ? (
                                      <div className={styles.creativeLoading}>
                                        <Loader2 size={20} className={styles.creativeLoadingIcon} />
                                        <span>Carregando...</span>
                                      </div>
                                    ) : hasVideo ? (
                                      (() => {
                                        const thumbKey = `${adKey}:video-thumb`
                                        const candidatesRaw = [
                                          cachedCreative?.imageUrls?.url_1024,
                                          cachedCreative?.imageUrls?.url_512,
                                          cachedCreative?.instagramMediaUrlLarge,
                                          cachedCreative?.videoPictureUrl,
                                          cachedCreative?.object_story_spec?.video_data?.videoPictureUrl,
                                          cachedCreative?.object_story_spec?.video_data?.image_url,
                                          cachedCreative?.thumbnail_url,
                                          cachedCreative?.image_url,
                                          ad.thumbnailUrl,
                                        ].filter(Boolean) as string[]
                                        const candidates = Array.from(
                                          new Set(candidatesRaw.flatMap((u) => {
                                            const normalized = normalizeInstagramUrl(u)
                                            return normalized === u ? [u] : [normalized, u]
                                          }))
                                        )
                                        const idx = thumbnailFallbackIndex.get(thumbKey) ?? 0
                                        const src = candidates[Math.min(idx, candidates.length - 1)]

                                        if (!src) {
                                          return <span className={styles.noMediaText}>Sem preview disponível</span>
                                        }

                                        return mediaExternalUrl ? (
                                          <a
                                            href={mediaExternalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.thumbnailLink}
                                            title="Abrir no Instagram/Facebook"
                                          >
                                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                                            <img
                                              src={src}
                                              alt="Preview do vídeo"
                                              className={styles.thumbnail}
                                              loading="lazy"
                                              referrerPolicy="no-referrer"
                                              onError={() => bumpThumbnailFallback(thumbKey, candidates.length)}
                                            />
                                            <span className={styles.externalLinkBadge}>
                                              <ExternalLink size={14} />
                                            </span>
                                          </a>
                                        ) : (
                                          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                                          <img
                                            src={src}
                                            alt="Preview do vídeo"
                                            className={styles.thumbnail}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                            onError={() => bumpThumbnailFallback(thumbKey, candidates.length)}
                                          />
                                        )
                                      })()
                                    ) : imageUrl ? (
                                      mediaExternalUrl ? (
                                        <a
                                          href={mediaExternalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.thumbnailLink}
                                          title="Abrir no Instagram/Facebook"
                                        >
                                          <img
                                            src={imageUrl}
                                            alt="Preview da imagem"
                                            className={styles.thumbnail}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                          <span className={styles.externalLinkBadge}>
                                            <ExternalLink size={14} />
                                          </span>
                                        </a>
                                      ) : (
                                        <img
                                          src={imageUrl}
                                          alt="Preview da imagem"
                                          className={styles.thumbnail}
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      )
                                    ) : ad.thumbnailUrl ? (
                                      mediaExternalUrl ? (
                                        <a
                                          href={mediaExternalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={styles.thumbnailLink}
                                          title="Abrir no Instagram/Facebook"
                                        >
                                          <img
                                            src={ad.thumbnailUrl}
                                            alt="Preview"
                                            className={styles.thumbnail}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                          />
                                          <span className={styles.externalLinkBadge}>
                                            <ExternalLink size={14} />
                                          </span>
                                        </a>
                                      ) : (
                                        <img
                                          src={ad.thumbnailUrl}
                                          alt="Preview"
                                          className={styles.thumbnail}
                                          loading="lazy"
                                          referrerPolicy="no-referrer"
                                        />
                                      )
                                    ) : (
                                      <span className={styles.noMediaText}>Sem preview</span>
                                    )}
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
            }

            return rows
          })}

          {/* Skeleton rows for pending sources during progressive loading */}
          {pendingSources > 0 && paginatedCampaigns.length > 0 && (
            Array.from({ length: Math.min(pendingSources * 3, 9) }).map((_, index) => (
              <tr key={`pending-skeleton-${index}`} className={styles.skeletonRow}>
                <td className={styles.td}><div className={styles.skeletonBtn} /></td>
                <td className={`${styles.td} ${styles.center}`}><div className={styles.skeletonToggle} /></td>
                {visibleColumns.map((col) => (
                  <td key={col.key} className={`${styles.td} ${col.key === 'name' ? '' : styles.right}`}>
                    <div
                      className={`${styles.skeleton} ${col.key === 'name' ? styles.skeletonWide : styles.skeletonNarrow}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    />
                  </td>
                ))}
                <td className={`${styles.td} ${styles.center}`}><div className={styles.skeletonActions} /></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

      {totalItems > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Mostrando {pageStart}–{pageEnd} de {totalItems} campanhas
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationControls}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <div className={styles.pageNumbers}>
                {pageItems.map((item, index) => {
                  if (item === 'ellipsis') {
                    return (
                      <span key={`ellipsis-${index}`} className={styles.pageEllipsis}>
                        …
                      </span>
                    )
                  }
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`${styles.pageButton} ${currentPage === item ? styles.pageButtonActive : ''}`}
                      onClick={() => handlePageChange(item)}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className={styles.pageSizeWrapper}>
            <span className={styles.pageSizeLabel}>Por página:</span>
            <select
              value={String(pageSize)}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPageSizeChange(Number(e.target.value))}
              className={styles.pageSizeSelect}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  )
}

// ============================================
// Normalization Helpers
// ============================================

/**
 * Convert UnifiedAdObject (from new backend API) to UnifiedCampaignRow (for table display)
 * This bridges the gap between the new unified backend response and the existing table component.
 */
export function unifiedAdObjectToRow(item: UnifiedAdObject): UnifiedCampaignRow {
  // Determine the status value - unified API uses ENABLED/PAUSED/REMOVED
  // Table component accepts ACTIVE/PAUSED/ENABLED/REMOVED/DELETED/ARCHIVED
  const status = item.status === 'ENABLED' ? 'ENABLED' : item.status

  // Build platformData from the item for action handlers
  // The table uses platformData to pass to onPause/onEnable/onEditBudget handlers
  const platformData = item.platform === 'google'
    ? {
        // CampaignMetrics shape for Google
        id: item.id,
        name: item.name,
        status: item.status,
        budget: item.budget || 0,
        impressions: item.impressions,
        clicks: item.clicks,
        ctr: item.ctr,
        cost: item.cost,
        conversions: item.conversions,
        roas: item.roas,
        connectionId: item.connectionId,
        connectionName: item.connectionName,
        customerId: item.customerId,
        loginCustomerId: item.loginCustomerId,
        budgetId: item.budgetId,
      }
    : {
        // MetaCampaignMetrics shape for Meta
        id: item.id,
        name: item.name,
        status: item.status === 'ENABLED' ? 'ACTIVE' : item.status,
        effectiveStatus: item.effectiveStatus,
        objective: item.objective || '',
        dailyBudget: item.budgetType === 'daily' ? (item.budget || 0) : 0,
        lifetimeBudget: item.budgetType === 'lifetime' ? (item.budget || 0) : 0,
        budgetType: item.budgetType || 'daily',
        isABO: item.isABO || false,
        bidStrategy: item.bidStrategy,
        specialAdCategories: item.specialAdCategories,
        impressions: item.impressions,
        clicks: item.clicks,
        ctr: item.ctr,
        cpc: item.cpc,
        spend: item.cost,
        reach: item.reach || 0,
        frequency: item.frequency || 0,
        conversions: item.conversions,
        cpa: item.cpa,
        roas: item.roas || 0,
        qualityRanking: item.qualityRanking,
        engagementRateRanking: item.engagementRateRanking,
        conversionRateRanking: item.conversionRateRanking,
        landingPageViews: item.landingPageViews,
        connectionId: item.connectionId,
        connectionName: item.connectionName,
        adAccountId: item.accountId,
        adAccountName: item.accountName,
      }

  return {
    id: item.id,
    platform: item.platform,
    name: item.name,
    accountName: item.accountName,
    accountId: item.accountId,
    connectionId: item.connectionId,
    status: status as UnifiedCampaignRow['status'],
    objective: item.objective,
    budget: item.budget || 0,
    budgetType: item.budgetType || 'daily',
    isABO: item.isABO,
    specialAdCategories: item.specialAdCategories,
    impressions: item.impressions,
    clicks: item.clicks,
    ctr: item.ctr,
    cost: item.cost,
    conversions: item.conversions,
    cpc: item.cpc,
    cpa: item.cpa,
    roas: item.roas,
    reach: item.reach,
    frequency: item.frequency,
    landingPageViews: item.landingPageViews,
    platformData: platformData as CampaignMetrics | MetaCampaignMetrics,
  }
}

// Helper function to normalize Google campaigns to unified format
export function normalizeGoogleCampaign(campaign: CampaignMetrics): UnifiedCampaignRow {
  const cost = campaign.cost || 0
  const clicks = campaign.clicks || 0
  const conversions = campaign.conversions || 0

  return {
    id: campaign.id,
    platform: 'google',
    name: campaign.name,
    accountName: campaign.connectionName || 'Google Ads',
    accountId: campaign.connectionId || '',
    connectionId: campaign.connectionId || '',
    status: campaign.status as UnifiedCampaignRow['status'],
    budget: campaign.budget || 0,
    budgetType: 'daily',
    impressions: campaign.impressions || 0,
    clicks,
    ctr: campaign.ctr || 0,
    cost,
    conversions,
    // Calculated metrics
    cpc: clicks > 0 ? cost / clicks : 0,
    cpa: conversions > 0 ? cost / conversions : 0,
    roas: campaign.roas,
    // Google doesn't have reach/frequency/landingPageViews
    reach: undefined,
    frequency: undefined,
    landingPageViews: undefined,
    platformData: campaign,
  }
}

// Helper function to normalize Meta campaigns to unified format
export function normalizeMetaCampaign(campaign: MetaCampaignMetrics): UnifiedCampaignRow {
  const cost = campaign.spend || 0
  const clicks = campaign.clicks || 0
  const conversions = campaign.conversions || 0

  return {
    id: campaign.id,
    platform: 'meta',
    name: campaign.name,
    accountName: campaign.adAccountName || 'Meta Ads',
    accountId: campaign.adAccountId || '',
    connectionId: campaign.connectionId || '',
    status: campaign.status as UnifiedCampaignRow['status'],
    objective: campaign.objective,
    budget: campaign.dailyBudget || campaign.lifetimeBudget || 0,
    budgetType: campaign.budgetType || 'daily',
    isABO: campaign.isABO,
    specialAdCategories: campaign.specialAdCategories,
    impressions: campaign.impressions || 0,
    clicks,
    ctr: campaign.ctr || 0,
    cost,
    conversions,
    // Calculated metrics (use API values if available, otherwise calculate)
    cpc: campaign.cpc || (clicks > 0 ? cost / clicks : 0),
    cpa: campaign.cpa || (conversions > 0 ? cost / conversions : 0),
    roas: campaign.roas,
    // Meta-specific metrics
    reach: campaign.reach,
    frequency: campaign.frequency,
    landingPageViews: campaign.landingPageViews,
    platformData: campaign,
  }
}

export default UnifiedCampaignPerformanceTable
