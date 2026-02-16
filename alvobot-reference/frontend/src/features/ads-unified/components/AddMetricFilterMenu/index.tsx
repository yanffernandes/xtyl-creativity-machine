import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'
import styles from './AddMetricFilterMenu.module.css'
import {
  OPERATOR_CONFIGS,
  getGroupedMetrics,
  getMetricConfig,
  generateFilterId,
  isValidFilter,
} from '../../utils/metricFilters'
import type { FilterableMetric, FilterOperator, MetricFilter } from '../../types/filters'

interface AddMetricFilterMenuProps {
  /** Callback quando um filtro é adicionado */
  onAddFilter: (filter: MetricFilter) => void
  /** Filtro existente para edição (opcional) */
  editingFilter?: MetricFilter
  /** Callback ao cancelar edição */
  onCancelEdit?: () => void
}

type MenuStep = 'select-metric' | 'configure-filter'

/**
 * Menu dropdown para adicionar filtros de métricas.
 * Exibe métricas agrupadas e permite configurar operador e valores.
 */
export function AddMetricFilterMenu({ onAddFilter, editingFilter, onCancelEdit }: AddMetricFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(!!editingFilter)
  const [step, setStep] = useState<MenuStep>(editingFilter ? 'configure-filter' : 'select-metric')
  const [selectedMetric, setSelectedMetric] = useState<FilterableMetric | null>(editingFilter?.metric ?? null)
  const [operator, setOperator] = useState<FilterOperator>(editingFilter?.operator ?? 'gt')
  const [value, setValue] = useState<string>(editingFilter?.value?.toString() ?? '')
  const [value2, setValue2] = useState<string>(editingFilter?.value2?.toString() ?? '')

  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const groupedMetrics = getGroupedMetrics()

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setStep('select-metric')
    setSelectedMetric(null)
    setOperator('gt')
    setValue('')
    setValue2('')
    onCancelEdit?.()
  }, [onCancelEdit])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, handleClose])

  // Handle editing filter changes
  useEffect(() => {
    if (editingFilter) {
      setIsOpen(true)
      setStep('configure-filter')
      setSelectedMetric(editingFilter.metric)
      setOperator(editingFilter.operator)
      setValue(editingFilter.value.toString())
      setValue2(editingFilter.value2?.toString() ?? '')
    }
  }, [editingFilter])

  const handleToggle = () => {
    if (isOpen) {
      handleClose()
    } else {
      setIsOpen(true)
    }
  }

  const handleSelectMetric = (metric: FilterableMetric) => {
    setSelectedMetric(metric)
    setStep('configure-filter')
  }

  const handleBack = () => {
    if (editingFilter) {
      handleClose()
    } else {
      setStep('select-metric')
      setSelectedMetric(null)
    }
  }

  const handleApply = () => {
    if (!selectedMetric) return

    const numValue = parseFloat(value.replace(',', '.'))
    const numValue2 = operator === 'between' ? parseFloat(value2.replace(',', '.')) : undefined

    const filter: MetricFilter = {
      id: editingFilter?.id ?? generateFilterId(),
      metric: selectedMetric,
      operator,
      value: numValue,
      value2: numValue2,
    }

    if (isValidFilter(filter)) {
      onAddFilter(filter)
      handleClose()
    }
  }

  const selectedConfig = selectedMetric ? getMetricConfig(selectedMetric) : null

  const isFormValid = () => {
    const numValue = parseFloat(value.replace(',', '.'))
    if (isNaN(numValue)) return false
    if (operator === 'between') {
      const numValue2 = parseFloat(value2.replace(',', '.'))
      if (isNaN(numValue2) || numValue >= numValue2) return false
    }
    return true
  }

  return (
    <div className={styles.container} ref={menuRef}>
      {!editingFilter && (
        <button
          ref={buttonRef}
          type="button"
          className={styles.addButton}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Plus size={16} />
          <span>Filtro</span>
        </button>
      )}

      {isOpen && (
        <div className={styles.dropdown} role="dialog" aria-label="Adicionar filtro">
          {step === 'select-metric' && (
            <div className={styles.metricList}>
              {groupedMetrics.map(group => (
                <div key={group.group} className={styles.group}>
                  <div className={styles.groupLabel}>{group.label}</div>
                  {group.metrics.map(metric => (
                    <button
                      key={metric.key}
                      type="button"
                      className={styles.metricOption}
                      onClick={() => handleSelectMetric(metric.key)}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}

          {step === 'configure-filter' && selectedConfig && (
            <div className={styles.configPanel}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
              >
                <ChevronLeft size={16} />
                <span>{selectedConfig.label}</span>
              </button>

              <div className={styles.configForm}>
                <div className={styles.field}>
                  <label htmlFor="operator-select" className={styles.fieldLabel}>
                    Operador
                  </label>
                  <select
                    id="operator-select"
                    className={styles.select}
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as FilterOperator)}
                  >
                    {OPERATOR_CONFIGS.map(op => (
                      <option key={op.key} value={op.key}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor="value-input" className={styles.fieldLabel}>
                    {operator === 'between' ? 'Valor mínimo' : 'Valor'}
                  </label>
                  <div className={styles.inputWrapper}>
                    {selectedConfig.symbol && selectedConfig.symbolPosition === 'before' && (
                      <span className={styles.symbol}>{selectedConfig.symbol}</span>
                    )}
                    <input
                      id="value-input"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0"
                      autoFocus
                    />
                    {selectedConfig.symbol && selectedConfig.symbolPosition === 'after' && (
                      <span className={styles.symbol}>{selectedConfig.symbol}</span>
                    )}
                  </div>
                </div>

                {operator === 'between' && (
                  <div className={styles.field}>
                    <label htmlFor="value2-input" className={styles.fieldLabel}>
                      Valor máximo
                    </label>
                    <div className={styles.inputWrapper}>
                      {selectedConfig.symbol && selectedConfig.symbolPosition === 'before' && (
                        <span className={styles.symbol}>{selectedConfig.symbol}</span>
                      )}
                      <input
                        id="value2-input"
                        type="text"
                        inputMode="decimal"
                        className={styles.input}
                        value={value2}
                        onChange={(e) => setValue2(e.target.value)}
                        placeholder="0"
                      />
                      {selectedConfig.symbol && selectedConfig.symbolPosition === 'after' && (
                        <span className={styles.symbol}>{selectedConfig.symbol}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={handleClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={styles.applyButton}
                    onClick={handleApply}
                    disabled={!isFormValid()}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
