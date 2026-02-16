import { memo, useMemo } from 'react'
import { DollarSign, Eye, MousePointer, TrendingUp } from 'lucide-react'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components'

interface SummaryData {
  revenue: number
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  rpm: number
  currency?: string
  hasMultipleCurrencies?: boolean
  conversionMessage?: string
}

interface RevenueSummaryCardsProps {
  data?: SummaryData
  isLoading?: boolean
}

function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export const RevenueSummaryCards = memo(function RevenueSummaryCards({
  data,
  isLoading = false,
}: RevenueSummaryCardsProps) {
  const hasMultipleCurrencies = data?.hasMultipleCurrencies ?? false
  const conversionMessage = data?.conversionMessage

  const cards: CardConfig[] = useMemo(
    () => [
      {
        icon: DollarSign,
        label: 'Receita',
        value: formatCurrency(data?.revenue || 0, data?.currency),
        color: '#10B981',
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
        icon: DollarSign,
        label: 'CPC',
        value: formatCurrency(data?.cpc || 0, data?.currency),
        color: '#EC4899',
      },
      {
        icon: DollarSign,
        label: 'RPM',
        value: formatCurrency(data?.rpm || 0, data?.currency),
        color: '#06B6D4',
      },
    ],
    [data]
  )

  const infoMessage =
    hasMultipleCurrencies && conversionMessage ? (
      <>
        <DollarSign size={16} />
        <span>{conversionMessage}</span>
      </>
    ) : undefined

  return (
    <SummaryCardsGrid
      cards={cards}
      isLoading={isLoading}
      infoMessage={infoMessage}
    />
  )
})
