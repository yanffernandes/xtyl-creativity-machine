/**
 * ActionConfigurator Component
 *
 * Main component for configuring an automation action.
 * Renders a dynamic form based on the selected action type,
 * with type-safe parameter forms for each action.
 *
 * Visual pattern:
 * ┌──────────────────────────────────────────────┐
 * │  [Ação ▼]                  [Frequência ▼]    │
 * ├──────────────────────────────────────────────┤
 * │  Dynamic action-specific form                │
 * │  (budget, bid, name, status, etc.)           │
 * └──────────────────────────────────────────────┘
 */

import { useCallback, useMemo } from 'react'
import type {
  AutomationActionType,
  FrequencyCap,
  ActionParams,
  Platform,
  EntityLevel,
  BudgetChangeParams,
  SetBudgetParams,
  ScaleBudgetParams,
  BidChangeParams,
  SetBidParams,
  BidStrategyParams,
  DuplicateParams,
  NameActionParams,
  ExtendEndDateParams,
  NotifyParams,
} from '../../types/automation'
import {
  getActionsGroupedByCategory,
  ACTION_CATEGORY_LABELS,
  type ActionCategory,
} from '../../constants/actions'
import { FREQUENCY_CAP_OPTIONS } from '../../constants/enums'
import { StatusAction } from './actions/StatusAction'
import { BudgetAction } from './actions/BudgetAction'
import { SetBudgetAction } from './actions/SetBudgetAction'
import { ScaleBudgetAction } from './actions/ScaleBudgetAction'
import { BidAction } from './actions/BidAction'
import { BidStrategyAction } from './actions/BidStrategyAction'
import { NameAction } from './actions/NameAction'
import { DuplicateAction } from './actions/DuplicateAction'
import { NotifyAction } from './actions/NotifyAction'
import { ExtendEndDateAction } from './actions/ExtendEndDateAction'
import styles from './ActionConfigurator.module.css'

// ============================================================================
// TYPES
// ============================================================================

export interface ActionConfiguratorProps {
  /** Target advertising platform */
  platform: Platform
  /** Entity level this rule operates on */
  level: EntityLevel
  /** Currently selected action type */
  action: AutomationActionType
  /** Parameters for the selected action */
  params: ActionParams
  /** Frequency cap for this task */
  frequencyCap: FrequencyCap
  /** Callback when the action type changes */
  onActionChange: (action: AutomationActionType) => void
  /** Callback when action parameters change */
  onParamsChange: (params: ActionParams) => void
  /** Callback when frequency cap changes */
  onFrequencyCapChange: (cap: FrequencyCap) => void
}

// ============================================================================
// DEFAULT PARAMS PER ACTION TYPE
// ============================================================================

function getDefaultParams(action: AutomationActionType): ActionParams {
  switch (action) {
    case 'pause':
    case 'start':
      return {} as Record<string, never>

    case 'increase_budget':
    case 'decrease_budget':
      return { percentage: 20 } as BudgetChangeParams

    case 'set_budget':
      return { amount: 0 } as SetBudgetParams

    case 'scale_budget_by_target':
      return {
        targetMetric: 'cpa',
        targetValue: 0,
        maxIncreasePercent: 30,
        maxDecreasePercent: 20,
      } as ScaleBudgetParams

    case 'increase_bid':
    case 'decrease_bid':
      return { percentage: 10 } as BidChangeParams

    case 'set_bid':
      return { amount: 0 } as SetBidParams

    case 'set_bid_strategy':
      return { strategy: '' } as BidStrategyParams

    case 'duplicate':
      return { copies: 1, nameSuffix: ' - Cópia', status: 'paused' } as DuplicateParams

    case 'add_to_name':
      return { text: '', position: 'suffix' } as NameActionParams

    case 'remove_from_name':
      return { text: '' } as NameActionParams

    case 'replace_in_name':
      return { text: '', replaceWith: '' } as NameActionParams

    case 'extend_end_date':
      return { days: 7 } as ExtendEndDateParams

    case 'notify':
      return { emails: [], message: '' } as NotifyParams
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ActionConfigurator({
  platform,
  level,
  action,
  params,
  frequencyCap,
  onActionChange,
  onParamsChange,
  onFrequencyCapChange,
}: ActionConfiguratorProps) {
  // Get actions grouped by category for the current platform+level
  const groupedActions = useMemo(
    () => getActionsGroupedByCategory(platform, level),
    [platform, level],
  )

  // Handle action type change — reset params to defaults
  const handleActionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newAction = e.target.value as AutomationActionType
      onActionChange(newAction)
      onParamsChange(getDefaultParams(newAction))
    },
    [onActionChange, onParamsChange],
  )

  const handleFrequencyCapChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onFrequencyCapChange(e.target.value as FrequencyCap)
    },
    [onFrequencyCapChange],
  )

  return (
    <div className={styles.configurator}>
      {/* ── Header: Action select + Frequency Cap ── */}
      <div className={styles.header}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Ação</label>
          <select
            className={styles.nativeSelect}
            value={action}
            onChange={handleActionChange}
          >
            {Object.entries(groupedActions).map(([category, actions]) => (
              <optgroup
                key={category}
                label={ACTION_CATEGORY_LABELS[category as ActionCategory] ?? category}
              >
                {actions.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Frequência máxima</label>
          <select
            className={styles.nativeSelect}
            value={frequencyCap}
            onChange={handleFrequencyCapChange}
          >
            {FREQUENCY_CAP_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Body: Dynamic form based on action type ── */}
      <div className={styles.body}>
        {renderActionForm(action, params, onParamsChange, platform)}
      </div>
    </div>
  )
}

// ============================================================================
// RENDER ACTION FORM
// ============================================================================

function renderActionForm(
  action: AutomationActionType,
  params: ActionParams,
  onChange: (params: ActionParams) => void,
  platform: Platform,
): React.ReactNode {
  switch (action) {
    case 'pause':
    case 'start':
      return <StatusAction action={action} />

    case 'increase_budget':
    case 'decrease_budget':
      return (
        <BudgetAction
          action={action}
          params={params as BudgetChangeParams}
          onChange={onChange}
        />
      )

    case 'set_budget':
      return (
        <SetBudgetAction
          params={params as SetBudgetParams}
          onChange={onChange}
        />
      )

    case 'scale_budget_by_target':
      return (
        <ScaleBudgetAction
          params={params as ScaleBudgetParams}
          onChange={onChange}
          platform={platform}
        />
      )

    case 'increase_bid':
    case 'decrease_bid':
      return (
        <BidAction
          action={action}
          params={params as BidChangeParams}
          onChange={onChange}
        />
      )

    case 'set_bid':
      return (
        <BidAction
          action="set_bid"
          params={params as SetBidParams & BidChangeParams}
          onChange={onChange}
        />
      )

    case 'set_bid_strategy':
      return (
        <BidStrategyAction
          params={params as BidStrategyParams}
          onChange={onChange}
          platform={platform}
        />
      )

    case 'duplicate':
      return (
        <DuplicateAction
          params={params as DuplicateParams}
          onChange={onChange}
        />
      )

    case 'add_to_name':
    case 'remove_from_name':
    case 'replace_in_name':
      return (
        <NameAction
          action={action}
          params={params as NameActionParams}
          onChange={onChange}
        />
      )

    case 'extend_end_date':
      return (
        <ExtendEndDateAction
          params={params as ExtendEndDateParams}
          onChange={onChange}
        />
      )

    case 'notify':
      return (
        <NotifyAction
          params={params as NotifyParams}
          onChange={onChange}
        />
      )

    default:
      return null
  }
}
