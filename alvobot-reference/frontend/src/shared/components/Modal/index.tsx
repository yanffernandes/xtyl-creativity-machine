import { useEffect, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, closeOnEscape, onClose])

  useEffect(() => {
    if (isOpen && contentRef.current) {
      contentRef.current.focus()
    }
  }, [isOpen])

  const handleOverlayClick = () => {
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {closeOnOverlayClick && (
        <button
          type="button"
          className={styles.backdrop}
          onClick={handleOverlayClick}
          aria-label="Fechar modal"
        />
      )}
      <div
        ref={contentRef}
        className={clsx(styles.content, styles[size])}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        {description && (
          <p id="modal-description" className={styles.description}>
            {description}
          </p>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}
