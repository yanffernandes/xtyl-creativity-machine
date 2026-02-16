import { useState, useEffect, useMemo } from 'react'
import {
  Gauge,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  ThumbsUp,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCheckArticlePageSpeed } from '@/features/projects/api/usePageSpeed'
import type { PageSpeedUrlCheckResponse } from '@/features/projects/types/pagespeed'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { Modal, Button, Spinner } from '@/shared/components'
import styles from './PageSpeedTestModal.module.css'

interface PageSpeedTestModalProps {
  isOpen: boolean
  onClose: () => void
  articleTitle: string
  articleUrl: string
  projectId: number // Only used for "Ver detalhes" navigation
}

// Loading steps for UX feedback
const LOADING_STEPS = [
  { id: 'init', label: 'Conectando ao PageSpeed Insights...', duration: 1000 },
  { id: 'mobile', label: 'Analisando versão mobile...', duration: 10000 },
  { id: 'desktop', label: 'Analisando versão desktop...', duration: 10000 },
  { id: 'saving', label: 'Processando resultados...', duration: 2000 },
]

// Tips to show while loading
const LOADING_TIPS = [
  'O PageSpeed Insights analisa o conteúdo da página e gera sugestões para torná-la mais rápida.',
  'Páginas mais rápidas têm melhor posicionamento no Google e maior taxa de conversão.',
  'O Core Web Vitals é um conjunto de métricas do Google que medem a experiência do usuário.',
  'LCP (Largest Contentful Paint) mede quanto tempo leva para o maior elemento ficar visível.',
  'CLS (Cumulative Layout Shift) mede a estabilidade visual da página durante o carregamento.',
]

function getScoreVariant(score: number | null): 'good' | 'needsImprovement' | 'poor' {
  if (score === null) return 'poor'
  if (score >= 90) return 'good'
  if (score >= 50) return 'needsImprovement'
  return 'poor'
}

function getOverallVerdict(
  mobileScore: number | null,
  desktopScore: number | null
): { variant: 'good' | 'needsImprovement' | 'poor'; message: string; icon: React.ReactNode } {
  const avgScore = ((mobileScore || 0) + (desktopScore || 0)) / 2

  if (avgScore >= 90) {
    return {
      variant: 'good',
      message: 'Excelente! A página tem ótima performance.',
      icon: <ThumbsUp size={18} />,
    }
  }
  if (avgScore >= 50) {
    return {
      variant: 'needsImprovement',
      message: 'A página precisa de algumas otimizações.',
      icon: <AlertTriangle size={18} />,
    }
  }
  return {
    variant: 'poor',
    message: 'A página tem problemas de performance que precisam ser corrigidos.',
    icon: <XCircle size={18} />,
  }
}

