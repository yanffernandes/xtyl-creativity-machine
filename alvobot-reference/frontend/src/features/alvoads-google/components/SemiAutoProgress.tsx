/**
 * SemiAutoProgress Component
 * Shows progress during semi-automatic content generation (without publishing)
 */

import { Check, Loader2, X, Sparkles, FileText, Puzzle } from 'lucide-react'
import styles from './AutoPublishProgress.module.css'

export type SemiAutoStep =
  | 'mining_keywords'
  | 'generating_content'
  | 'generating_extensions'
  | 'done'

export interface SemiAutoProgressProps {
  currentStep: SemiAutoStep
  error?: string | null
  onRetry?: () => void
  onCancel?: () => void
}

interface StepConfig {
  id: SemiAutoStep
  label: string
  icon: React.ReactNode
}

const STEPS: StepConfig[] = [
  { id: 'mining_keywords', label: 'Minerando palavras-chave', icon: <Sparkles size={20} /> },
  { id: 'generating_content', label: 'Gerando títulos e descrições', icon: <FileText size={20} /> },
  { id: 'generating_extensions', label: 'Gerando extensões', icon: <Puzzle size={20} /> },
]

function getStepState(
  stepId: SemiAutoStep,
  currentStep: SemiAutoStep,
  error: string | null | undefined
): 'pending' | 'active' | 'done' | 'error' {
  const stepOrder = STEPS.map((s) => s.id)
  const currentIndex = stepOrder.indexOf(currentStep)
  const stepIndex = stepOrder.indexOf(stepId)

  if (currentStep === 'done') {
    return 'done'
  }

  if (error && stepId === currentStep) {
    return 'error'
  }

  if (stepIndex < currentIndex) {
    return 'done'
  }

  if (stepIndex === currentIndex) {
    return 'active'
  }

  return 'pending'
}

export function SemiAutoProgress({
  currentStep,
  error,
  onRetry,
  onCancel,
}: SemiAutoProgressProps) {
  const isDone = currentStep === 'done'
  const hasError = !!error

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {isDone ? (
          <>
            <div className={styles.successIcon}>
              <Check size={32} />
            </div>
            <h2 className={styles.title}>Conteúdo gerado com sucesso!</h2>
            <p className={styles.subtitle}>
              Revise e edite o conteúdo nas próximas etapas antes de publicar.
            </p>
          </>
        ) : hasError ? (
          <>
            <div className={styles.errorIcon}>
              <X size={32} />
            </div>
            <h2 className={styles.title}>Erro na geração</h2>
            <p className={styles.subtitle}>{error}</p>
          </>
        ) : (
          <>
            <div className={styles.loadingIcon}>
              <Loader2 size={32} className={styles.spinning} />
            </div>
            <h2 className={styles.title}>Gerando conteúdo...</h2>
            <p className={styles.subtitle}>
              Aguarde enquanto geramos palavras-chave, títulos e extensões.
            </p>
          </>
        )}
      </div>

      <div className={styles.steps}>
        {STEPS.map((step, index) => {
          const state = getStepState(step.id, currentStep, error)
          const isFirst = index === 0
          const isLast = index === STEPS.length - 1

          return (
            <div
              key={step.id}
              className={`${styles.step} ${styles[state]}`}
            >
              <div className={styles.stepIconWrapper}>
                {!isFirst && (
                  <div className={`${styles.connectorLine} ${styles.connectorTop}`} />
                )}
                <div className={styles.stepIcon}>
                  {state === 'done' ? (
                    <Check size={16} />
                  ) : state === 'active' ? (
                    <Loader2 size={16} className={styles.spinning} />
                  ) : state === 'error' ? (
                    <X size={16} />
                  ) : (
                    step.icon
                  )}
                </div>
                {!isLast && (
                  <div className={`${styles.connectorLine} ${styles.connectorBottom}`} />
                )}
              </div>

              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          )
        })}
      </div>

      {(hasError || isDone) && (
        <div className={styles.actions}>
          {hasError && onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              Tentar novamente
            </button>
          )}
          {hasError && onCancel && (
            <button className={styles.cancelButton} onClick={onCancel}>
              Cancelar
            </button>
          )}
          {isDone && (
            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              textAlign: 'center',
              marginTop: 'var(--space-2)'
            }}>
              Avançando para revisão...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
