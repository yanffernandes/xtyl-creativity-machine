import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import styles from './WizardStepper.module.css'
import { useGoogleAdsWizardStore } from '../stores/googleAdsWizardStore'
import { STEP_LABELS, type GoogleWizardStep } from '../types/campaign'

export function WizardStepper() {
  const { currentStep, completedSteps, setCurrentStep, canGoToStep, getStepOrder } = useGoogleAdsWizardStore()

  const stepOrder = getStepOrder()

  const handleStepClick = (step: GoogleWizardStep) => {
    if (canGoToStep(step)) {
      setCurrentStep(step)
    }
  }

  return (
    <div className={styles.stepper}>
      {stepOrder.map((step, index) => {
        const isActive = currentStep === step
        const isCompleted = completedSteps.has(step)
        const isClickable = canGoToStep(step)

        return (
          <div key={step} className={styles.stepWrapper}>
            <button
              type="button"
              className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
              onClick={() => handleStepClick(step)}
              disabled={!isClickable}
            >
              <span className={styles.stepNumber}>
                {isCompleted ? <Check size={14} /> : index + 1}
              </span>
              <span className={styles.stepLabel}>{STEP_LABELS[step]}</span>
            </button>
          </div>
        )
      }).reduce<ReactNode[]>((acc, step, index) => {
        // Adiciona o step
        acc.push(step)
        // Adiciona connector entre steps (não após o último)
        if (index < stepOrder.length - 1) {
          const isCompleted = completedSteps.has(stepOrder[index])
          acc.push(
            <div
              key={`connector-${index}`}
              className={`${styles.connector} ${isCompleted ? styles.completed : ''}`}
            />
          )
        }
        return acc
      }, [])}
    </div>
  )
}
