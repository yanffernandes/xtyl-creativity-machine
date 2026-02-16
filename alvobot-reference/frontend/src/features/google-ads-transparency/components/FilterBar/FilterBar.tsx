import { Search, Shuffle, X } from 'lucide-react'
import { Input, Select, Button } from '@/shared/components'
import styles from './FilterBar.module.css'
import type { GoogleAdsFilters, SelectOption } from '../../types'

interface FilterBarProps {
  filters: GoogleAdsFilters
  onFiltersChange: (filters: Partial<GoogleAdsFilters>) => void
  onClearFilters: () => void
  formatOptions: SelectOption[]
  isLoading?: boolean
}

export function FilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
  formatOptions,
  isLoading,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.search ||
    filters.format ||
    filters.isRandomOrder

  return (
    <div className={styles.filterBar}>
      <div className={styles.searchContainer}>
        <Input
          placeholder="Buscar anúncios..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          leftIcon={<Search size={18} />}
          className={styles.searchInput}
          size="md"
          disabled={isLoading}
        />
      </div>

      <div className={styles.filters}>
        <Select
          value={filters.format || ''}
          onChange={(e) => onFiltersChange({ format: e.target.value || null })}
          className={styles.select}
          disabled={isLoading}
          options={[
            { value: '', label: 'Todos os formatos' },
            ...formatOptions,
          ]}
        />

        <Button
          variant={filters.isRandomOrder ? 'primary' : 'outline'}
          onClick={() => onFiltersChange({ isRandomOrder: !filters.isRandomOrder })}
          className={styles.randomButton}
          title={filters.isRandomOrder ? 'Ordem aleatória ativa' : 'Ativar ordem aleatória'}
          disabled={isLoading}
        >
          <Shuffle size={16} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className={styles.clearButton}
            disabled={isLoading}
          >
            <X size={16} />
            <span>Limpar</span>
          </Button>
        )}
      </div>
    </div>
  )
}
