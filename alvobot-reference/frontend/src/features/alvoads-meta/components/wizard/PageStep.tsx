import { useCallback, useState, useMemo } from 'react'
import { AlertCircle, Loader2, Check, X, FileText, Plus, Search, User, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useMetaPages } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'

interface PageData {
  id: string
  name: string
  isActive: boolean
  category?: string
  pictureUrl?: string
}

export function PageStep() {
  const {
    accounts,
    connectionId,
    pages,
    togglePage,
    isPageSelected,
    clearPages,
    removePage,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  // Use the connectionId from store, or fallback to first account's connectionId
  const effectiveConnectionId = connectionId || accounts[0]?.connectionId

  // Fetch pages for the connection
  const {
    data: pagesData,
    isLoading: loadingPages,
    error: pagesError,
  } = useMetaPages(effectiveConnectionId)

  const handlePageSelect = useCallback((page: PageData) => {
    if (!page.isActive) return

    // Toggle page selection - accessToken not needed for wizard display
    togglePage({
      id: page.id,
      name: page.name,
      accessToken: '', // Will be fetched when publishing
    })

    // Mark step completed if at least one page is selected
    setTimeout(() => {
      if (useMetaAdsWizardStore.getState().pages.length > 0) {
        markStepCompleted('page')
      } else {
        markStepIncomplete('page')
      }
    }, 0)
  }, [togglePage, markStepCompleted, markStepIncomplete])

  const availablePages = useMemo(() => pagesData || [], [pagesData])
  const hasPages = availablePages.length > 0
  const selectedPagesCount = pages.length
  const [pageSearch, setPageSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Separate active and inactive pages
  const { activePages, inactivePages } = useMemo(() => {
    const filtered = availablePages.filter((page) => {
      if (!pageSearch.trim()) return true
      const term = pageSearch.toLowerCase()
      return page.name.toLowerCase().includes(term) || page.id.toLowerCase().includes(term)
    })

    return {
      activePages: filtered.filter(page => page.isActive),
      inactivePages: filtered.filter(page => !page.isActive),
    }
  }, [availablePages, pageSearch])

  if (!effectiveConnectionId) {
    return (
      <div className={styles.stepContent}>
        <section className={styles.section}>
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <h4>Selecione uma conta de anúncios primeiro</h4>
            <p>Você precisa selecionar pelo menos uma conta de anúncios na etapa anterior.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.stepContent}>
      {/* Select Facebook Page */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Selecione a Página do Facebook</h3>
        <p className={styles.sectionDescription}>
          Escolha quais páginas serão usadas para veicular os anúncios.
          Os anúncios aparecerão como publicações patrocinadas destas páginas.
        </p>

        {loadingPages ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando páginas...</span>
          </div>
        ) : pagesError ? (
          <div className={styles.errorState}>
            <AlertCircle size={24} />
            <span>Erro ao carregar páginas. Verifique se a conexão tem acesso às páginas.</span>
          </div>
        ) : !hasPages ? (
          <div className={styles.emptyState}>
            <FileText size={32} className={styles.emptyIcon} />
            <h4>Nenhuma página encontrada</h4>
            <p>
              Esta conexão não tem acesso a nenhuma página do Facebook.
              Você precisa ter permissão de gerenciamento em pelo menos uma página.
            </p>
            <Link to="/connections">
              <Button variant="outline" leftIcon={<Plus size={16} />}>
                Gerenciar conexões
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Input
              className={styles.searchInput}
              placeholder="Buscar por nome ou ID da pagina..."
              value={pageSearch}
              onChange={(event) => setPageSearch(event.target.value)}
              leftIcon={<Search size={16} />}
              size="md"
            />

            {activePages.length === 0 && inactivePages.length === 0 ? (
              <div className={styles.emptyState}>
                <FileText size={32} className={styles.emptyIcon} />
                <h4>Nenhuma página encontrada</h4>
                <p>Refine sua busca ou limpe o filtro.</p>
              </div>
            ) : (
              <>
                {activePages.length > 0 ? (
                  <div className={styles.optionsGrid}>
                    {activePages.map((page) => {
                      const isSelected = isPageSelected(page.id)

                      return (
                        <button
                          key={page.id}
                          type="button"
                          className={`${styles.optionCard} ${styles.pageCard} ${isSelected ? styles.selected : ''}`}
                          onClick={() => handlePageSelect(page)}
                        >
                          <div className={styles.pageCardContent}>
                            <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                              {isSelected && <Check size={14} />}
                            </div>
                            <div className={styles.pageAvatar}>
                              {page.pictureUrl ? (
                                <img src={page.pictureUrl} alt={page.name} />
                              ) : (
                                <User size={20} />
                              )}
                            </div>
                            <div className={styles.pageInfo}>
                              <span className={styles.pageName}>{page.name}</span>
                              <div className={styles.pageMeta}>
                                <span className={styles.pageId}>ID: {page.id}</span>
                                {page.category && (
                                  <span className={styles.pageCategory}>{page.category}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.emptyState}>
                    <FileText size={32} className={styles.emptyIcon} />
                    <h4>Nenhuma página ativa encontrada</h4>
                    <p>Todas as páginas estão inativas.</p>
                  </div>
                )}

                {/* Inactive pages collapsible section */}
                {inactivePages.length > 0 && (
                  <div className={styles.inactiveSection}>
                    <button
                      type="button"
                      className={styles.inactiveToggle}
                      onClick={() => setShowInactive(!showInactive)}
                    >
                      <ChevronDown
                        size={16}
                        className={`${styles.inactiveToggleIcon} ${showInactive ? styles.expanded : ''}`}
                      />
                      <span className={styles.inactiveToggleText}>
                        Páginas inativas
                      </span>
                      <span className={styles.inactiveToggleCount}>
                        {inactivePages.length}
                      </span>
                    </button>

                    <div className={`${styles.inactiveContent} ${showInactive ? styles.expanded : ''}`}>
                      <p className={styles.inactiveLabel}>
                        Estas páginas não estão disponíveis para veiculação de anúncios
                      </p>
                      <div className={styles.inactiveGrid}>
                        {inactivePages.map((page) => (
                          <div
                            key={page.id}
                            className={`${styles.optionCard} ${styles.pageCard} ${styles.inactive}`}
                          >
                            <div className={styles.pageCardContent}>
                              <div className={styles.checkboxIndicator} />
                              <div className={styles.pageAvatar}>
                                {page.pictureUrl ? (
                                  <img src={page.pictureUrl} alt={page.name} />
                                ) : (
                                  <User size={20} />
                                )}
                              </div>
                              <div className={styles.pageInfo}>
                                <span className={styles.pageName}>{page.name}</span>
                                <div className={styles.pageMeta}>
                                  <span className={styles.pageId}>ID: {page.id}</span>
                                  {page.category && (
                                    <span className={styles.pageCategory}>{page.category}</span>
                                  )}
                                </div>
                                <span className={styles.inactiveBadge}>Inativa</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* Selected Pages Summary */}
      {selectedPagesCount > 0 && (
        <section className={styles.section}>
          <div className={styles.selectionCounter}>
            <FileText size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>{selectedPagesCount}</strong> {selectedPagesCount === 1 ? 'página selecionada' : 'páginas selecionadas'}
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={() => {
                  clearPages()
                  markStepIncomplete('page')
                }}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>

          <div className={styles.selectedItemsList}>
            {pages.map((page) => (
              <div key={page.id} className={styles.selectedItemChip}>
                <span>{page.name}</span>
                <button
                  type="button"
                  className={styles.selectedItemChipRemove}
                  onClick={() => {
                    removePage(page.id)
                    setTimeout(() => {
                      if (useMetaAdsWizardStore.getState().pages.length === 0) {
                        markStepIncomplete('page')
                      }
                    }, 0)
                  }}
                  title="Remover página"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
