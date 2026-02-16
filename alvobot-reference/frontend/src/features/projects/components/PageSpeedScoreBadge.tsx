import { Gauge, Smartphone, Monitor } from 'lucide-react'
import { Tooltip } from '@/shared/components'
import styles from './PageSpeedScoreBadge.module.css'

interface PageSpeedScoreBadgeProps {
  score: number | null | undefined
  strategy?: 'mobile' | 'desktop'
  showLabel?: boolean
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

function getScoreVariant(score: number | null | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (score === null || score === undefined) return 'default'
  if (score >= 90) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}

function getScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'N/A'
  if (score >= 90) return 'Bom'
  if (score >= 50) return 'Médio'
  return 'Ruim'
}

function getScoreDescription(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'Não verificado'
  if (score >= 90) return 'Excelente performance!'
  if (score >= 50) return 'Pode melhorar'
  return 'Precisa de otimização'
}

export function PageSpeedScoreBadge({
  score,
  strategy = 'mobile',
  showLabel = true,
  showIcon = true,
  size = 'sm',
}: PageSpeedScoreBadgeProps) {
  const variant = getScoreVariant(score)
  const label = getScoreLabel(score)
  const description = getScoreDescription(score)
  const strategyLabel = strategy === 'mobile' ? 'Mobile' : 'Desktop'
  const StrategyIcon = strategy === 'mobile' ? Smartphone : Monitor

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16
  const scoreDisplay = score !== null && score !== undefined ? score : '--'

  const tooltipContent = (
    <div className={styles.tooltipContent}>
      <div className={styles.tooltipHeader}>
        <StrategyIcon size={14} />
        <span>PageSpeed {strategyLabel}</span>
      </div>
      <div className={styles.tooltipScore}>
        {scoreDisplay}/100
      </div>
      <div className={styles.tooltipDescription}>
        {description}
      </div>
    </div>
  )

  return (
    <Tooltip content={tooltipContent} position="top">
      <div className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
        {showIcon && <Gauge size={iconSize} className={styles.icon} />}
        <span className={styles.score}>{scoreDisplay}</span>
        {showLabel && <span className={styles.label}>{label}</span>}
      </div>
    </Tooltip>
  )
}

interface PageSpeedScoreCompactProps {
  mobileScore: number | null | undefined
  desktopScore: number | null | undefined
  size?: 'sm' | 'md'
}

export function PageSpeedScoreCompact({
  mobileScore,
  desktopScore,
  size = 'sm',
}: PageSpeedScoreCompactProps) {
  const mobileVariant = getScoreVariant(mobileScore)
  const desktopVariant = getScoreVariant(desktopScore)

  const iconSize = size === 'sm' ? 12 : 14
  const mobileDisplay = mobileScore !== null && mobileScore !== undefined ? mobileScore : '--'
  const desktopDisplay = desktopScore !== null && desktopScore !== undefined ? desktopScore : '--'

  return (
    <div className={`${styles.compact} ${styles[size]}`}>
      <Tooltip content={`Mobile: ${mobileDisplay}/100`} position="top">
        <div className={`${styles.compactItem} ${styles[mobileVariant]}`}>
          <Smartphone size={iconSize} />
          <span>{mobileDisplay}</span>
        </div>
      </Tooltip>
      <Tooltip content={`Desktop: ${desktopDisplay}/100`} position="top">
        <div className={`${styles.compactItem} ${styles[desktopVariant]}`}>
          <Monitor size={iconSize} />
          <span>{desktopDisplay}</span>
        </div>
      </Tooltip>
    </div>
  )
}
