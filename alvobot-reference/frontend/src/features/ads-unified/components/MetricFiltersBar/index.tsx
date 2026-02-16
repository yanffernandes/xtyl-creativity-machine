import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { AddMetricFilterMenu } from '../AddMetricFilterMenu'
import { MetricFilterChip } from '../MetricFilterChip'
import styles from './MetricFiltersBar.module.css'
import type { MetricFilter } from '../../types/filters'

interface MetricFiltersBarProps {
  /** Lista de filtros ativos */
  filters: MetricFilter[]
  /** Callback quando os filtros mudam */
  onChange: (filters: MetricFilter[]) => void
}

/**
 * Barra que exibe os filtros de métricas ativos como chips.
 * Inclui botão para adicionar novos filtros e limpar todos.
 */
export function MetricFiltersBar({ filters, onChange }: MetricFiltersBarProps) {
  const [editingFilter, setEditingFilter] = useState<MetricFilter | undefined>(undefined)

  const handleAddFilter = useCallback((filter: MetricFilter) => {
    // Se estamos editando, substituir o filtro existente
    if (editingFilter) {
      const newFilters = filters.map(f => f.id === filter.id ? filter : f)
      onChange(newFilters)
      setEditingFilter(undefined)
    } else {
      // Adicionar novo filtro
      onChange([...filters, filter])
    }
  }, [filters, onChange, editingFilter])

  const handleRemoveFilter = useCallback((filterId: string) => {
    onChange(filters.filter(f => f.id !== filterId))
  }, [filters, onChange])

  const handleClearAll = useCallback(() => {
    onChange([])
  }, [onChange])

  const handleEditFilter = useCallback((filter: MetricFilter) => {
    setEditingFilter(filter)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingFilter(undefined)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.addFilterWrapper}>
        <AddMetricFilterMenu
          onAddFilter={handleAddFilter}
          editingFilter={editingFilter}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {filters.length > 0 && (
        <div className={styles.chipsContainer}>
          {filters.map(filter => (
            <MetricFilterChip
              key={filter.id}
              filter={filter}
              onClick={() => handleEditFilter(filter)}
              onRemove={() => handleRemoveFilter(filter.id)}
            />
          ))}

          {filters.length >= 2 && (
            <button
              type="button"
              className={styles.clearAllButton}
              onClick={handleClearAll}
              aria-label="Limpar todos os filtros"
            >
              <X size={14} />
              <span>Limpar todos</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
