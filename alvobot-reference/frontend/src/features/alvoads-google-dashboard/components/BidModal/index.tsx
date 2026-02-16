import { useState } from 'react'
import { Modal, Button, Input } from '@/shared/components'
import styles from './BidModal.module.css'
import type { CampaignMetrics } from '../../types'

interface BidModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: CampaignMetrics
  currentBid: number
  onConfirm: (newBid: number) => Promise<void>
  isLoading?: boolean
}

export function BidModal({
  isOpen,
  onClose,
  campaign,
  currentBid,
  onConfirm,
  isLoading,
}: BidModalProps) {
  const [newBid, setNewBid] = useState(currentBid.toString())
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const bidValue = parseFloat(newBid)

    if (isNaN(bidValue) || bidValue <= 0) {
      setError('Digite um valor valido maior que zero')
      return
    }

    if (bidValue === currentBid) {
      setError('O novo lance deve ser diferente do atual')
      return
    }

    try {
      await onConfirm(bidValue)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar lance'
      setError(message)
    }
  }

  const handleClose = () => {
    setNewBid(currentBid.toString())
    setError(null)
    onClose()
  }

  // Quick adjust buttons
  const adjustBid = (factor: number) => {
    const current = parseFloat(newBid) || currentBid
    const adjusted = Math.round(current * factor * 100) / 100
    setNewBid(adjusted.toString())
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Alterar Lance (CPC Maximo)">
      <form onSubmit={handleSubmit}>
        <div className={styles.campaignInfo}>
          <strong>{campaign.name}</strong>
          <span>Lance atual: R$ {currentBid.toFixed(2)}</span>
        </div>

        <div className={styles.inputContainer}>
          <Input
            label="Novo lance (R$)"
            type="number"
            step="0.01"
            min="0.01"
            value={newBid}
            onChange={(e) => setNewBid(e.target.value)}
            error={error || undefined}
            autoFocus
          />
        </div>

        <div className={styles.quickAdjust}>
          <span className={styles.quickAdjustLabel}>Ajuste rapido:</span>
          <div className={styles.quickAdjustButtons}>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBid(0.5)}
            >
              -50%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBid(0.75)}
            >
              -25%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBid(1.25)}
            >
              +25%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBid(1.5)}
            >
              +50%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBid(2)}
            >
              +100%
            </button>
          </div>
        </div>

        {parseFloat(newBid) !== currentBid && !isNaN(parseFloat(newBid)) && (
          <div className={styles.preview}>
            <span>Mudanca:</span>
            <span
              className={
                parseFloat(newBid) > currentBid
                  ? styles.increase
                  : styles.decrease
              }
            >
              {parseFloat(newBid) > currentBid ? '+' : ''}
              {(((parseFloat(newBid) - currentBid) / currentBid) * 100).toFixed(0)}%
            </span>
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Salvar Lance
          </Button>
        </div>
      </form>
    </Modal>
  )
}
