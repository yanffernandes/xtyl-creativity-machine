/**
 * UnifiedPerformanceView Component
 *
 * Displays aggregated performance metrics from multiple ad platforms.
 * Shows overall metrics, campaign summary, and per-platform breakdown.
 */

import { RefreshCw } from 'lucide-react'
import { Button, Select, Spinner } from '@/shared/components'
import { MetricCard } from '../MetricCard'
import { PlatformBadge } from '../PlatformBadge'
import styles from './UnifiedPerformanceView.module.css'
import type { AdsPlatform, UnifiedMetrics, DashboardPeriod } from '../../types'

// Period options for filter
const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
]

export interface UnifiedPerformanceViewProps {
  metrics: UnifiedMetrics
  byPlatform?: Record<AdsPlatform, UnifiedMetrics>
  selectedPlatforms: AdsPlatform[]
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
  isLoading: boolean
  isRefreshing: boolean
  onRefresh: () => void
}

export function UnifiedPerformanceView({
  metrics,
  byPlatform,
  selectedPlatforms,
  period,
  onPeriodChange,
  isLoading,
  isRefreshing,
  onRefresh,
}: UnifiedPerformanceViewProps) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Carregando métricas...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header with filters */}
      <div className={styles.header}>
        <h2 className={styles.title}>Performance das Campanhas</h2>
        <div className={styles.actions}>
          <Select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as DashboardPeriod)}
            options={PERIOD_OPTIONS}
          />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className={styles.metricsGrid}>
        <MetricCard
          label="Impressões"
          value={metrics.totalImpressions}
          format="number"
        />
        <MetricCard
          label="Cliques"
          value={metrics.totalClicks}
          format="number"
        />
        <MetricCard
          label="CTR Médio"
          value={metrics.avgCtr}
          format="percentage"
        />
        <MetricCard
          label="Custo Total"
          value={metrics.totalCost}
          format="currency"
        />
        <MetricCard
          label="Conversões"
          value={metrics.totalConversions}
          format="number"
        />
        <MetricCard
          label="CPA Médio"
          value={metrics.avgCpa}
          format="currency"
        />
      </div>

      {/* Campaign Summary */}
      <div className={styles.summarySection}>
        <h3 className={styles.sectionTitle}>Resumo de Campanhas</h3>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryValue}>{metrics.totalCampaigns}</span>
            <span className={styles.summaryLabel}>Total</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={`${styles.summaryValue} ${styles.active}`}>
              {metrics.activeCampaigns}
            </span>
            <span className={styles.summaryLabel}>Ativas</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={`${styles.summaryValue} ${styles.paused}`}>
              {metrics.pausedCampaigns}
            </span>
            <span className={styles.summaryLabel}>Pausadas</span>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {selectedPlatforms.length > 0 && (
        <div className={styles.breakdownSection}>
          <h3 className={styles.sectionTitle}>Por Fonte</h3>
          <div className={styles.platformGrid}>
            {selectedPlatforms.map((platform) => (
              <PlatformBreakdownCard
                key={platform}
                platform={platform}
                metrics={byPlatform?.[platform]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Platform Breakdown Card Subcomponent
interface PlatformBreakdownCardProps {
  platform: AdsPlatform
  metrics?: UnifiedMetrics
}

function PlatformBreakdownCard({ platform, metrics }: PlatformBreakdownCardProps) {
  const hasData = metrics && metrics.totalCampaigns > 0

  return (
    <div className={styles.platformCard}>
      <div className={styles.platformHeader}>
        <PlatformBadge platform={platform} size="sm" />
        {!hasData && (
          <span className={styles.noData}>
            {platform === 'meta' ? 'Em desenvolvimento' : 'Sem dados'}
          </span>
        )}
      </div>

      {hasData ? (
        <div className={styles.platformMetrics}>
          <div className={styles.platformMetric}>
            <span className={styles.metricLabel}>Campanhas</span>
            <span className={styles.metricValue}>{metrics.totalCampaigns}</span>
          </div>
          <div className={styles.platformMetric}>
            <span className={styles.metricLabel}>Impressões</span>
            <span className={styles.metricValue}>
              {formatCompact(metrics.totalImpressions)}
            </span>
          </div>
          <div className={styles.platformMetric}>
            <span className={styles.metricLabel}>Cliques</span>
            <span className={styles.metricValue}>
              {formatCompact(metrics.totalClicks)}
            </span>
          </div>
          <div className={styles.platformMetric}>
            <span className={styles.metricLabel}>Custo</span>
            <span className={styles.metricValue}>
              {formatCurrency(metrics.totalCost)}
            </span>
          </div>
        </div>
      ) : (
        <p className={styles.platformNote}>
          {platform === 'meta'
            ? 'Integração Meta Ads em desenvolvimento'
            : 'Conecte uma conta para ver métricas'}
        </p>
      )}
    </div>
  )
}

// Utility functions
function formatCompact(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString('pt-BR')
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default UnifiedPerformanceView
