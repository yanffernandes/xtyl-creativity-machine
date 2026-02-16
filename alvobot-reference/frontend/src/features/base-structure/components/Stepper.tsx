import { Check } from 'lucide-react'
import styles from './Stepper.module.css'

interface Step {
  number: number
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isCurrent = currentStep === step.number
        const isClickable = onStepClick && (isCompleted || isCurrent)

        return (
          <div key={step.number} className={styles.stepContainer}>
            <button
              type="button"
              className={`${styles.step} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
              onClick={() => isClickable && onStepClick(step.number)}
              disabled={!isClickable}
            >
              <div className={styles.stepNumber}>
                {isCompleted ? <Check size={16} /> : step.number}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`${styles.connector} ${isCompleted ? styles.connectorCompleted : ''}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
