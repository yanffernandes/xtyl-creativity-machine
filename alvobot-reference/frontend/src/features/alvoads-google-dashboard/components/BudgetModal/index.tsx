import { useState } from 'react'
import { Modal, Button, Input } from '@/shared/components'
import styles from './BudgetModal.module.css'
import type { CampaignMetrics } from '../../types'

interface BudgetModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: CampaignMetrics
  onConfirm: (newBudget: number) => Promise<void>
  isLoading?: boolean
}

export function BudgetModal({
  isOpen,
  onClose,
  campaign,
  onConfirm,
  isLoading,
}: BudgetModalProps) {
  const [newBudget, setNewBudget] = useState(campaign.budget.toString())
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const budgetValue = parseFloat(newBudget)

    if (isNaN(budgetValue) || budgetValue <= 0) {
      setError('Digite um valor válido maior que zero')
      return
    }

    if (budgetValue === campaign.budget) {
      setError('O novo orçamento deve ser diferente do atual')
      return
    }

    try {
      await onConfirm(budgetValue)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar orçamento'
      setError(message)
    }
  }

  const handleClose = () => {
    setNewBudget(campaign.budget.toString())
    setError(null)
    onClose()
  }

  // Quick adjust buttons
  const adjustBudget = (factor: number) => {
    const current = parseFloat(newBudget) || campaign.budget
    const adjusted = Math.round(current * factor * 100) / 100
    setNewBudget(adjusted.toString())
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Alterar Orçamento">
      <form onSubmit={handleSubmit}>
        <div className={styles.campaignInfo}>
          <strong>{campaign.name}</strong>
          <span>Orçamento atual: R$ {campaign.budget.toFixed(2)}</span>
        </div>

        <div className={styles.inputContainer}>
          <Input
            label="Novo orçamento (R$)"
            type="number"
            step="0.01"
            min="1"
            value={newBudget}
            onChange={(e) => setNewBudget(e.target.value)}
            error={error || undefined}
            autoFocus
          />
        </div>

        <div className={styles.quickAdjust}>
          <span className={styles.quickAdjustLabel}>Ajuste rápido:</span>
          <div className={styles.quickAdjustButtons}>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBudget(0.5)}
            >
              -50%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBudget(0.75)}
            >
              -25%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBudget(1.25)}
            >
              +25%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBudget(1.5)}
            >
              +50%
            </button>
            <button
              type="button"
              className={styles.quickButton}
              onClick={() => adjustBudget(2)}
            >
              +100%
            </button>
          </div>
        </div>

        {parseFloat(newBudget) !== campaign.budget && !isNaN(parseFloat(newBudget)) && (
          <div className={styles.preview}>
            <span>Mudança:</span>
            <span
              className={
                parseFloat(newBudget) > campaign.budget
                  ? styles.increase
                  : styles.decrease
              }
            >
              {parseFloat(newBudget) > campaign.budget ? '+' : ''}
              {(((parseFloat(newBudget) - campaign.budget) / campaign.budget) * 100).toFixed(0)}%
            </span>
          </div>
        )}

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Salvar Orçamento
          </Button>
        </div>
      </form>
    </Modal>
  )
}
