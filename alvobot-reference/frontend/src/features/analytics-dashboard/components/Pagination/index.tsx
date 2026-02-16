import { memo, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import styles from './Pagination.module.css'
import type { PaginationMeta } from '../../types'

interface PaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  onLimitChange?: (limit: number) => void
  showLimitSelector?: boolean
}

const PAGE_LIMITS = [25, 50, 100, 200]

export const Pagination = memo(function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  showLimitSelector = false,
}: PaginationProps) {
  const { page, limit, totalItems, totalPages, hasNextPage, hasPrevPage } = pagination

  // Calculate visible page numbers
  const visiblePages = useMemo(() => {
    const pages: number[] = []
    const maxVisible = 5
    const halfVisible = Math.floor(maxVisible / 2)

    let start = Math.max(1, page - halfVisible)
    const end = Math.min(totalPages, start + maxVisible - 1)

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }, [page, totalPages])

  // Calculate range text
  const rangeText = useMemo(() => {
    const start = (page - 1) * limit + 1
    const end = Math.min(page * limit, totalItems)
    return `${start}-${end} de ${totalItems}`
  }, [page, limit, totalItems])

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span className={styles.rangeText}>{rangeText}</span>
        {showLimitSelector && onLimitChange && (
          <div className={styles.limitSelector}>
            <span className={styles.limitLabel}>Por página:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className={styles.limitSelect}
            >
              {PAGE_LIMITS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        {/* First page */}
        <button
          className={styles.pageButton}
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          title="Primeira página"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page */}
        <button
          className={styles.pageButton}
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        <div className={styles.pageNumbers}>
          {visiblePages[0] > 1 && (
            <>
              <button
                className={`${styles.pageNumber} ${page === 1 ? styles.active : ''}`}
                onClick={() => onPageChange(1)}
              >
                1
              </button>
              {visiblePages[0] > 2 && <span className={styles.ellipsis}>...</span>}
            </>
          )}

          {visiblePages.map((p) => (
            <button
              key={p}
              className={`${styles.pageNumber} ${page === p ? styles.active : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className={styles.ellipsis}>...</span>
              )}
              <button
                className={`${styles.pageNumber} ${page === totalPages ? styles.active : ''}`}
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next page */}
        <button
          className={styles.pageButton}
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          title="Próxima página"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          className={styles.pageButton}
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          title="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
})
