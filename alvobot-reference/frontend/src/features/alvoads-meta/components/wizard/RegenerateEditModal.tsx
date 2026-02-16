import { useState } from 'react'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { Textarea } from '@/shared/components/Textarea'
import styles from './RegenerateEditModal.module.css'

interface RegenerateEditModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (customDirections: string) => void
  imageUrl?: string
  isLoading?: boolean
}

export function RegenerateEditModal({
  isOpen,
  onClose,
  onConfirm,
  imageUrl,
  isLoading = false,
}: RegenerateEditModalProps) {
  const [directions, setDirections] = useState('')

  const handleConfirm = () => {
    if (directions.trim()) {
      onConfirm(directions.trim())
      setDirections('')
    }
  }

  const handleClose = () => {
    setDirections('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md" title="Editar e Regenerar">
      <div className={styles.content}>
        {imageUrl && (
          <div className={styles.previewContainer}>
            <img src={imageUrl} alt="Imagem atual" className={styles.preview} />
          </div>
        )}
        <div className={styles.inputSection}>
          <label htmlFor="edit-directions" className={styles.label}>
            Descreva as alterações desejadas:
          </label>
          <Textarea
            id="edit-directions"
            value={directions}
            onChange={(e) => setDirections(e.target.value)}
            placeholder="Ex: Remover o texto, usar cores mais vibrantes, adicionar pessoa sorrindo..."
            rows={4}
            maxLength={500}
            disabled={isLoading}
          />
          <span className={styles.charCount}>{directions.length}/500</span>
        </div>
        <div className={styles.tips}>
          <p className={styles.tipsTitle}>Dicas:</p>
          <ul className={styles.tipsList}>
            <li>Seja específico sobre o que quer mudar</li>
            <li>Mencione elementos visuais (cores, pessoas, objetos)</li>
            <li>Descreva o estilo desejado (moderno, minimalista, etc.)</li>
          </ul>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!directions.trim() || isLoading}
            isLoading={isLoading}
          >
            Regenerar com Edições
          </Button>
        </div>
      </div>
    </Modal>
  )
}
