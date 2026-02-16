import { CheckCircle, XCircle, Loader2, AlertCircle, Sparkles, FileText, Puzzle, Save, Rocket, Check } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './BulkPublishProgress.module.css'
import type { GoogleAccountData, SourceArticleData } from '../types/campaign'

export type BulkPublishStep =
  | 'mining_keywords'
  | 'generating_content'
  | 'generating_extensions'
  | 'saving_template'
  | 'publishing'
  | 'done'

export interface BulkPublishResult {
  account: GoogleAccountData
  article: SourceArticleData | null
  success: boolean
  error?: string
  templateId?: string
}

export interface BulkPublishState {
  isActive: boolean
  total: number
  current: number
  results: BulkPublishResult[]
  currentCombination: { account: GoogleAccountData; article: SourceArticleData | null } | null
  currentStep?: BulkPublishStep
}

interface BulkPublishProgressProps {
  state: BulkPublishState
  onCancel: () => void
  onFinish: () => void
}

// Step configuration for the visual indicator
interface StepConfig {
  id: BulkPublishStep
  label: string
  icon: React.ReactNode
}

const STEPS: StepConfig[] = [
  { id: 'mining_keywords', label: 'Minerando palavras-chave', icon: <Sparkles size={16} /> },
  { id: 'generating_content', label: 'Gerando titulos e descricoes', icon: <FileText size={16} /> },
  { id: 'generating_extensions', label: 'Gerando extensoes', icon: <Puzzle size={16} /> },
  { id: 'saving_template', label: 'Salvando template', icon: <Save size={16} /> },
  { id: 'publishing', label: 'Publicando campanha', icon: <Rocket size={16} /> },
]

function getStepState(
  stepId: BulkPublishStep,
  currentStep: BulkPublishStep | undefined
): 'pending' | 'active' | 'done' {
  if (!currentStep || currentStep === 'done') {
    return 'done'
  }

  const stepOrder = STEPS.map((s) => s.id)
  const currentIndex = stepOrder.indexOf(currentStep)
  const stepIndex = stepOrder.indexOf(stepId)

  if (stepIndex < currentIndex) {
    return 'done'
  }

  if (stepIndex === currentIndex) {
    return 'active'
  }

  return 'pending'
}

export function BulkPublishProgress({ state, onCancel, onFinish }: BulkPublishProgressProps) {
  const { total, current, results, currentCombination, isActive, currentStep } = state

  const successCount = results.filter(r => r.success).length
  const errorCount = results.filter(r => !r.success).length
  const progress = total > 0 ? Math.round((current / total) * 100) : 0
  const isComplete = current >= total && !isActive

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isComplete ? 'Publicacao em Massa Concluida' : 'Publicando Campanhas...'}
          </h2>
          <p className={styles.subtitle}>
            {isComplete
              ? `${successCount} de ${total} campanhas publicadas com sucesso`
              : `Processando campanha ${current + 1} de ${total}`
            }
          </p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressWrapper}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.progressText}>{progress}%</span>
        </div>

        {/* Current Operation with Article Info */}
        {currentCombination && isActive && (
          <div className={styles.currentOperation}>
            <Loader2 className={styles.spinnerIcon} size={20} />
            <div className={styles.currentInfo}>
              <span className={styles.currentLabel}>Processando:</span>
              <span className={styles.currentValue}>
                {currentCombination.account.customerName || currentCombination.account.customerId}
                {currentCombination.article && ` - ${currentCombination.article.title}`}
              </span>
            </div>
          </div>
        )}

        {/* Step Indicators - shows what's happening in current campaign */}
        {isActive && currentStep && (
          <div className={styles.stepsContainer}>
            <div className={styles.steps}>
              {STEPS.map((step, index) => {
                const stepState = getStepState(step.id, currentStep)
                const isFirst = index === 0
                const isLast = index === STEPS.length - 1

                return (
                  <div
                    key={step.id}
                    className={`${styles.step} ${styles[stepState]}`}
                  >
                    <div className={styles.stepIconWrapper}>
                      {!isFirst && (
                        <div className={`${styles.connectorLine} ${styles.connectorTop}`} />
                      )}
                      <div className={styles.stepIcon}>
                        {stepState === 'done' ? (
                          <Check size={12} />
                        ) : stepState === 'active' ? (
                          <Loader2 size={12} className={styles.spinning} />
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
          </div>
        )}

        {/* Results Summary */}
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <CheckCircle size={18} className={styles.successIcon} />
            <span>{successCount} sucesso</span>
          </div>
          <div className={styles.summaryItem}>
            <XCircle size={18} className={styles.errorIcon} />
            <span>{errorCount} erro(s)</span>
          </div>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <div className={styles.resultsList}>
            <h3 className={styles.resultsTitle}>Resultados:</h3>
            <div className={styles.resultsScroll}>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`${styles.resultItem} ${result.success ? styles.resultSuccess : styles.resultError}`}
                >
                  {result.success ? (
                    <CheckCircle size={16} className={styles.resultIconSuccess} />
                  ) : (
                    <XCircle size={16} className={styles.resultIconError} />
                  )}
                  <div className={styles.resultInfo}>
                    <span className={styles.resultAccount}>
                      {result.account.customerName || result.account.customerId}
                    </span>
                    {result.article && (
                      <span className={styles.resultArticle}>
                        {result.article.title}
                      </span>
                    )}
                    {result.error && (
                      <span className={styles.resultErrorText}>
                        <AlertCircle size={12} /> {result.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {isComplete ? (
            <Button variant="primary" onClick={onFinish}>
              Concluir
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
