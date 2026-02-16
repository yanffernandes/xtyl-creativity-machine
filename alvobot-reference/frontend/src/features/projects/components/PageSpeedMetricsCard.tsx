import { useState, useEffect, useMemo } from 'react'
import {
  Gauge,
  Smartphone,
  Monitor,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  Database,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { Card, CardBody, Button, Spinner } from '@/shared/components'
import styles from './PageSpeedMetricsCard.module.css'
import { useCheckPageSpeed, usePageSpeedLatest } from '../api/usePageSpeed'
import { generateSuggestions, type PerformanceSuggestion } from '../utils/pagespeedSuggestions'

interface PageSpeedMetricsCardProps {
  projectId: number
  domain: string
  mobileScore?: number | null
  desktopScore?: number | null
  lastCheck?: string | null
  checkError?: string | null
}

interface MetricRowProps {
  label: string
  value: number | null
  unit: string
  thresholds: { good: number; poor: number }
}

function MetricRow({ label, value, unit, thresholds }: MetricRowProps) {
  const getVariant = (): 'success' | 'warning' | 'error' | 'default' => {
    if (value === null) return 'default'
    if (value <= thresholds.good) return 'success'
    if (value >= thresholds.poor) return 'error'
    return 'warning'
  }

  const variant = getVariant()

  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${styles[variant]}`}>
        {value !== null ? `${value.toLocaleString('pt-BR')}${unit}` : '--'}
      </span>
    </div>
  )
}

function ScoreCircle({
  score,
  label,
}: {
  score: number | null
  label: string
}) {
  const getVariant = (): 'success' | 'warning' | 'error' | 'default' => {
    if (score === null) return 'default'
    if (score >= 90) return 'success'
    if (score >= 50) return 'warning'
    return 'error'
  }

  const variant = getVariant()
  const displayScore = score !== null ? score : '--'

  return (
    <div className={`${styles.scoreCircle} ${styles[variant]}`}>
      <span className={styles.scoreValue}>{displayScore}</span>
      <span className={styles.scoreLabel}>{label}</span>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: PerformanceSuggestion }) {
  const priorityClass =
    suggestion.priority === 'high'
      ? styles.highPriority
      : suggestion.priority === 'medium'
        ? styles.mediumPriority
        : ''

  return (
    <div className={`${styles.suggestionCard} ${priorityClass}`}>
      <span className={styles.suggestionIcon}>{suggestion.icon}</span>
      <div className={styles.suggestionContent}>
        <span className={styles.suggestionMetric}>
          {suggestion.metric}
          <span className={`${styles.priorityBadge} ${styles[suggestion.priority]}`}>
            {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
          </span>
        </span>
        <p className={styles.suggestionIssue}>{suggestion.issue}</p>
        <p className={styles.suggestionText}>{suggestion.suggestion}</p>
        <span className={styles.suggestionImpact}>
          <TrendingUp size={12} />
          {suggestion.impact}
        </span>
      </div>
    </div>
  )
}

// Loading steps for better UX feedback
const LOADING_STEPS = [
  { id: 'init', label: 'Iniciando verificação...', duration: 500 },
  { id: 'mobile', label: 'Analisando versão mobile...', duration: 8000 },
  { id: 'desktop', label: 'Analisando versão desktop...', duration: 8000 },
  { id: 'saving', label: 'Salvando resultados...', duration: 1500 },
]

function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const stepDuration = LOADING_STEPS[currentStep]?.duration || 2000
    const intervalTime = 50
    const increment = (intervalTime / stepDuration) * 100

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment
        if (newProgress >= 100) {
          // Move to next step
          if (currentStep < LOADING_STEPS.length - 1) {
            setCurrentStep((s) => s + 1)
            return 0
          }
          return 100
        }
        return newProgress
      })
    }, intervalTime)

    return () => clearInterval(progressInterval)
  }, [currentStep])

  const totalProgress =
    ((currentStep + progress / 100) / LOADING_STEPS.length) * 100

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingHeader}>
        <Gauge size={24} className={styles.loadingIcon} />
        <span className={styles.loadingTitle}>Verificando Performance</span>
      </div>

      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${totalProgress}%` }}
        />
      </div>

      <div className={styles.loadingSteps}>
        {LOADING_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`${styles.loadingStep} ${
              index < currentStep
                ? styles.completed
                : index === currentStep
                  ? styles.active
                  : ''
            }`}
          >
            {index < currentStep ? (
              <CheckCircle2 size={14} />
            ) : index === currentStep ? (
              <Spinner size="sm" />
            ) : (
              <div className={styles.stepDot} />
            )}
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <p className={styles.loadingHint}>
        A verificação pode levar até 30 segundos. Os resultados serão salvos
        automaticamente.
      </p>
    </div>
  )
}

