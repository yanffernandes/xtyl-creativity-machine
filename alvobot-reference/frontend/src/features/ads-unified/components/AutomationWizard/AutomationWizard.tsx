/**
 * AutomationWizard Component
 *
 * Multi-step form (5 steps) for creating/editing automation rules.
 * Follows Revealbot UX patterns: step indicator, card-based content,
 * fixed footer navigation with validation.
 *
 * Steps:
 * 1. Plataforma & Escopo (Platform, connections, level)
 * 2. Filtros (Entity filters)
 * 3. Regras (Tasks = Conditions + Actions)
 * 4. Agendamento (Schedule)
 * 5. Notificações (Notification preferences)
 */

import { useCallback, useState } from 'react'
import {
  Globe,
  Filter,
  Zap,
  Clock,
  Bell,
  Check,
} from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/shared/components'
import { useCreateRule, useUpdateRule } from '../../api/automationMutations'
import {
  useAutomationForm,
  type AutomationFormState,
} from '../../hooks/useAutomationForm'
import type { AutomationRule, RuleStatus } from '../../types/automation'
import { PlatformStep } from './steps/PlatformStep'
import { FiltersStep } from './steps/FiltersStep'
import { TasksStep } from './steps/TasksStep'
import { ScheduleStep } from './steps/ScheduleStep'
import { NotifyStep } from './steps/NotifyStep'
import styles from './AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

export interface AutomationWizardProps {
  /** Pre-fill data for edit mode */
  initialData?: Partial<AutomationFormState>
  /** Rule ID when editing */
  ruleId?: string
  /** Close the wizard */
  onClose: () => void
  /** Callback after successful save */
  onSave?: (rule: AutomationRule) => void
}

// ============================================================================
// STEP CONFIG
// ============================================================================

const STEPS = [
  { label: 'Plataforma', icon: Globe, description: 'Defina a plataforma, conexões e nível da regra' },
  { label: 'Filtros', icon: Filter, description: 'Filtre quais entidades serão avaliadas' },
  { label: 'Regras', icon: Zap, description: 'Configure condições e ações para cada task' },
  { label: 'Agendamento', icon: Clock, description: 'Defina quando a regra será executada' },
  { label: 'Notificações', icon: Bell, description: 'Configure alertas por email' },
] as const

// ============================================================================
// COMPONENT
// ============================================================================

export function AutomationWizard({
  initialData,
  ruleId,
  onClose,
  onSave,
}: AutomationWizardProps) {
  const form = useAutomationForm(initialData)
  const createRule = useCreateRule()
  const updateRule = useUpdateRule()
  const [saveError, setSaveError] = useState<string | null>(null)

  const isEditing = !!ruleId
  const isSaving = createRule.isPending || updateRule.isPending

  // ── Save handler ──

  const handleSave = useCallback(
    async (status: RuleStatus) => {
      setSaveError(null)

      const input = { ...form.toCreateInput(), status }

      try {
        let result: AutomationRule

        if (isEditing && ruleId) {
          result = await updateRule.mutateAsync({
            id: ruleId,
            data: input,
          })
        } else {
          result = await createRule.mutateAsync(input)
        }

        // If saving as draft or active, we may need to toggle status
        // The backend handles status via the input — this is a simplification
        onSave?.(result)
        onClose()
      } catch (err) {
        setSaveError(
          err instanceof Error
            ? err.message
            : 'Erro ao salvar a regra. Tente novamente.',
        )
      }
    },
    [form, isEditing, ruleId, createRule, updateRule, onSave, onClose],
  )

  // ── Step click handler (allows jumping to completed/current steps) ──

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      // Allow going backwards freely, or to the next step if current is valid
      if (stepIndex <= form.currentStep) {
        form.goToStep(stepIndex)
      } else if (stepIndex === form.currentStep + 1) {
        const validation = form.validateStep(form.currentStep)
        if (validation.valid) {
          form.goToStep(stepIndex)
        }
      }
    },
    [form],
  )

  // ── Next step with validation ──

  const handleNext = useCallback(() => {
    const validation = form.validateStep(form.currentStep)
    if (validation.valid) {
      form.nextStep()
    }
  }, [form])

  // ── Current step validation ──

  const currentValidation = form.validateStep(form.currentStep)

  // ── Render step content ──

  const renderStepContent = () => {
    switch (form.currentStep) {
      case 0:
        return <PlatformStep form={form} />
      case 1:
        return <FiltersStep form={form} />
      case 2:
        return <TasksStep form={form} />
      case 3:
        return <ScheduleStep form={form} />
      case 4:
        return <NotifyStep form={form} />
      default:
        return null
    }
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
    <div className={styles.wizard}>
      {/* ── Step Indicator Bar ── */}
      <div className={styles.stepIndicator}>
        {STEPS.map((step, i) => {
          const StepIcon = step.icon
          const isActive = i === form.currentStep
          const isCompleted = i < form.currentStep

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div
                  className={clsx(
                    styles.stepConnector,
                    isCompleted && styles.completedConnector,
                  )}
                />
              )}
              <div
                className={clsx(
                  styles.step,
                  isActive && styles.active,
                  isCompleted && styles.completed,
                )}
                onClick={() => handleStepClick(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleStepClick(i)
                  }
                }}
              >
                <span className={styles.stepNumber}>
                  {isCompleted ? <Check size={14} /> : i + 1}
                </span>
                <span className={styles.stepIcon}>
                  <StepIcon size={16} />
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className={styles.content}>
        <h2 className={styles.stepTitle}>{STEPS[form.currentStep].label}</h2>
        <p className={styles.stepDescription}>
          {STEPS[form.currentStep].description}
        </p>

        {renderStepContent()}

        {/* Save error */}
        {saveError && (
          <div className={styles.validationErrors}>
            <span className={styles.validationError}>{saveError}</span>
          </div>
        )}
      </div>

      {/* ── Footer Navigation ── */}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>

        <div className={styles.footerRight}>
          {form.currentStep > 0 && (
            <Button
              variant="secondary"
              onClick={form.prevStep}
              disabled={isSaving}
            >
              Anterior
            </Button>
          )}

          {form.currentStep < STEPS.length - 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!currentValidation.valid}
            >
              Próximo
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => handleSave('draft')}
                disabled={isSaving}
                isLoading={isSaving}
              >
                Salvar Rascunho
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave('active')}
                disabled={!form.isValid || isSaving}
                isLoading={isSaving}
              >
                {isEditing ? 'Salvar Regra' : 'Ativar Regra'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}

export default AutomationWizard
