import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Search, ChevronDown, X, Check } from 'lucide-react'
import { Spinner } from '../Spinner'
import styles from './MultiSelect.module.css'

export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
  meta?: Record<string, unknown>
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  isLoading?: boolean
  emptyMessage?: string
  noResultsMessage?: string
  maxDisplayedOptions?: number
  maxSelectedVisible?: number
  className?: string
  fullWidth?: boolean
  showSelectAll?: boolean
  selectAllLabel?: string
  deselectAllLabel?: string
  renderOption?: (option: MultiSelectOption, isSelected: boolean) => ReactNode
  renderSelectedTag?: (option: MultiSelectOption, onRemove: () => void) => ReactNode
  /** Size variant: 'sm' (32px), 'md' (36px), 'lg' (44px, default) */
  size?: 'sm' | 'md' | 'lg'
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Selecione opções',
  searchPlaceholder = 'Buscar...',
  label,
  error,
  hint,
  disabled = false,
  isLoading = false,
  emptyMessage = 'Nenhuma opção disponível',
  noResultsMessage = 'Nenhum resultado encontrado',
  maxDisplayedOptions = 50,
  maxSelectedVisible = 3,
  className,
  fullWidth = false,
  showSelectAll = false,
  selectAllLabel = 'Selecionar todos',
  deselectAllLabel = 'Desmarcar todos',
  renderOption,
  renderSelectedTag,
  size = 'lg',
}: MultiSelectProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOptions = useMemo(() => {
    return options.filter((opt) => value.includes(opt.value))
  }, [options, value])

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const searchLower = search.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(searchLower))
  }, [options, search])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleToggleOption = (option: MultiSelectOption) => {
    if (option.disabled) return

    const isSelected = value.includes(option.value)
    if (isSelected) {
      onChange(value.filter((v) => v !== option.value))
    } else {
      onChange([...value, option.value])
    }
  }

  const handleRemoveOption = (optionValue: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
    setSearch('')
  }

  const handleSelectAll = () => {
    // Select all non-disabled options
    const allValues = options
      .filter((opt) => !opt.disabled)
      .map((opt) => opt.value)
    onChange(allValues)
  }

  const handleDeselectAll = () => {
    onChange([])
  }

  // Check if all options are selected
  const allSelected = useMemo(() => {
    const selectableOptions = options.filter((opt) => !opt.disabled)
    return selectableOptions.length > 0 && selectableOptions.every((opt) => value.includes(opt.value))
  }, [options, value])

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(true)
    }
  }

  const selectId = label?.toLowerCase().replace(/\s+/g, '-')
  const optionsId = selectId ? `${selectId}-options` : undefined

  const visibleTags = selectedOptions.slice(0, maxSelectedVisible)
  const hiddenCount = selectedOptions.length - maxSelectedVisible

  return (
    <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.container} ref={dropdownRef}>
        <div
          className={clsx(
            styles.trigger,
            size === 'sm' && styles.triggerSm,
            size === 'md' && styles.triggerMd,
            isOpen && styles.triggerOpen,
            error && styles.hasError,
            disabled && styles.disabled
          )}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={optionsId}
        >
          <div className={styles.triggerContent}>
            {selectedOptions.length > 0 ? (
              <div className={styles.selectedTags}>
                {visibleTags.map((option) =>
                  renderSelectedTag ? (
                    renderSelectedTag(option, () => handleRemoveOption(option.value))
                  ) : (
                    <span key={option.value} className={styles.tag}>
                      <span className={styles.tagLabel}>{option.label}</span>
                      {!disabled && (
                        <button
                          type="button"
                          className={styles.tagRemove}
                          onClick={(e) => handleRemoveOption(option.value, e)}
                          aria-label={`Remover ${option.label}`}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  )
                )}
                {hiddenCount > 0 && (
                  <span className={styles.moreTag}>+{hiddenCount}</span>
                )}
              </div>
            ) : (
              <span className={styles.placeholder}>{placeholder}</span>
            )}
          </div>

          <div className={styles.triggerActions}>
            {selectedOptions.length > 0 && !disabled && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearAll}
                title="Limpar seleção"
              >
                <X size={16} />
              </button>
            )}
            <ChevronDown
              size={18}
              className={clsx(styles.chevronIcon, isOpen && styles.chevronRotated)}
            />
          </div>
        </div>

        {isOpen && !disabled && (
          <div className={styles.dropdown}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                id={selectId}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
                aria-invalid={!!error}
              />
            </div>

            {showSelectAll && options.length > 0 && (
              <div className={styles.selectAllWrapper}>
                <button
                  type="button"
                  className={styles.selectAllBtn}
                  onClick={allSelected ? handleDeselectAll : handleSelectAll}
                >
                  <span className={clsx(styles.checkbox, allSelected && styles.checkboxSelected)}>
                    {allSelected && <Check size={12} />}
                  </span>
                  <span>{allSelected ? deselectAllLabel : selectAllLabel}</span>
                </button>
              </div>
            )}

            <div className={styles.optionsContainer}>
              {isLoading ? (
                <div className={styles.dropdownLoading}>
                  <Spinner size="sm" />
                  <span>Carregando...</span>
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className={styles.dropdownEmpty}>
                  {search ? noResultsMessage : emptyMessage}
                </div>
              ) : (
                <ul className={styles.optionsList} id={optionsId}>
                  {filteredOptions.slice(0, maxDisplayedOptions).map((option) => {
                    const isSelected = value.includes(option.value)
                    return (
                      <li
                        key={option.value}
                        className={clsx(
                          styles.option,
                          isSelected && styles.optionSelected,
                          option.disabled && styles.optionDisabled
                        )}
                      >
                        <button
                          type="button"
                          className={styles.optionButton}
                          onClick={() => handleToggleOption(option)}
                          disabled={option.disabled}
                          aria-pressed={isSelected}
                        >
                          <span className={clsx(styles.checkbox, isSelected && styles.checkboxSelected)}>
                            {isSelected && <Check size={12} />}
                          </span>
                          {renderOption ? (
                            renderOption(option, isSelected)
                          ) : (
                            <span className={styles.optionLabel}>{option.label}</span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                  {filteredOptions.length > maxDisplayedOptions && (
                    <li className={styles.moreItems}>
                      +{filteredOptions.length - maxDisplayedOptions} itens. Refine sua busca.
                    </li>
                  )}
                </ul>
              )}
            </div>

            {selectedOptions.length > 0 && (
              <div className={styles.dropdownFooter}>
                <span className={styles.selectedCount}>
                  {selectedOptions.length} selecionado{selectedOptions.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <span id={`${selectId}-error`} className={styles.error} role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${selectId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  )
}

MultiSelect.displayName = 'MultiSelect'
