import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { Search, ChevronDown, X } from 'lucide-react'
import { Spinner } from '../Spinner'
import styles from './SearchableSelect.module.css'

export interface SearchableSelectOption {
  value: string
  label: string
  disabled?: boolean
  // Optional metadata for custom rendering
  meta?: Record<string, unknown>
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onChange: (value: string) => void
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
  className?: string
  fullWidth?: boolean
  /** Size variant: 'sm' (32px), 'md' (36px), 'lg' (44px, default) */
  size?: 'sm' | 'md' | 'lg'
  // Optional custom render functions
  renderOption?: (option: SearchableSelectOption) => ReactNode
  renderSelected?: (option: SearchableSelectOption) => ReactNode
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção',
  searchPlaceholder = 'Buscar...',
  label,
  error,
  hint,
  disabled = false,
  isLoading = false,
  emptyMessage = 'Nenhuma opção disponível',
  noResultsMessage = 'Nenhum resultado encontrado',
  maxDisplayedOptions = 50,
  className,
  fullWidth = false,
  size = 'lg',
  renderOption,
  renderSelected,
}: SearchableSelectProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value)
  }, [options, value])

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const searchLower = search.toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(searchLower))
  }, [options, search])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (option: SearchableSelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    setSearch('')
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const handleTriggerClick = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const selectId = label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={clsx(styles.wrapper, fullWidth && styles.fullWidth, className)}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={styles.container} ref={dropdownRef}>
        {/* Selected Value Display or Search Input */}
        {selectedOption && !isOpen ? (
          <div
            className={clsx(
              styles.selectedDisplay,
              size === 'sm' && styles.selectedDisplaySm,
              size === 'md' && styles.selectedDisplayMd,
              error && styles.hasError,
              disabled && styles.disabled
            )}
          >
            <button
              type="button"
              className={styles.selectedTrigger}
              onClick={handleTriggerClick}
              disabled={disabled}
            >
              <div className={styles.selectedContent}>
                {renderSelected ? renderSelected(selectedOption) : (
                  <span className={styles.selectedText}>{selectedOption.label}</span>
                )}
              </div>
            </button>
            {!disabled && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
                title="Limpar seleção"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <div
            className={clsx(
              styles.trigger,
              size === 'sm' && styles.triggerSm,
              size === 'md' && styles.triggerMd,
              isOpen && styles.triggerOpen,
              error && styles.hasError,
              disabled && styles.disabled
            )}
          >
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={searchInputRef}
              id={selectId}
              type="text"
              placeholder={selectedOption ? selectedOption.label : isOpen ? searchPlaceholder : placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
              onFocus={() => !disabled && setIsOpen(true)}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            />
            <button
              type="button"
              className={styles.chevronButton}
              onClick={handleTriggerClick}
              disabled={disabled}
              aria-label="Abrir opções"
            >
              <ChevronDown
                size={18}
                className={clsx(styles.chevronIcon, isOpen && styles.chevronRotated)}
              />
            </button>
          </div>
        )}

        {/* Dropdown List */}
        {isOpen && !disabled && (
          <div className={styles.dropdown}>
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
              <ul className={styles.optionsList}>
                {filteredOptions.slice(0, maxDisplayedOptions).map((option) => (
                  <li
                    key={option.value}
                    className={clsx(
                      styles.option,
                      option.value === value && styles.optionSelected,
                      option.disabled && styles.optionDisabled
                    )}
                  >
                    <button
                      type="button"
                      className={styles.optionButton}
                      onClick={() => handleSelect(option)}
                      disabled={option.disabled}
                    >
                      {renderOption ? renderOption(option) : (
                        <span className={styles.optionLabel}>{option.label}</span>
                      )}
                    </button>
                  </li>
                ))}
                {filteredOptions.length > maxDisplayedOptions && (
                  <li className={styles.moreItems}>
                    +{filteredOptions.length - maxDisplayedOptions} itens. Refine sua busca.
                  </li>
                )}
              </ul>
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

SearchableSelect.displayName = 'SearchableSelect'
