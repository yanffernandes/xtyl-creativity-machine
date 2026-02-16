import { useState } from 'react'
import { Eye, Megaphone } from 'lucide-react'
import { Button, Spinner, Alert, EmptyState } from '@/shared/components'
import { useGoogleAds, useFormatOptions } from '../api/queries'
import {
  MasonryGrid,
  AdCard,
  FilterBar,
  Pagination,
  AdDetailsModal,
} from '../components'
import styles from './GoogleAdsTransparencyPage.module.css'
import { useAdFilters } from '../hooks/useAdFilters'
import type { GoogleAd } from '../types'

export function GoogleAdsTransparencyPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selectedAd, setSelectedAd] = useState<GoogleAd | null>(null)

  const { filters, debouncedFilters, updateFilters, clearFilters } = useAdFilters()

  const { data: adsData, isLoading, error, isFetching } = useGoogleAds(
    debouncedFilters,
    page,
    limit
  )

  const { data: formatOptions = [] } = useFormatOptions()

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1)
  }

  const handleClearFilters = () => {
    clearFilters()
    setPage(1)
  }

  const handleFiltersChange = (updates: Parameters<typeof updateFilters>[0]) => {
    updateFilters(updates)
    setPage(1)
  }

  const ads = adsData?.data || []
  const totalItems = adsData?.count || 0
  const totalPages = adsData?.totalPages || 1

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Eye size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Google Ads Spy</h1>
            <p className={styles.subtitle}>
              Explore anúncios coletados do Google Ads Transparency Center
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        formatOptions={formatOptions}
        isLoading={isFetching}
      />

      {/* Error State */}
      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar anúncios: {error.message}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
          <p>Carregando anúncios...</p>
        </div>
      ) : ads.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<Megaphone size={48} />}
          title={
            debouncedFilters.search ||
            debouncedFilters.format
              ? 'Nenhum anúncio encontrado'
              : 'Nenhum anúncio disponível'
          }
          description={
            debouncedFilters.search ||
            debouncedFilters.format
              ? 'Tente ajustar os filtros para encontrar mais resultados.'
              : 'Nenhum anunciante está sendo monitorado no momento.'
          }
          action={
            (debouncedFilters.search || debouncedFilters.format) ? (
              <Button onClick={handleClearFilters}>Limpar Filtros</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Results Count */}
          <div className={styles.resultsInfo}>
            <span>
              {totalItems.toLocaleString('pt-BR')} anúncio{totalItems !== 1 ? 's' : ''} encontrado
              {totalItems !== 1 ? 's' : ''}
            </span>
            {isFetching && <Spinner size="sm" />}
          </div>

          {/* Masonry Grid */}
          <MasonryGrid
            items={ads}
            keyExtractor={(ad) => ad.creativeId}
            renderItem={(ad) => (
              <AdCard ad={ad} onClick={() => setSelectedAd(ad)} />
            )}
          />

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            isLoading={isFetching}
          />
        </>
      )}

      {/* Ad Details Modal */}
      <AdDetailsModal
        ad={selectedAd}
        isOpen={!!selectedAd}
        onClose={() => setSelectedAd(null)}
      />
    </div>
  )
}
