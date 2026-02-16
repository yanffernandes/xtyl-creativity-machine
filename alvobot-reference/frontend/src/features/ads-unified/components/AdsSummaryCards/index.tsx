/**
 * AdsSummaryCards Component
 *
 * Displays aggregated metrics for ads campaigns with skeleton loading state.
 * Uses the shared SummaryCardsGrid component for consistency across dashboards.
 */

import { memo, useMemo } from 'react'
import { DollarSign, Eye, MousePointer, TrendingUp, Target, ShoppingCart } from 'lucide-react'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components'

interface SummaryData {
  cost: number
  impressions: number
  clicks: number
  ctr: number
  conversions: number
  cpa: number
}

interface AdsSummaryCardsProps {
  data?: SummaryData
  isLoading?: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export const AdsSummaryCards = memo(function AdsSummaryCards({
  data,
  isLoading = false,
}: AdsSummaryCardsProps) {
  const cards: CardConfig[] = useMemo(
    () => [
      {
        icon: DollarSign,
        label: 'Gasto Total',
        value: formatCurrency(data?.cost || 0),
        color: '#EF4444',
      },
      {
        icon: Eye,
        label: 'Impressões',
        value: formatNumber(data?.impressions || 0),
        color: '#3B82F6',
      },
      {
        icon: MousePointer,
        label: 'Cliques',
        value: formatNumber(data?.clicks || 0),
        color: '#8B5CF6',
      },
      {
        icon: TrendingUp,
        label: 'CTR',
        value: formatPercent(data?.ctr || 0),
        color: '#F59E0B',
      },
      {
        icon: Target,
        label: 'Conversões',
        value: formatNumber(data?.conversions || 0),
        color: '#10B981',
      },
      {
        icon: ShoppingCart,
        label: 'CPA',
        value: formatCurrency(data?.cpa || 0),
        color: '#EC4899',
      },
    ],
    [data]
  )

  return <SummaryCardsGrid cards={cards} isLoading={isLoading} />
})

export default AdsSummaryCards
