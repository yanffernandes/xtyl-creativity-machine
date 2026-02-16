import { useMemo, useEffect } from 'react'
import { Button } from '@/shared/components/Button'
import { CreativeGrid } from './CreativeGrid'
import styles from './StepApproval.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'

// Icons
const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const AlertTriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const CheckAllIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

export function StepApproval() {
  const {
    generatedImages,
    approvedImages,
    approveImage,
    goToNextStep,
    goToPreviousStep,
    getRequiredImageCount,
    hasAllRequiredApprovals,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  // Calculate stats
  const stats = useMemo(() => {
    const total = generatedImages.length
    const approved = approvedImages.length
    const pending = total - approved - generatedImages.filter((img) => img.status === 'failed').length
    const failed = generatedImages.filter((img) => img.status === 'failed').length
    const required = getRequiredImageCount()

    return { total, approved, pending, failed, required }
  }, [generatedImages, approvedImages, getRequiredImageCount])

  // Check if can proceed
  const canProceed = hasAllRequiredApprovals()

  // Mark step as completed when all required images are approved
  useEffect(() => {
    if (canProceed) {
      markStepCompleted('creative_approval')
    } else {
      markStepIncomplete('creative_approval')
    }
  }, [canProceed, markStepCompleted, markStepIncomplete])

  // Handle approve all pending images
  const handleApproveAll = () => {
    // Get all images that are not already approved and not failed
    const pendingImages = generatedImages.filter(
      (img) =>
        img.status !== 'failed' &&
        !approvedImages.some((approved) => approved.id === img.id)
    )

    // Approve each pending image
    pendingImages.forEach((img) => {
      approveImage(img.id)
    })
  }

  // Count of images that can be approved
  const pendingCount = useMemo(() => {
    return generatedImages.filter(
      (img) => img.status !== 'failed' && !approvedImages.some((approved) => approved.id === img.id)
    ).length
  }, [generatedImages, approvedImages])

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Aprovar Criativos</h2>
        <p className={styles.description}>
          Revise as imagens geradas e aprove as melhores. Caso alguma nao fique boa, regenere.
          Você precisa aprovar pelo menos {stats.required} imagens para continuar.
        </p>
      </div>

      {/* Toolbar with Stats and Approve All Button */}
      <div className={styles.toolbar}>
        <div className={styles.statsSummary}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.approved}</span>
            <span className={styles.statLabel}>Aprovadas</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{stats.pending}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
          {stats.failed > 0 && (
            <>
              <div className={styles.statDivider} />
              <div className={`${styles.statItem} ${styles.statFailed}`}>
                <span className={styles.statValue}>{stats.failed}</span>
                <span className={styles.statLabel}>Falharam</span>
              </div>
            </>
          )}
        </div>

        {/* Approve All Button */}
        {pendingCount > 0 && (
          <Button
            className={styles.approveAllButton}
            onClick={handleApproveAll}
            leftIcon={<CheckAllIcon />}
          >
            Aprovar Todos ({pendingCount})
          </Button>
        )}
      </div>

      {/* Progress indicator */}
      {stats.approved < stats.required && (
        <div className={styles.progressMessage}>
          <AlertTriangleIcon />
          <span>
            Aprove mais <strong>{stats.required - stats.approved}</strong> imagens para continuar
          </span>
        </div>
      )}

      {stats.approved >= stats.required && (
        <div className={styles.successMessage}>
          <CheckCircleIcon />
          <span>
            Você tem <strong>{stats.approved}</strong> imagens aprovadas. Pode continuar!
          </span>
        </div>
      )}

      {/* Creative Grid */}
      <CreativeGrid />

      <div className={styles.actionsFooter}>
        <Button variant="outline" onClick={goToPreviousStep}>
          Voltar
        </Button>
        <Button onClick={goToNextStep} disabled={!canProceed}>
          Continuar para Textos
        </Button>
      </div>
    </div>
  )
}
