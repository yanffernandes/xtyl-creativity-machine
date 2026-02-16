/**
 * ConditionBuilder Component
 *
 * Root component for building automation conditions.
 * Renders a recursive tree of condition groups and conditions.
 *
 * Supports 5 condition types:
 * - Simple: metric > value
 * - Metric Comparison: metric (period A) > metric (period B) × multiplier
 * - Ranking: top/bottom N% by metric
 * - Time: time-of-day conditions
 * - Lifecycle: entity age conditions
 *
 * Visual pattern:
 * ┌─ [E] Todas as condições devem ser verdadeiras ──────────┐
 * │  [Métrica] Impressões | Últimos 7 dias | > | 1000   [×] │
 * │                           E                              │
 * │  [Comparação] CPA | 3d | > | CPA | 7d | ×1.5       [×] │
 * │                           E                              │
 * │  ┌─ [OU] Pelo menos uma ────────────────────────────┐   │
 * │  │  [Ranking] Bottom 20% por ROAS | 7d          [×] │   │
 * │  │                    OU                             │   │
 * │  │  [Horário] Entre 08:00 e 22:00               [×] │   │
 * │  │  + Adicionar condição  + Adicionar grupo          │   │
 * │  └──────────────────────────────────────────────────┘   │
 * │  + Adicionar condição  + Adicionar grupo                 │
 * └──────────────────────────────────────────────────────────┘
 */

import { useCallback, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/shared/components'
import type { ConditionGroup, Platform } from '../../types/automation'
import { useConditionBuilder, createDefaultCondition } from '../../hooks/useConditionBuilder'
import { ConditionGroupComponent } from './ConditionGroupComponent'
import styles from './ConditionBuilder.module.css'

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionBuilderProps {
  /** Target advertising platform (determines available metrics) */
  platform: Platform
  /** Current root condition group (controlled) */
  root: ConditionGroup
  /** Callback when conditions change (controlled) */
  onChange: (root: ConditionGroup) => void
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ConditionBuilder({
  platform,
  root,
  onChange,
}: ConditionBuilderProps) {
  const {
    root: internalRoot,
    setRoot,
    addCondition,
    addGroup,
    removeCondition,
    updateCondition,
    toggleOperator,
  } = useConditionBuilder({
    platform,
    initialConditions: root,
  })

  // Sync internal state → external onChange
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    onChange(internalRoot)
  }, [internalRoot, onChange])

  // Sync external root → internal state (if parent changes it)
  const prevExternalRoot = useRef(root)
  useEffect(() => {
    if (root !== prevExternalRoot.current) {
      prevExternalRoot.current = root
      setRoot(root)
    }
  }, [root, setRoot])

  // Handle adding first condition when empty
  const handleAddFirstCondition = useCallback(() => {
    const defaultCondition = createDefaultCondition('simple', platform)
    setRoot({ operator: 'AND', conditions: [defaultCondition] })
  }, [platform, setRoot])

  // ── Render ──

  if (internalRoot.conditions.length === 0) {
    return (
      <div className={styles.conditionBuilder}>
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>
            Nenhuma condição configurada. Adicione condições para definir quando a regra deve ser executada.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddFirstCondition}
            leftIcon={<Plus size={14} />}
          >
            Adicionar condição
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.conditionBuilder}>
      <ConditionGroupComponent
        group={internalRoot}
        path={[]}
        platform={platform}
        depth={0}
        onAddCondition={addCondition}
        onAddGroup={addGroup}
        onRemoveCondition={removeCondition}
        onUpdateCondition={updateCondition}
        onToggleOperator={toggleOperator}
        canRemove={false}
      />
    </div>
  )
}

export default ConditionBuilder
