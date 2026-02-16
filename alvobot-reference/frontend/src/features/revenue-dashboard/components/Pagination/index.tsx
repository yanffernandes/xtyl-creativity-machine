import { memo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import styles from './Pagination.module.css'
import type { PaginationMeta } from '../../types'

interface PaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  /** Show limit selector */
  showLimitSelector?: boolean
  /** Available limit options */
  limitOptions?: number[]
}

/**
 * Pagination component for server-side pagination.
 * Displays current page info and navigation controls.
 */
export const Pagination = memo(function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  showLimitSelector = true,
  limitOptions = [25, 50, 100, 200],
}: PaginationProps) {
  const { page, limit, totalItems, totalPages, hasNextPage, hasPrevPage } = pagination

  // Calculate displayed range
  const startItem = (page - 1) * limit + 1
  const endItem = Math.min(page * limit, totalItems)

  const handleFirstPage = useCallback(() => {
    onPageChange(1)
  }, [onPageChange])

  const handlePrevPage = useCallback(() => {
    if (hasPrevPage) {
      onPageChange(page - 1)
    }
  }, [hasPrevPage, page, onPageChange])

  const handleNextPage = useCallback(() => {
    if (hasNextPage) {
      onPageChange(page + 1)
    }
  }, [hasNextPage, page, onPageChange])

  const handleLastPage = useCallback(() => {
    onPageChange(totalPages)
  }, [totalPages, onPageChange])

  const handleLimitChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLimit = parseInt(e.target.value, 10)
      onLimitChange?.(newLimit)
      // Reset to first page when changing limit
      onPageChange(1)
    },
    [onLimitChange, onPageChange]
  )

  // Don't render if no pagination needed
  if (totalItems === 0 || totalPages <= 1) {
    return (
      <div className={styles.container}>
        <div className={styles.info}>
          <span>
            Mostrando <strong>{totalItems}</strong> {totalItems === 1 ? 'item' : 'itens'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span>
          Mostrando <strong>{startItem}</strong> - <strong>{endItem}</strong> de{' '}
          <strong>{totalItems.toLocaleString('pt-BR')}</strong> itens
        </span>
      </div>

      <div className={styles.controls}>
        {showLimitSelector && onLimitChange && (
          <div className={styles.limitSelector}>
            <label htmlFor="pagination-limit">Itens por página:</label>
            <select
              id="pagination-limit"
              className={styles.limitSelect}
              value={limit}
              onChange={handleLimitChange}
            >
              {limitOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.pageInfo}>
          Página <strong>{page}</strong> de <strong>{totalPages}</strong>
        </div>

        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.navButton}
            onClick={handleFirstPage}
            disabled={!hasPrevPage}
            title="Primeira página"
            aria-label="Ir para primeira página"
          >
            <ChevronsLeft />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={handlePrevPage}
            disabled={!hasPrevPage}
            title="Página anterior"
            aria-label="Ir para página anterior"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={handleNextPage}
            disabled={!hasNextPage}
            title="Próxima página"
            aria-label="Ir para próxima página"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={handleLastPage}
            disabled={!hasNextPage}
            title="Última página"
            aria-label="Ir para última página"
          >
            <ChevronsRight />
          </button>
        </div>
      </div>
    </div>
  )
})
