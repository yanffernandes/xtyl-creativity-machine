/**
 * DiversityPreview - T063-T068: Preview diversity metrics before publishing
 * Shows diversity score gauge, concept tags, model tags, and warnings
 */

import { useState } from 'react'
import { AlertTriangle, Sparkles, Tag, Cpu, Palette, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './DiversityPreview.module.css'

// Types for concept used in generated images
interface ConceptUsed {
  id: string
  slug: string
  name: string
}

interface DiversityMetrics {
  uniqueConcepts: number
  uniqueBackgrounds: number
  uniqueModels: number
  totalGenerated: number
  diversityScore: number
  meetsThreshold: boolean
}

interface DiversityPreviewProps {
  /** Diversity metrics from generation response */
  metrics: DiversityMetrics
  /** Array of concept objects used (from generated images) */
  conceptsUsed?: ConceptUsed[]
  /** Array of model names used (from generated images) */
  modelsUsed?: string[]
  /** Array of background styles used (from generated images) */
  backgroundsUsed?: string[]
  /** Detected niche (e.g., 'financial', 'generic') */
  detectedNiche?: string
  /** Compact mode for embedding in review step */
  compact?: boolean
  /** Generation mode - 'free' always shows max diversity */
  generationMode?: 'preset' | 'free'
}

// T059: Format model name for display (shared with StepCreatives)
// FR-002: Gemini 3 Pro (OpenRouter), Nano Banana Pro e GPT Image 1.5 (Replicate)
function formatModelName(model: string): string {
  const modelPart = model.includes('/') ? model.split('/').pop() || model : model
  // Remove "(fallback)" suffix if present
  const cleanModel = modelPart.replace(/\s*\(fallback\)$/i, '')

  const modelMap: Record<string, string> = {
    'gemini-3-pro-image-preview': 'Gemini 3 Pro',
    'nano-banana-pro': 'Nano Banana Pro',
    'gpt-image-1.5': 'GPT Image 1.5',
  }

  return modelMap[cleanModel] || cleanModel.split('-').slice(0, 2).join(' ')
}

/**
 * T065: DiversityScoreGauge - Visual circular gauge showing diversity percentage
 */
function DiversityScoreGauge({
  score,
  meetsThreshold,
}: {
  score: number
  meetsThreshold: boolean
}) {
  // Score is already 0-100
  const percentage = Math.round(score)

  // Calculate stroke dasharray for circular progress
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

  return (
    <div className={styles.gaugeContainer}>
      <svg className={styles.gauge} viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={meetsThreshold ? 'var(--color-success)' : 'var(--color-warning)'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          transform="rotate(-90 50 50)"
          className={styles.gaugeProgress}
        />
      </svg>
      <div className={styles.gaugeValue}>
        <span className={`${styles.gaugePercentage} ${meetsThreshold ? styles.good : styles.low}`}>
          {percentage}%
        </span>
        <span className={styles.gaugeLabel}>Diversidade</span>
      </div>
    </div>
  )
}

/**
 * T066: ConceptTags - Display unique concepts used as tags
 */
function ConceptTags({ concepts }: { concepts: ConceptUsed[] }) {
  if (!concepts || concepts.length === 0) return null

  // Get unique concepts by ID
  const uniqueConcepts = Array.from(
    new Map(concepts.map((c) => [c.id, c])).values()
  )

  return (
    <div className={styles.tagSection}>
      <div className={styles.tagHeader}>
        <Tag size={14} />
        <span>Conceitos ({uniqueConcepts.length})</span>
      </div>
      <div className={styles.tagList}>
        {uniqueConcepts.map((concept) => (
          <span key={concept.id} className={styles.conceptTag}>
            {concept.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * T067: ModelTags - Display unique models used as tags
 */
function ModelTags({ models }: { models: string[] }) {
  if (!models || models.length === 0) return null

  // Get unique models
  const uniqueModels = [...new Set(models)]

  return (
    <div className={styles.tagSection}>
      <div className={styles.tagHeader}>
        <Cpu size={14} />
        <span>Modelos ({uniqueModels.length})</span>
      </div>
      <div className={styles.tagList}>
        {uniqueModels.map((model) => (
          <span key={model} className={styles.modelTag}>
            {formatModelName(model)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * BackgroundTags - Display unique backgrounds used as tags
 */
function BackgroundTags({ backgrounds }: { backgrounds: string[] }) {
  if (!backgrounds || backgrounds.length === 0) return null

  // Get unique backgrounds, filter out 'default'
  const uniqueBackgrounds = [...new Set(backgrounds)].filter(
    (bg) => bg && bg !== 'default'
  )

  if (uniqueBackgrounds.length === 0) return null

  return (
    <div className={styles.tagSection}>
      <div className={styles.tagHeader}>
        <Palette size={14} />
        <span>Fundos ({uniqueBackgrounds.length})</span>
      </div>
      <div className={styles.tagList}>
        {uniqueBackgrounds.map((bg) => (
          <span key={bg} className={styles.backgroundTag}>
            {bg}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * T068: Low diversity warning alert
 */
function DiversityWarning() {
  return (
    <div className={styles.warning}>
      <AlertTriangle size={16} />
      <span>
        Score abaixo do recomendado (70%). Considere gerar mais variações para
        evitar penalizações do algoritmo Andromeda.
      </span>
    </div>
  )
}

/**
 * Main DiversityPreview component
 */
export function DiversityPreview({
  metrics,
  conceptsUsed = [],
  modelsUsed = [],
  backgroundsUsed = [],
  detectedNiche,
  compact = false,
  generationMode = 'preset',
}: DiversityPreviewProps) {
  // Default to collapsed
  const [isExpanded, setIsExpanded] = useState(false)

  if (!metrics || metrics.totalGenerated === 0) {
    return null
  }

  // In "free" mode, AI maximizes diversity automatically - show 100%
  const isFreeMode = generationMode === 'free'
  const displayMetrics: DiversityMetrics = isFreeMode
    ? {
        ...metrics,
        diversityScore: 100,
        meetsThreshold: true,
      }
    : metrics

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''} ${!isExpanded ? styles.collapsed : ''}`}>
      {/* Header - clickable to toggle */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <Sparkles size={18} className={styles.headerIcon} />
        <span className={styles.title}>Preview de Diversidade</span>
        {isFreeMode && <span className={styles.freeModeBadge}>Modo Livre</span>}
        {detectedNiche && detectedNiche !== 'generic' && (
          <span className={styles.nicheBadge}>{detectedNiche}</span>
        )}
        {/* Collapsed summary */}
        {!isExpanded && (
          <span className={`${styles.collapsedSummary} ${displayMetrics.meetsThreshold ? styles.good : styles.low}`}>
            {Math.round(displayMetrics.diversityScore)}% • {displayMetrics.uniqueConcepts} conceitos
          </span>
        )}
        <span className={styles.toggleIcon}>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {isExpanded && (
      <div className={styles.content}>
        {/* T065: Score Gauge */}
        <DiversityScoreGauge
          score={displayMetrics.diversityScore}
          meetsThreshold={displayMetrics.meetsThreshold}
        />

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{displayMetrics.uniqueConcepts}</span>
            <span className={styles.statLabel}>Conceitos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{displayMetrics.uniqueBackgrounds}</span>
            <span className={styles.statLabel}>Fundos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{displayMetrics.uniqueModels}</span>
            <span className={styles.statLabel}>Modelos</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{displayMetrics.totalGenerated}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>

        {/* Tags sections - only show in non-compact mode */}
        {!compact && (
          <div className={styles.tagsContainer}>
            {/* T066: Concept Tags */}
            <ConceptTags concepts={conceptsUsed} />

            {/* T067: Model Tags */}
            <ModelTags models={modelsUsed} />

            {/* Background Tags */}
            <BackgroundTags backgrounds={backgroundsUsed} />
          </div>
        )}
      </div>
      )}

      {/* T068: Warning - show even when collapsed if score is low (never shows in free mode) */}
      {!displayMetrics.meetsThreshold && <DiversityWarning />}
    </div>
  )
}
