/**
 * BidStrategyAction — set_bid_strategy
 *
 * Configures a bid strategy change. Available strategies differ by platform.
 * Some strategies (TARGET_CPA, TARGET_ROAS) require additional target values.
 */

import { useCallback } from 'react'
import type { BidStrategyParams, ActionParams, Platform } from '../../../types/automation'
import {
  META_BID_STRATEGY_OPTIONS,
  GOOGLE_BIDDING_STRATEGY_OPTIONS,
} from '../../../constants/enums'
import styles from '../ActionConfigurator.module.css'

// ============================================================================
// STRATEGIES THAT REQUIRE ADDITIONAL PARAMS
// ============================================================================

const STRATEGIES_WITH_CPA = ['TARGET_CPA', 'COST_CAP']
const STRATEGIES_WITH_ROAS = ['TARGET_ROAS', 'LOWEST_COST_WITH_MIN_ROAS']
const STRATEGIES_WITH_BID = ['LOWEST_COST_WITH_BID_CAP']

// ============================================================================
// TYPES
// ============================================================================

interface BidStrategyActionProps {
  params: BidStrategyParams
  onChange: (params: ActionParams) => void
  platform: Platform
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BidStrategyAction({ params, onChange, platform }: BidStrategyActionProps) {
  const strategyOptions =
    platform === 'meta' ? META_BID_STRATEGY_OPTIONS : GOOGLE_BIDDING_STRATEGY_OPTIONS

  const needsCpa = STRATEGIES_WITH_CPA.includes(params.strategy)
  const needsRoas = STRATEGIES_WITH_ROAS.includes(params.strategy)
  const needsBid = STRATEGIES_WITH_BID.includes(params.strategy)

  const handleStrategyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const strategy = e.target.value
      // Reset target values when strategy changes
      onChange({ strategy, targetCpa: undefined, targetRoas: undefined })
    },
    [onChange],
  )

  const handleTargetChange = useCallback(
    (field: 'targetCpa' | 'targetRoas', value: number | undefined) => {
      onChange({ ...params, [field]: value })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      {/* Strategy select */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Estratégia de lance</label>
        <select
          className={styles.nativeSelect}
          value={params.strategy}
          onChange={handleStrategyChange}
        >
          <option value="" disabled>
            Selecione uma estratégia...
          </option>
          {strategyOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Target CPA (for TARGET_CPA / COST_CAP) */}
      {needsCpa && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>CPA desejado</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.targetCpa ?? ''}
              onChange={(e) =>
                handleTargetChange(
                  'targetCpa',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="0,00"
              min={0}
              step={0.01}
            />
          </div>
          <span className={styles.fieldHint}>
            Custo por aquisição desejado para a estratégia
          </span>
        </div>
      )}

      {/* Target ROAS (for TARGET_ROAS / MIN_ROAS) */}
      {needsRoas && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>ROAS desejado</label>
          <div className={styles.inputWrapper}>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithSuffix}`}
              value={params.targetRoas ?? ''}
              onChange={(e) =>
                handleTargetChange(
                  'targetRoas',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="4.0"
              min={0}
              step={0.1}
            />
            <span className={styles.inputSuffix}>x</span>
          </div>
          <span className={styles.fieldHint}>
            Retorno sobre investimento desejado (ex: 4.0 = 400%)
          </span>
        </div>
      )}

      {/* Bid Cap amount (for LOWEST_COST_WITH_BID_CAP) */}
      {needsBid && (
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Bid Cap</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>R$</span>
            <input
              type="number"
              className={`${styles.nativeInput} ${styles.inputWithPrefix}`}
              value={params.targetCpa ?? ''}
              onChange={(e) =>
                handleTargetChange(
                  'targetCpa',
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="0,00"
              min={0}
              step={0.01}
            />
          </div>
          <span className={styles.fieldHint}>
            Valor máximo de lance permitido
          </span>
        </div>
      )}
    </div>
  )
}
