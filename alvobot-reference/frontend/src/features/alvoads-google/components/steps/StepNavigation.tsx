import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './Steps.module.css'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'

interface StepNavigationProps {
  onNext?: () => void
  onPrevious?: () => void
  nextLabel?: string
  previousLabel?: string
  nextDisabled?: boolean
  isLoading?: boolean
}

export function StepNavigation({
  onNext,
  onPrevious,
  nextLabel = 'Próximo',
  previousLabel = 'Anterior',
  nextDisabled = false,
  isLoading = false,
}: StepNavigationProps) {
  const {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    markStepCompleted,
    getStepOrder,
    sourceArticles,
    setShowPublishModeModal,
  } = useGoogleAdsWizardStore()

  const stepOrder = getStepOrder()
  const currentIndex = stepOrder.indexOf(currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === stepOrder.length - 1

  const handlePrevious = () => {
    if (onPrevious) {
      onPrevious()
    } else {
      goToPreviousStep()
    }
  }

  const handleNext = () => {
    if (onNext) {
      onNext()
    } else {
      markStepCompleted(currentStep)
      // If on campaign step with source article(s), show publish mode modal
      const hasArticles = sourceArticles.length > 0
      if (currentStep === 'campaign' && hasArticles) {
        setShowPublishModeModal(true)
      } else {
        goToNextStep()
      }
    }
  }

  return (
    <div className={styles.stepNavigation}>
      <div className={styles.navLeft}>
        {!isFirstStep && (
          <Button
            variant="ghost"
            leftIcon={<ChevronLeft size={18} />}
            onClick={handlePrevious}
            disabled={isLoading}
          >
            {previousLabel}
          </Button>
        )}
      </div>
      <div className={styles.navRight}>
        {!isLastStep && (
          <Button
            variant="primary"
            rightIcon={<ChevronRight size={18} />}
            onClick={handleNext}
            disabled={nextDisabled || isLoading}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
