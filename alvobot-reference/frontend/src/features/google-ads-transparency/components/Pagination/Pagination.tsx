import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Select } from '@/shared/components'
import styles from './Pagination.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (limit: number) => void
  isLoading?: boolean
}

const itemsPerPageOptions = [
  { value: '20', label: '20 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Generate page numbers to display
  const getPageNumbers = (): Array<number | string> => {
    const pages: Array<number | string> = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalItems === 0) return null

  return (
    <div className={styles.pagination}>
      <div className={styles.info}>
        <span>
          Mostrando {startItem}-{endItem} de {totalItems.toLocaleString('pt-BR')}
        </span>
      </div>

      <div className={styles.controls}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className={styles.navButton}
        >
          <ChevronLeft size={16} />
        </Button>

        <div className={styles.pageNumbers}>
          {getPageNumbers().map((page, index) =>
            page === '...' ? (
              <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page as number)}
                disabled={isLoading}
                className={styles.pageButton}
              >
                {page}
              </Button>
            )
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className={styles.navButton}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className={styles.perPage}>
        <Select
          value={itemsPerPage.toString()}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          disabled={isLoading}
          options={itemsPerPageOptions}
          className={styles.perPageSelect}
        />
      </div>
    </div>
  )
}
