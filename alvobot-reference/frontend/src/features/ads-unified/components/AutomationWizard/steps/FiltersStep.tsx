/**
 * FiltersStep — Step 2 of AutomationWizard
 *
 * Allows selecting between "All entities" and "Filter entities".
 * When filtering, embeds the FilterBuilder component.
 */

import { useState } from 'react'
import { List, Filter, AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'
import type { UseAutomationFormReturn } from '../../../hooks/useAutomationForm'
import type { FilterGroup } from '../../../types/automation'
import { FilterBuilder } from '../../FilterBuilder'
import styles from '../AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface FiltersStepProps {
  form: UseAutomationFormReturn
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FiltersStep({ form }: FiltersStepProps) {
  const { state, updateField } = form
  const [filterMode, setFilterMode] = useState<'all' | 'filtered'>(
    state.filters.length > 0 ? 'filtered' : 'all',
  )

  const handleModeChange = (mode: 'all' | 'filtered') => {
    setFilterMode(mode)
    if (mode === 'all') {
      updateField('filters', [])
    }
  }

  const handleGroupsChange = (groups: FilterGroup[]) => {
    updateField('filters', groups)
  }

  return (
    <div>
      {/* ── Filter mode toggle ── */}
      <div className={styles.filterToggle}>
        <button
          type="button"
          className={clsx(
            styles.filterToggleOption,
            filterMode === 'all' && styles.filterToggleActive,
          )}
          onClick={() => handleModeChange('all')}
        >
          <List size={16} />
          Todas as entidades
        </button>

        <button
          type="button"
          className={clsx(
            styles.filterToggleOption,
            filterMode === 'filtered' && styles.filterToggleActive,
          )}
          onClick={() => handleModeChange('filtered')}
        >
          <Filter size={16} />
          Filtrar entidades
        </button>
      </div>

      {/* ── All entities info ── */}
      {filterMode === 'all' && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <List size={40} />
          </div>
          <p className={styles.emptyStateText}>
            A regra será aplicada a todas as entidades do nível selecionado.
            Você pode adicionar filtros para restringir quais entidades serão avaliadas.
          </p>
        </div>
      )}

      {/* ── Filter Builder ── */}
      {filterMode === 'filtered' && (
        <div>
          <FilterBuilder
            platform={state.platform}
            level={state.level}
            groups={state.filters}
            onGroupsChange={handleGroupsChange}
          />

          {/* Warning for potentially large entity sets */}
          {state.filters.length === 0 && (
            <div className={styles.filterWarning}>
              <AlertTriangle size={14} />
              <span>
                Adicione pelo menos um filtro para restringir o escopo da regra.
                Sem filtros, todas as entidades serão avaliadas.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
