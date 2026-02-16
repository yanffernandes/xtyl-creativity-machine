import { memo, useMemo } from 'react'
import { Users, Activity, Eye, TrendingDown, TrendingUp, Clock } from 'lucide-react'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components'
import { formatInteger, formatPercent, formatDurationMinSec } from '../../utils/formatters'
import type { AnalyticsSummary } from '../../types'

interface AnalyticsSummaryCardsProps {
  data?: AnalyticsSummary
  isLoading?: boolean
}

export const AnalyticsSummaryCards = memo(function AnalyticsSummaryCards({
  data,
  isLoading = false,
}: AnalyticsSummaryCardsProps) {
  const cards: CardConfig[] = useMemo(
    () => [
      {
        icon: Users,
        label: 'Usuários Ativos',
        value: formatInteger(data?.activeUsers || 0),
        color: 'var(--color-chart-1)',
      },
      {
        icon: Activity,
        label: 'Sessões',
        value: formatInteger(data?.sessions || 0),
        color: 'var(--color-chart-2)',
      },
      {
        icon: Eye,
        label: 'Visualizações',
        value: formatInteger(data?.pageViews || 0),
        color: 'var(--color-chart-3)',
      },
      {
        icon: TrendingDown,
        label: 'Taxa de Rejeição',
        value: formatPercent(data?.bounceRate || 0),
        color: 'var(--color-chart-4)',
      },
      {
        icon: TrendingUp,
        label: 'Engajamento',
        value: formatPercent(data?.engagementRate || 0),
        color: 'var(--color-chart-5)',
      },
      {
        icon: Clock,
        label: 'Duração Média',
        value: formatDurationMinSec(data?.avgSessionDuration || 0),
        color: 'var(--color-chart-6)',
      },
    ],
    [data]
  )

  return (
    <SummaryCardsGrid
      cards={cards}
      isLoading={isLoading}
    />
  )
})
