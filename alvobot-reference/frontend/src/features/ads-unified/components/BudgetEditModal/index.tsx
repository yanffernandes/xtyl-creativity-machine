/**
 * BudgetEditModal Component
 *
 * Modal for editing campaign daily budget.
 * Validates input and shows current vs new budget comparison.
 */

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Modal, Button, Input } from '@/shared/components'
import { PlatformBadge } from '../PlatformBadge'
import styles from './BudgetEditModal.module.css'
import type { UnifiedCampaign } from '../../types'

export interface BudgetEditModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newBudget: number) => void
  campaign: UnifiedCampaign | null
  isLoading?: boolean
}

export function BudgetEditModal({
  isOpen,
  onClose,
  onConfirm,
  campaign,
  isLoading = false,
}: BudgetEditModalProps) {
  const [budget, setBudget] = useState('')
  const [error, setError] = useState('')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      setBudget(campaign.budget?.toString() || '')
      setError('')
    }
  }, [isOpen, campaign])

  if (!campaign) return null

  const currentBudget = campaign.budget || 0
  const newBudget = parseFloat(budget) || 0
  const difference = newBudget - currentBudget
  const percentChange = currentBudget > 0 ? (difference / currentBudget) * 100 : 0

  const handleBudgetChange = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return

    setBudget(cleaned)
    setError('')
  }

  const handleConfirm = () => {
    const value = parseFloat(budget)

    if (isNaN(value) || value <= 0) {
      setError('Digite um valor válido maior que zero')
      return
    }

    if (value === currentBudget) {
      setError('O novo orçamento é igual ao atual')
      return
    }

    onConfirm(value)
  }

  const getTrendIcon = () => {
    if (difference > 0) return <TrendingUp size={16} />
    if (difference < 0) return <TrendingDown size={16} />
    return <Minus size={16} />
  }

  const getTrendClass = () => {
    if (difference > 0) return styles.increase
    if (difference < 0) return styles.decrease
    return styles.neutral
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={styles.headerContent}>
        <span className={styles.icon}>
          <DollarSign size={20} />
        </span>
        <span>Editar Orçamento</span>
      </div>

      <div className={styles.content}>
        {/* Campaign Info */}
        <div className={styles.campaignInfo}>
          <PlatformBadge platform={campaign.platform} size="sm" />
          <div className={styles.campaignDetails}>
            <span className={styles.campaignName}>{campaign.name}</span>
            <span className={styles.campaignId}>ID: {campaign.id}</span>
          </div>
        </div>

        {/* Current Budget */}
        <div className={styles.currentBudget}>
          <span className={styles.label}>Orçamento atual</span>
          <span className={styles.value}>{formatCurrency(currentBudget)}</span>
          <span className={styles.budgetType}>
            {campaign.budgetType === 'daily' ? 'por dia' : 'total'}
          </span>
        </div>

        {/* Budget Input */}
        <div className={styles.inputGroup}>
          <Input
            label="Novo orçamento diário (R$)"
            type="text"
            inputMode="decimal"
            value={budget}
            onChange={(e) => handleBudgetChange(e.target.value)}
            placeholder="0.00"
            error={error}
            autoFocus
          />
        </div>

        {/* Budget Comparison */}
        {newBudget > 0 && newBudget !== currentBudget && (
          <div className={`${styles.comparison} ${getTrendClass()}`}>
            {getTrendIcon()}
            <span className={styles.comparisonText}>
              {difference > 0 ? 'Aumento' : 'Redução'} de{' '}
              <strong>{formatCurrency(Math.abs(difference))}</strong>
              {currentBudget > 0 && (
                <span className={styles.percent}>
                  ({percentChange > 0 ? '+' : ''}
                  {percentChange.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isLoading={isLoading}
          disabled={!budget || parseFloat(budget) <= 0}
        >
          Salvar Orçamento
        </Button>
      </div>
    </Modal>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export default BudgetEditModal
