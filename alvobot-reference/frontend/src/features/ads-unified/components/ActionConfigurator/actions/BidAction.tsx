/**
 * BidAction — increase_bid / decrease_bid / set_bid
 *
 * For increase/decrease: percentage-based change with optional min/max.
 * For set_bid: absolute amount input.
 */

import { useCallback } from 'react'
import { Info } from 'lucide-react'
import type {
  AutomationActionType,
  BidChangeParams,
  SetBidParams,
  ActionParams,
} from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

// ============================================================================
// TYPES
// ============================================================================

type BidActionType = Extract<AutomationActionType, 'increase_bid' | 'decrease_bid' | 'set_bid'>

interface BidActionProps {
  action: BidActionType
  params: BidChangeParams | SetBidParams
  onChange: (params: ActionParams) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BidAction({ action, params, onChange }: BidActionProps) {
  if (action === 'set_bid') {
    return <SetBidForm params={params as SetBidParams} onChange={onChange} />
  }

  return (
    <BidChangeForm
      action={action as 'increase_bid' | 'decrease_bid'}
      params={params as BidChangeParams}
      onChange={onChange}
    />
  )
}

// ============================================================================
// SET BID
// ============================================================================

function SetBidForm({
  params,
  onChange,
}: {
  params: SetBidParams
  onChange: (params: ActionParams) => void
}) {
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...params, amount: e.target.value ? Number(e.target.value) : 0 })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Valor do bid</label>
        <div className={styles.inputWrapper}>
          <span className={styles.inputPrefix}>R$</span>
          <input
            type="number"
            className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
            value={params.amount || ''}
            onChange={handleAmountChange}
            placeholder="0,00"
            min={0}
            step={0.01}
          />
        </div>
        <span className={styles.fieldHint}>O lance será definido para este valor fixo</span>
      </div>
    </div>
  )
}

// ============================================================================
// BID CHANGE (increase / decrease)
// ============================================================================

function BidChangeForm({
  action,
  params,
  onChange,
}: {
  action: 'increase_bid' | 'decrease_bid'
  params: BidChangeParams
  onChange: (params: ActionParams) => void
}) {
  const isIncrease = action === 'increase_bid'

  const handleChange = useCallback(
    (field: keyof BidChangeParams, value: number | undefined) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  const infoText = `O lance será ${isIncrease ? 'aumentado' : 'diminuído'} em ${params.percentage || 0}%${
    params.minBid != null ? `. Bid mínimo: R$ ${params.minBid}` : ''
  }${params.maxBid != null ? `. Bid máximo: R$ ${params.maxBid}` : ''}.`

  return (
    <div className={styles.actionForm}>
      {/* Percentage */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          Percentual de {isIncrease ? 'aumento' : 'redução'}
        </label>
        <div className={styles.inputWrapper}>
          <input
            type="number"
            className={`${styles.nativeInput} ${styles.inputWithSuffix}`}
            value={params.percentage ?? ''}
            onChange={(e) => handleChange('percentage', e.target.value ? Number(e.target.value) : 0)}
            placeholder="10"
            min={0}
            max={100}
            step={1}
          />
          <span className={styles.inputSuffix}>%</span>
        </div>
      </div>

      {/* Min / Max bid */}
      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Bid mínimo (opcional)</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.minBid ?? ''}
              onChange={(e) =>
                handleChange('minBid', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Sem limite"
              min={0}
              step={0.01}
            />
          </div>
          <span className={styles.fieldHint}>Impede que o lance fique abaixo deste valor</span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Bid máximo (opcional)</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.maxBid ?? ''}
              onChange={(e) =>
                handleChange('maxBid', e.target.value ? Number(e.target.value) : undefined)
              }
              placeholder="Sem limite"
              min={0}
              step={0.01}
            />
          </div>
          <span className={styles.fieldHint}>Impede que o lance ultrapasse este valor</span>
        </div>
      </div>

      {/* Info banner */}
      <div className={styles.infoBanner}>
        <Info className={styles.infoBannerIcon} />
        <span className={styles.infoBannerText}>{infoText}</span>
      </div>
    </div>
  )
}
