import { useEffect, useCallback, useState, useRef, useId } from 'react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Modal, Alert } from '@/shared/components'
import styles from './BugReportModal.module.css'
import { useCreateBugReport, useUploadAttachment, useSendToClickUp } from '../../api'
import { useBrowserInfo } from '../../hooks/useBrowserInfo'
import { useConsoleErrors } from '../../hooks/useConsoleErrors'
import { useScreenshot } from '../../hooks/useScreenshot'
import { useBugReportStore } from '../../stores/bugReportStore'
import { getFileCategory } from '../../utils/fileValidation'
import { AttachmentList, type AttachmentItem } from '../AttachmentList'
import { BugReportForm } from '../BugReportForm'
import { FileUploader } from '../FileUploader'
import { ScreenshotPreview } from '../ScreenshotPreview'
import { VideoRecorder } from '../VideoRecorder'
import type { CreateBugReportInput, BugSeverity, BugType } from '../../types'

interface ScreenshotItem {
  id: string
  file: File
  dataUrl: string
  isPrimary: boolean
}

export function BugReportModal() {
  const {
    isModalOpen,
    isSubmitting,
    consoleErrorsSnapshot,
    closeModal,
    resetModal,
    setConsoleErrorsSnapshot,
    setSubmitting,
  } = useBugReportStore()

  // Multiple screenshots support
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([])
  const [showZoomedScreenshot, setShowZoomedScreenshot] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<AttachmentItem[]>([])
  const hasAttemptedCapture = useRef(false)

  // Generate unique IDs
  const idPrefix = useId()

  const { capture, isCapturing } = useScreenshot()
  const browserInfo = useBrowserInfo()
  const { getErrors } = useConsoleErrors()

  const createBugReport = useCreateBugReport()
  const uploadAttachment = useUploadAttachment()
  const sendToClickUp = useSendToClickUp()

  // Store functions in refs to avoid dependency changes
  const getErrorsRef = useRef(getErrors)
  getErrorsRef.current = getErrors

  // Capture console errors when modal opens (only once per modal session)
  useEffect(() => {
    if (isModalOpen && !hasAttemptedCapture.current) {
      hasAttemptedCapture.current = true
      // Capture console errors snapshot
      setConsoleErrorsSnapshot(getErrorsRef.current())
    }

    // Reset the flag when modal closes
    if (!isModalOpen) {
      hasAttemptedCapture.current = false
    }
  }, [isModalOpen, setConsoleErrorsSnapshot])

  // Capture screenshot (supports multiple)
  const handleCaptureScreenshot = useCallback(async () => {
    // Close modal temporarily to capture the screen behind it
    closeModal()

    // Wait for modal to close
    await new Promise((resolve) => setTimeout(resolve, 300))

    const file = await capture({
      ignoreClasses: ['bug-report-button', 'bug-report-modal'],
    })

    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const id = `${idPrefix}-screenshot-${Date.now()}`
        setScreenshots((prev) => [
          ...prev,
          {
            id,
            file,
            dataUrl,
            isPrimary: prev.length === 0, // First screenshot is primary
          },
        ])
      }
      reader.readAsDataURL(file)
    }

    // Reopen modal
    useBugReportStore.getState().openModal()
  }, [capture, closeModal, idPrefix])

  const handleRemoveScreenshot = useCallback((id: string) => {
    setScreenshots((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      // If we removed the primary, make the first one primary
      if (filtered.length > 0 && !filtered.some((s) => s.isPrimary)) {
        filtered[0].isPrimary = true
      }
      return filtered
    })
  }, [])

  const handleSetPrimaryScreenshot = useCallback((id: string) => {
    setScreenshots((prev) =>
      prev.map((s) => ({
        ...s,
        isPrimary: s.id === id,
      }))
    )
  }, [])

  // Attachment handlers
  const handleFilesSelected = useCallback((files: File[]) => {
    const newAttachments: AttachmentItem[] = files.map((file, index) => {
      const id = `${idPrefix}-${Date.now()}-${index}`
      const isImage = getFileCategory(file.type) === 'image'
      return {
        id,
        file,
        status: 'pending' as const,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      }
    })
    setAttachments((prev) => [...prev, ...newAttachments])
  }, [idPrefix])

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id)
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const clearAllAttachments = useCallback(() => {
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl)
      }
    })
    setAttachments([])
  }, [attachments])

  const handleClose = useCallback(() => {
    resetModal()
    setScreenshots([])
    setShowZoomedScreenshot(null)
    clearAllAttachments()
  }, [resetModal, clearAllAttachments])

  const handleSubmit = useCallback(
    async (formData: { title: string; description: string; severity: BugSeverity; bug_type: BugType }) => {
      setSubmitting(true)

      try {
        // Prepare bug report data
        const reportData: CreateBugReportInput = {
          title: formData.title,
          description: formData.description,
          severity: formData.severity,
          bug_type: formData.bug_type,
          page_url: window.location.href,
          browser_info: browserInfo,
          console_errors: consoleErrorsSnapshot,
        }

        // Create bug report
        const bugReport = await createBugReport.mutateAsync(reportData)

        // Upload all screenshots
        if (screenshots.length > 0) {
          let failedCount = 0
          for (const screenshot of screenshots) {
            try {
              await uploadAttachment.mutateAsync({
                bug_report_id: bugReport.id,
                file: screenshot.file,
                attachment_type: 'screenshot',
                is_primary_screenshot: screenshot.isPrimary,
              })
            } catch (uploadError) {
              console.error('Failed to upload screenshot:', uploadError)
              failedCount++
            }
          }
          if (failedCount > 0) {
            toast.warning(`${failedCount} screenshot(s) não foi(foram) enviado(s)`)
          }
        }

        // Upload additional attachments
        if (attachments.length > 0) {
          let failedCount = 0
          for (const attachment of attachments) {
            try {
              const category = getFileCategory(attachment.file.type)
              await uploadAttachment.mutateAsync({
                bug_report_id: bugReport.id,
                file: attachment.file,
                attachment_type: category === 'image' ? 'screenshot' : 'file',
                is_primary_screenshot: false,
              })
            } catch (uploadError) {
              console.error('Failed to upload attachment:', uploadError)
              failedCount++
            }
          }
          if (failedCount > 0) {
            toast.warning(`${failedCount} anexo(s) não foi(foram) enviado(s)`)
          }
        }

        // Send to ClickUp (backend handles configuration)
        try {
          await sendToClickUp.mutateAsync(bugReport.id)
          toast.success('Bug report enviado com sucesso e criado no ClickUp!')
        } catch (clickUpError) {
          console.error('Failed to send to ClickUp:', clickUpError)
          // Show success for bug report, warning for ClickUp
          toast.success('Bug report salvo com sucesso!')
          toast.warning('Não foi possível enviar ao ClickUp')
        }
        handleClose()
      } catch (error) {
        console.error('Failed to create bug report:', error)
        toast.error('Erro ao enviar bug report. Tente novamente.')
      } finally {
        setSubmitting(false)
      }
    },
    [
      browserInfo,
      consoleErrorsSnapshot,
      createBugReport,
      uploadAttachment,
      screenshots,
      attachments,
      sendToClickUp,
      handleClose,
      setSubmitting,
    ]
  )

  // Get primary screenshot for preview
  const primaryScreenshot = screenshots.find((s) => s.isPrimary) || screenshots[0]

  return (
    <>
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Reportar Bug"
        size="lg"
      >
        <div className={`${styles.container} bug-report-modal`}>
          <div className={styles.mediaSection}>
            <div className={styles.screenshotSection}>
              <span className={styles.sectionLabel}>
                Screenshots {screenshots.length > 0 && `(${screenshots.length})`}
              </span>
              <div className={styles.mediaBlock}>
                <ScreenshotPreview
                  dataUrl={primaryScreenshot?.dataUrl || null}
                  size={primaryScreenshot?.file.size}
                  isCapturing={isCapturing}
                  onCapture={handleCaptureScreenshot}
                  onRetake={handleCaptureScreenshot}
                  onRemove={primaryScreenshot ? () => handleRemoveScreenshot(primaryScreenshot.id) : undefined}
                  onZoom={primaryScreenshot ? () => setShowZoomedScreenshot(primaryScreenshot.id) : undefined}
                  screenshotCount={screenshots.length}
                  canAddMore={screenshots.length < 5}
                />
                {/* Show thumbnails if multiple screenshots */}
                {screenshots.length > 1 && (
                  <div className={styles.screenshotThumbnails}>
                    {screenshots.map((ss) => (
                      <button
                        key={ss.id}
                        type="button"
                        className={`${styles.thumbnail} ${ss.isPrimary ? styles.thumbnailPrimary : ''}`}
                        onClick={() => handleSetPrimaryScreenshot(ss.id)}
                        title={ss.isPrimary ? 'Screenshot principal' : 'Clique para definir como principal'}
                      >
                        <img src={ss.dataUrl} alt="Screenshot thumbnail" />
                        <button
                          type="button"
                          className={styles.thumbnailRemove}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveScreenshot(ss.id)
                          }}
                          title="Remover"
                        >
                          ×
                        </button>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.videoSection}>
              <span className={styles.sectionLabel}>Gravação de tela</span>
              <div className={styles.mediaBlock}>
                <VideoRecorder />
              </div>
            </div>

            <div className={styles.attachmentSection}>
              <span className={styles.sectionLabel}>Anexos</span>
              <div className={styles.mediaBlock}>
                <FileUploader
                  onFilesSelected={handleFilesSelected}
                  currentCount={attachments.length}
                  disabled={isSubmitting}
                  compact
                />
                <AttachmentList
                  attachments={attachments}
                  onRemove={handleRemoveAttachment}
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <BugReportForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          </div>

          {consoleErrorsSnapshot.length > 0 && (
            <Alert variant="info" className={styles.consoleInfo}>
              <Info size={16} />
              <span>
                {consoleErrorsSnapshot.length} erro(s) do console serão incluídos automaticamente no report
              </span>
            </Alert>
          )}
        </div>
      </Modal>

      {/* Zoomed screenshot modal */}
      <Modal
        isOpen={!!showZoomedScreenshot}
        onClose={() => setShowZoomedScreenshot(null)}
        title="Screenshot"
        size="xl"
      >
        {showZoomedScreenshot && (
          <div className={styles.zoomedScreenshot}>
            <img
              src={screenshots.find((s) => s.id === showZoomedScreenshot)?.dataUrl}
              alt="Screenshot ampliado"
            />
          </div>
        )}
      </Modal>
    </>
  )
}