export function PageSpeedTestModal({
  isOpen,
  onClose,
  articleTitle,
  articleUrl,
  projectId,
}: PageSpeedTestModalProps) {
  const navigate = useNavigate()
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const checkMutation = useCheckArticlePageSpeed()

  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [result, setResult] = useState<PageSpeedUrlCheckResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0)
      setProgress(0)
      setCurrentTipIndex(0)
      setResult(null)
      setError(null)

      // Start the check
      if (workspaceId && articleUrl) {
        checkMutation.mutate(
          {
            url: articleUrl,
            workspaceId,
          },
          {
            onSuccess: (data) => {
              setResult(data)
              setCurrentStep(LOADING_STEPS.length)
              setProgress(100)
            },
            onError: (err) => {
              setError(err instanceof Error ? err.message : 'Erro ao verificar velocidade da página')
            },
          }
        )
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, workspaceId, articleUrl])

  // Progress animation
  useEffect(() => {
    if (!isOpen || result || error) return

    const stepDuration = LOADING_STEPS[currentStep]?.duration || 2000
    const intervalTime = 50
    const increment = (intervalTime / stepDuration) * 100

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + increment
        if (newProgress >= 100) {
          if (currentStep < LOADING_STEPS.length - 1) {
            setCurrentStep((s) => s + 1)
            return 0
          }
          return 99 // Stay at 99% until we get the result
        }
        return newProgress
      })
    }, intervalTime)

    return () => clearInterval(progressInterval)
  }, [isOpen, currentStep, result, error])

  // Rotate tips
  useEffect(() => {
    if (!isOpen || result || error) return

    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length)
    }, 5000)

    return () => clearInterval(tipInterval)
  }, [isOpen, result, error])

  const totalProgress = useMemo(() => {
    if (result) return 100
    return ((currentStep + progress / 100) / LOADING_STEPS.length) * 100
  }, [currentStep, progress, result])

  const handleViewDetails = () => {
    navigate(`/projects?manage=${projectId}`)
    onClose()
  }

  const handleRetry = () => {
    setCurrentStep(0)
    setProgress(0)
    setError(null)
    setResult(null)

    if (workspaceId && articleUrl) {
      checkMutation.mutate(
        {
          url: articleUrl,
          workspaceId,
        },
        {
          onSuccess: (data) => {
            setResult(data)
            setCurrentStep(LOADING_STEPS.length)
            setProgress(100)
          },
          onError: (err) => {
            setError(err instanceof Error ? err.message : 'Erro ao verificar velocidade da página')
          },
        }
      )
    }
  }

  const mobileScore = result?.mobile?.performanceScore ?? null
  const desktopScore = result?.desktop?.performanceScore ?? null
  const verdict = result ? getOverallVerdict(mobileScore, desktopScore) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Teste de Velocidade" size="md">
      <div className={styles.container}>
        {/* Error State */}
        {error && (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>
              <AlertCircle size={32} />
            </div>
            <h3 className={styles.errorTitle}>Erro no teste</h3>
            <p className={styles.errorMessage}>{error}</p>
            <div className={styles.actions}>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button variant="primary" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!error && !result && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingIcon}>
              <div className={styles.loadingIconPulse} />
              <Gauge size={40} className={styles.loadingIconInner} />
            </div>

            <div className={styles.loadingText}>
              <h3 className={styles.loadingTitle}>Analisando página</h3>
              <p className={styles.loadingSubtitle}>
                Isso pode levar até 30 segundos
              </p>
            </div>

            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
              <p className={styles.progressLabel}>
                {Math.round(totalProgress)}% concluído
              </p>
            </div>

            <div className={styles.steps}>
              {LOADING_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`${styles.step} ${
                    index < currentStep
                      ? styles.completed
                      : index === currentStep
                        ? styles.active
                        : ''
                  }`}
                >
                  <span className={styles.stepIcon}>
                    {index < currentStep ? (
                      <CheckCircle2 size={16} />
                    ) : index === currentStep ? (
                      <Spinner size="sm" />
                    ) : (
                      <span className={styles.stepDot} />
                    )}
                  </span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.tips}>
              <span className={styles.tipLabel}>
                <Lightbulb size={12} />
                Você sabia?
              </span>
              <p className={styles.tipText}>{LOADING_TIPS[currentTipIndex]}</p>
            </div>
          </div>
        )}

        {/* Result State */}
        {result && !error && (
          <div className={styles.resultContainer}>
            <div className={styles.resultHeader}>
              <Gauge size={24} style={{ color: 'var(--color-primary)' }} />
              <div className={styles.articleInfo}>
                <h4 className={styles.articleTitle}>{articleTitle}</h4>
                <p className={styles.articleUrl}>{articleUrl}</p>
              </div>
            </div>

            <div className={styles.scoresRow}>
              <div className={styles.scoreItem}>
                <div className={`${styles.scoreCircle} ${styles[getScoreVariant(mobileScore)]}`}>
                  <span className={styles.scoreValue}>{mobileScore ?? '--'}</span>
                  <span className={styles.scoreLabel}>Score</span>
                </div>
                <span className={styles.scoreDeviceLabel}>
                  <Smartphone size={16} />
                  Mobile
                </span>
              </div>

              <div className={styles.scoreItem}>
                <div className={`${styles.scoreCircle} ${styles[getScoreVariant(desktopScore)]}`}>
                  <span className={styles.scoreValue}>{desktopScore ?? '--'}</span>
                  <span className={styles.scoreLabel}>Score</span>
                </div>
                <span className={styles.scoreDeviceLabel}>
                  <Monitor size={16} />
                  Desktop
                </span>
              </div>
            </div>

            {verdict && (
              <div className={`${styles.verdict} ${styles[verdict.variant]}`}>
                {verdict.icon}
                <span>{verdict.message}</span>
              </div>
            )}

            <div className={styles.actions}>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button
                variant="primary"
                leftIcon={<ExternalLink size={16} />}
                onClick={handleViewDetails}
              >
                Ver detalhes completos
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
