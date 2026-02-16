import type { PageSpeedHistory } from '../types/pagespeed'

export interface PerformanceSuggestion {
  metric: string
  issue: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  impact: string
  icon: string
}

// Thresholds for Core Web Vitals (based on Google's recommendations)
const CWV_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // ms
  fid: { good: 100, poor: 300 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // score
  fcp: { good: 1800, poor: 3000 }, // ms
  ttfb: { good: 800, poor: 1800 }, // ms
  tbt: { good: 200, poor: 600 }, // ms
  si: { good: 3400, poor: 5800 }, // ms
}

/**
 * Generate actionable suggestions based on PageSpeed metrics
 */
export function generateSuggestions(data: PageSpeedHistory): PerformanceSuggestion[] {
  const suggestions: PerformanceSuggestion[] = []

  // LCP suggestions
  if (data.lcp_ms !== null && data.lcp_ms > CWV_THRESHOLDS.lcp.good) {
    suggestions.push({
      metric: 'LCP',
      issue: `Largest Contentful Paint em ${(data.lcp_ms / 1000).toFixed(1)}s`,
      suggestion:
        'Otimize imagens (WebP/AVIF), use lazy loading, implemente preload para recursos críticos e considere usar CDN.',
      priority: data.lcp_ms > CWV_THRESHOLDS.lcp.poor ? 'high' : 'medium',
      impact: 'Alto impacto na experiência do usuário',
      icon: '🖼️',
    })
  }

  // CLS suggestions
  if (data.cls !== null && data.cls > CWV_THRESHOLDS.cls.good) {
    suggestions.push({
      metric: 'CLS',
      issue: `Cumulative Layout Shift em ${data.cls.toFixed(3)}`,
      suggestion:
        'Defina dimensões para imagens/vídeos, reserve espaço para conteúdo dinâmico e evite inserir conteúdo acima do existente.',
      priority: data.cls > CWV_THRESHOLDS.cls.poor ? 'high' : 'medium',
      impact: 'Evita mudanças visuais irritantes',
      icon: '📐',
    })
  }

  // TBT/FID suggestions
  if (data.tbt_ms !== null && data.tbt_ms > CWV_THRESHOLDS.tbt.good) {
    suggestions.push({
      metric: 'TBT',
      issue: `Total Blocking Time em ${data.tbt_ms}ms`,
      suggestion:
        'Divida tarefas JavaScript longas, remova código não utilizado, adie scripts não críticos e minimize o trabalho do thread principal.',
      priority: data.tbt_ms > CWV_THRESHOLDS.tbt.poor ? 'high' : 'medium',
      impact: 'Melhora a responsividade',
      icon: '⚡',
    })
  }

  // TTFB suggestions
  if (data.ttfb_ms !== null && data.ttfb_ms > CWV_THRESHOLDS.ttfb.good) {
    suggestions.push({
      metric: 'TTFB',
      issue: `Time to First Byte em ${data.ttfb_ms}ms`,
      suggestion:
        'Otimize o servidor (cache, database), use CDN, considere edge computing e reduza redirecionamentos.',
      priority: data.ttfb_ms > CWV_THRESHOLDS.ttfb.poor ? 'high' : 'medium',
      impact: 'Acelera o início do carregamento',
      icon: '🖥️',
    })
  }

  // FCP suggestions
  if (data.fcp_ms !== null && data.fcp_ms > CWV_THRESHOLDS.fcp.good) {
    suggestions.push({
      metric: 'FCP',
      issue: `First Contentful Paint em ${(data.fcp_ms / 1000).toFixed(1)}s`,
      suggestion:
        'Elimine recursos que bloqueiam renderização, inline CSS crítico e otimize a entrega de fontes.',
      priority: data.fcp_ms > CWV_THRESHOLDS.fcp.poor ? 'high' : 'medium',
      impact: 'Melhora a percepção de velocidade',
      icon: '🎨',
    })
  }

  // Speed Index suggestions
  if (data.si_ms !== null && data.si_ms > CWV_THRESHOLDS.si.good) {
    suggestions.push({
      metric: 'Speed Index',
      issue: `Speed Index em ${(data.si_ms / 1000).toFixed(1)}s`,
      suggestion:
        'Priorize conteúdo visível, otimize a ordem de carregamento e minimize o JavaScript que bloqueia a renderização.',
      priority: data.si_ms > CWV_THRESHOLDS.si.poor ? 'high' : 'medium',
      impact: 'Melhora a velocidade visual de carregamento',
      icon: '📊',
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return suggestions
}

/**
 * Check if performance score is considered poor
 */
export function isPerformancePoor(score: number | null): boolean {
  return score !== null && score < 50
}

/**
 * Check if performance score needs improvement
 */
export function performanceNeedsImprovement(score: number | null): boolean {
  return score !== null && score < 90 && score >= 50
}

/**
 * Get performance status label
 */
export function getPerformanceStatus(score: number | null): {
  label: string
  variant: 'success' | 'warning' | 'error' | 'default'
} {
  if (score === null) {
    return { label: 'Não verificado', variant: 'default' }
  }
  if (score >= 90) {
    return { label: 'Bom', variant: 'success' }
  }
  if (score >= 50) {
    return { label: 'Precisa melhorar', variant: 'warning' }
  }
  return { label: 'Ruim', variant: 'error' }
}