export function PageSpeedMetricsCard({
  projectId,
  domain,
  mobileScore: mobileScoreProp,
  desktopScore: desktopScoreProp,
  lastCheck,
  checkError,
}: PageSpeedMetricsCardProps) {
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile')
  const [justChecked, setJustChecked] = useState(false)
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const checkMutation = useCheckPageSpeed()

  // Fetch latest data for the active tab (for detailed metrics)
  const { data: latestData, isLoading } = usePageSpeedLatest(
    projectId,
    activeTab,
    { enabled: !!projectId }
  )

  // Fetch latest scores for both strategies (for tabs header)
  const { data: mobileLatest } = usePageSpeedLatest(projectId, 'mobile', { enabled: !!projectId })
  const { data: desktopLatest } = usePageSpeedLatest(projectId, 'desktop', { enabled: !!projectId })

  // Use fetched data for tabs, falling back to props
  const mobileScore = mobileLatest?.performance_score ?? mobileScoreProp
  const desktopScore = desktopLatest?.performance_score ?? desktopScoreProp

  // Generate suggestions based on current metrics
  const suggestions = useMemo(() => {
    if (!latestData) return []
    return generateSuggestions(latestData).slice(0, 3) // Show top 3 suggestions
  }, [latestData])

  // Reset justChecked after showing success message
  useEffect(() => {
    if (justChecked) {
      const timeout = setTimeout(() => setJustChecked(false), 5000)
      return () => clearTimeout(timeout)
    }
  }, [justChecked])

  const handleCheck = async () => {
    if (!workspaceId || !domain) return
    try {
      await checkMutation.mutateAsync({
        projectId,
        domain,
        workspaceId,
        force: true,
      })
      setJustChecked(true)
    } catch {
      // Error is handled by mutation
    }
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Nunca verificado'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return 'agora'
    if (diffMinutes < 60) return `há ${diffMinutes} min`
    if (diffHours < 24) return `há ${diffHours}h`
    if (diffDays < 7) return `há ${diffDays}d`
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const currentScore = activeTab === 'mobile' ? mobileScore : desktopScore

  // Show loading state during check
  if (checkMutation.isPending) {
    return (
      <Card variant="outlined" padding="none" className={styles.card}>
        <CardBody className={styles.content}>
          <LoadingState />
        </CardBody>
      </Card>
    )
  }

  return (
    <Card variant="outlined" padding="none" className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Gauge size={20} className={styles.icon} />
          <h3 className={styles.title}>PageSpeed Insights</h3>
        </div>
        <button
          type="button"
          className={styles.checkButton}
          onClick={handleCheck}
          disabled={checkMutation.isPending || !domain}
        >
          {checkMutation.isPending ? (
            <Spinner size="sm" />
          ) : (
            <RefreshCw size={14} />
          )}
          Verificar
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'mobile' ? styles.active : ''}`}
          onClick={() => setActiveTab('mobile')}
        >
          <Smartphone size={18} />
          <span>Mobile</span>
          {mobileScore !== null && mobileScore !== undefined && (
            <span className={styles.tabScore}>{mobileScore}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'desktop' ? styles.active : ''}`}
          onClick={() => setActiveTab('desktop')}
        >
          <Monitor size={18} />
          <span>Desktop</span>
          {desktopScore !== null && desktopScore !== undefined && (
            <span className={styles.tabScore}>{desktopScore}</span>
          )}
        </button>
      </div>

      <CardBody className={styles.content}>
        {/* Success message after check */}
        {justChecked && (
          <div className={styles.successBanner}>
            <CheckCircle2 size={14} />
            <span>Verificação concluída! Resultados salvos com sucesso.</span>
          </div>
        )}

        {checkError && (
          <div className={styles.errorBanner}>
            <AlertCircle size={14} />
            <span>{checkError}</span>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner size="md" />
            <span>Carregando...</span>
          </div>
        ) : latestData ? (
          <>
            <div className={styles.scoresGrid}>
              <ScoreCircle
                score={latestData.performance_score}
                label="Performance"
              />
              <ScoreCircle
                score={latestData.accessibility_score}
                label="Acessibilidade"
              />
              <ScoreCircle
                score={latestData.best_practices_score}
                label="Boas Práticas"
              />
              <ScoreCircle score={latestData.seo_score} label="SEO" />
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Core Web Vitals</h4>
              <MetricRow
                label="LCP"
                value={latestData.lcp_ms}
                unit="ms"
                thresholds={{ good: 2500, poor: 4000 }}
              />
              <MetricRow
                label="FID"
                value={latestData.fid_ms}
                unit="ms"
                thresholds={{ good: 100, poor: 300 }}
              />
              <MetricRow
                label="CLS"
                value={
                  latestData.cls !== null
                    ? Number(latestData.cls.toFixed(3))
                    : null
                }
                unit=""
                thresholds={{ good: 0.1, poor: 0.25 }}
              />
            </div>

            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Outras Métricas</h4>
              <MetricRow
                label="FCP"
                value={latestData.fcp_ms}
                unit="ms"
                thresholds={{ good: 1800, poor: 3000 }}
              />
              <MetricRow
                label="TTFB"
                value={latestData.ttfb_ms}
                unit="ms"
                thresholds={{ good: 800, poor: 1800 }}
              />
              <MetricRow
                label="Speed Index"
                value={latestData.si_ms}
                unit="ms"
                thresholds={{ good: 3400, poor: 5800 }}
              />
              <MetricRow
                label="TBT"
                value={latestData.tbt_ms}
                unit="ms"
                thresholds={{ good: 200, poor: 600 }}
              />
            </div>

            {/* Suggestions Section */}
            {suggestions.length > 0 && (
              <div className={styles.suggestionsSection}>
                <div className={styles.suggestionsHeader}>
                  <h4 className={styles.suggestionsTitle}>
                    <Lightbulb size={14} />
                    Sugestões de Melhoria
                  </h4>
                  <span className={styles.suggestionsBadge}>
                    {suggestions.length} {suggestions.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className={styles.suggestionsList}>
                  {suggestions.map((suggestion, index) => (
                    <SuggestionCard key={index} suggestion={suggestion} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : currentScore !== null && currentScore !== undefined ? (
          <div className={styles.simpleScore}>
            <ScoreCircle score={currentScore} label="Performance" />
            <p className={styles.hint}>
              Clique em Verificar para ver métricas detalhadas
            </p>
          </div>
        ) : (
          <div className={styles.empty}>
            <Gauge size={32} className={styles.emptyIcon} />
            <p>Nenhuma verificação realizada</p>
            <Button type="button" variant="primary" size="sm" onClick={handleCheck}>
              Verificar agora
            </Button>
          </div>
        )}
      </CardBody>

      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          <Clock size={12} />
          <span>
            Última verificação: {formatDate(lastCheck || latestData?.checked_at)}
          </span>
        </div>
        <div className={styles.footerRight}>
          <Database size={12} />
          <span>Histórico salvo</span>
        </div>
      </div>
    </Card>
  )
}
