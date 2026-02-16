/**
 * FilterRow Component
 *
 * A single filter row: [Field ▼] [Operator ▼] [Value input] [Remove]
 *
 * - Field dropdown: dynamic based on platform + level (from constants/filters)
 * - Operator dropdown: dynamic based on field type
 * - Value input: polymorphic (text, number, select, multi-select) based on field
 */

import { useCallback, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './FilterBuilder.module.css'
import { FILTER_OPERATOR_OPTIONS } from '../../constants/enums'
import {
  getFilterFieldsGrouped,
  findFilterField,
  type FilterFieldDefinition,
} from '../../constants/filters'
import type { AutomationFilter, AutomationFilterOperator, Platform, EntityLevel } from '../../types/automation'

// ============================================================================
// TYPES
// ============================================================================

interface FilterRowProps {
  filter: AutomationFilter
  platform: Platform
  level: EntityLevel
  onUpdate: (updates: Partial<AutomationFilter>) => void
  onRemove: () => void
  canRemove: boolean
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FilterRow({
  filter,
  platform,
  level,
  onUpdate,
  onRemove,
  canRemove,
}: FilterRowProps) {
  // ── Derived data ──

  const groupedFields = useMemo(
    () => getFilterFieldsGrouped(platform, level),
    [platform, level],
  )

  const selectedField = useMemo(
    () => findFilterField(platform, level, filter.field),
    [platform, level, filter.field],
  )

  const availableOperators = useMemo(() => {
    if (!selectedField) return FILTER_OPERATOR_OPTIONS
    return FILTER_OPERATOR_OPTIONS.filter(
      (op) => selectedField.operators.includes(op.value),
    )
  }, [selectedField])

  // ── Handlers ──

  const handleFieldChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newField = e.target.value
      const newFieldDef = findFilterField(platform, level, newField)

      // Reset operator and value when field changes
      const defaultOperator = newFieldDef?.operators[0] ?? 'EQUAL'
      const defaultValue = newFieldDef?.type === 'number' ? 0 : ''

      onUpdate({
        field: newField,
        operator: defaultOperator as AutomationFilterOperator,
        value: defaultValue,
      })
    },
    [platform, level, onUpdate],
  )

  const handleOperatorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newOp = e.target.value as AutomationFilterOperator
      // Reset value when switching to/from multi-value operators
      const isMulti = newOp === 'IN' || newOp === 'NOT_IN'
      const wasMulti = filter.operator === 'IN' || filter.operator === 'NOT_IN'
      const isBetween = newOp === 'BETWEEN'

      let newValue: AutomationFilter['value'] = filter.value
      if (isMulti && !wasMulti) {
        newValue = typeof filter.value === 'string' && filter.value
          ? [filter.value]
          : []
      } else if (!isMulti && wasMulti) {
        newValue = Array.isArray(filter.value) ? (filter.value[0] ?? '') : ''
      } else if (isBetween) {
        newValue = ''
      }

      onUpdate({ operator: newOp, value: newValue })
    },
    [filter.operator, filter.value, onUpdate],
  )

  // ── Render ──

  return (
    <div className={styles.filterRow}>
      {/* Field select */}
      <div className={`${styles.filterFieldGroup} ${styles.fieldSelect}`}>
        <span className={styles.filterFieldLabel}>Campo</span>
        <select
          className={styles.nativeSelect}
          value={filter.field}
          onChange={handleFieldChange}
        >
          <option value="" disabled>
            Selecionar campo...
          </option>
          {Object.entries(groupedFields).map(([group, fields]) => (
            <optgroup key={group} label={group}>
              {fields.map((f) => (
                <option key={f.field} value={f.field}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Operator select */}
      <div className={`${styles.filterFieldGroup} ${styles.operatorSelect}`}>
        <span className={styles.filterFieldLabel}>Operador</span>
        <select
          className={styles.nativeSelect}
          value={filter.operator}
          onChange={handleOperatorChange}
          disabled={!filter.field}
        >
          {availableOperators.map((op) => (
            <option key={op.value} value={op.value}>
              {op.shortLabel} {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value input (polymorphic) */}
      <div className={`${styles.filterFieldGroup} ${styles.valueGroup}`}>
        <span className={styles.filterFieldLabel}>Valor</span>
        <ValueInput
          filter={filter}
          fieldDef={selectedField}
          onUpdate={onUpdate}
        />
      </div>

      {/* Remove button */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className={styles.removeFilterButton}
          aria-label="Remover filtro"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// VALUE INPUT (polymorphic)
// ============================================================================

interface ValueInputProps {
  filter: AutomationFilter
  fieldDef: FilterFieldDefinition | undefined
  onUpdate: (updates: Partial<AutomationFilter>) => void
}

function ValueInput({ filter, fieldDef, onUpdate }: ValueInputProps) {
  const isMultiValue = filter.operator === 'IN' || filter.operator === 'NOT_IN'
  const isBetween = filter.operator === 'BETWEEN'

  // ── Enum field with single select ──
  if (fieldDef?.type === 'enum' && !isMultiValue) {
    return (
      <select
        className={styles.nativeSelect}
        value={String(filter.value)}
        onChange={(e) => onUpdate({ value: e.target.value })}
        disabled={!filter.field}
      >
        <option value="" disabled>
          Selecionar...
        </option>
        {fieldDef.enumOptions?.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  // ── Enum field with multi select (IN/NOT_IN) ──
  if (fieldDef?.type === 'enum' && isMultiValue) {
    const selectedValues = Array.isArray(filter.value)
      ? (filter.value as string[])
      : []

    return (
      <div>
        <div className={styles.multiSelectContainer}>
          {selectedValues.map((val) => {
            const label =
              fieldDef.enumOptions?.find((o) => o.value === val)?.label ?? val
            return (
              <span key={val} className={styles.multiSelectTag}>
                {label}
                <button
                  type="button"
                  className={styles.multiSelectTagRemove}
                  onClick={() =>
                    onUpdate({
                      value: selectedValues.filter((v) => v !== val),
                    })
                  }
                  aria-label={`Remover ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
        <select
          className={styles.nativeSelect}
          value=""
          onChange={(e) => {
            const val = e.target.value
            if (val && !selectedValues.includes(val)) {
              onUpdate({ value: [...selectedValues, val] })
            }
          }}
          style={{ marginTop: 'var(--space-1)' }}
        >
          <option value="">Adicionar valor...</option>
          {fieldDef.enumOptions
            ?.filter((o) => !selectedValues.includes(o.value))
            .map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
      </div>
    )
  }

  // ── Number field with BETWEEN ──
  if (fieldDef?.type === 'number' && isBetween) {
    // Store as "min|max" string for simplicity
    const parts = String(filter.value).split('|')
    const minVal = parts[0] ?? ''
    const maxVal = parts[1] ?? ''

    return (
      <div className={styles.valueInputWrapper}>
        <input
          type="number"
          className={`${styles.nativeInput} ${styles.nativeInputSmall}`}
          value={minVal}
          onChange={(e) => onUpdate({ value: `${e.target.value}|${maxVal}` })}
          placeholder="Min"
        />
        <span className={styles.betweenSeparator}>e</span>
        <input
          type="number"
          className={`${styles.nativeInput} ${styles.nativeInputSmall}`}
          value={maxVal}
          onChange={(e) => onUpdate({ value: `${minVal}|${e.target.value}` })}
          placeholder="Max"
        />
      </div>
    )
  }

  // ── Number field ──
  if (fieldDef?.type === 'number') {
    return (
      <input
        type="number"
        className={styles.nativeInput}
        value={filter.value as number}
        onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        disabled={!filter.field}
      />
    )
  }

  // ── String field (default) ──
  return (
    <input
      type="text"
      className={styles.nativeInput}
      value={String(filter.value)}
      onChange={(e) => onUpdate({ value: e.target.value })}
      placeholder={filter.operator === 'REGEX' ? '^pattern$' : 'Valor...'}
      disabled={!filter.field}
    />
  )
}

export default FilterRow
