import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  Search,
  Zap,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Square,
  CheckSquare,
  MinusSquare,
  FileEdit,
  X,
} from 'lucide-react'
import { useBulkCreateDrafts } from '@/features/articles/api/mutations'
import { useProjects } from '@/features/projects/api/useProjects'
import {
  Button,
  Input,
  Modal,
  Spinner,
  EmptyState,
  Alert,
  Select,
  SearchableSelect,
  MaskedValue,
  RowActionsMenu,
  type RowActionItem,
} from '@/shared/components'
import { useColumnReorder, useColumnResize, useDocumentTitle } from '@/shared/hooks'
import { usePrivacyStore } from '@/shared/stores/privacyStore'
import { useDeleteKeyword } from '../api/mutations'
import { useKeywords } from '../api/useKeywords'
import { KeywordMiningModal } from '../components'
import styles from './KeywordsPage.module.css'
import type { Keyword, KeywordUsage } from '../types'

// Discrepancy calculation: cpc_max / cpc_min ratio
function getDiscrepancy(keyword: Keyword): { value: string; level: 'high' | 'medium' | 'low' } {
  const cpcMin = keyword.cpc || 0
  const cpcMax = keyword.cpc_max || 0

  if (cpcMin <= 0 || cpcMax <= 0) return { value: '-', level: 'low' }

  const ratio = cpcMax / cpcMin
  let level: 'high' | 'medium' | 'low' = 'medium'

  // High: ratio > 10x (great opportunity)
  // Medium: ratio 3x-10x
  // Low: ratio < 3x
  if (ratio >= 10) level = 'high'
  else if (ratio < 3) level = 'low'

  return { value: `${ratio.toFixed(1)}x`, level }
}

function getVolumeLevel(volume?: number): 'high' | 'medium' | 'low' {
  if (!volume) return 'low'
  if (volume > 100000) return 'high'
  if (volume > 10000) return 'medium'
  return 'low'
}

const pageSizeOptions = [
  { value: '10', label: '10 por página' },
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

export function KeywordsPage() {
  useDocumentTitle('Mineração 10x')
  const [search, setSearch] = useState('')
  const [isMiningModalOpen, setIsMiningModalOpen] = useState(false)
  const [deletingKeyword, setDeletingKeyword] = useState<Keyword | null>(null)
  const [expandedKeyword, setExpandedKeyword] = useState<number | null>(null)
  const [sortKey, setSortKey] = useState<
    | 'keyword'
    | 'language'
    | 'country'
    | 'cpc_min'
    | 'cpc_max'
    | 'discrepancy'
    | 'volume'
    | 'usages'
    | 'updated_at'
  >('updated_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  // Selection state
  const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set())
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false)
  const [draftProjectId, setDraftProjectId] = useState<string>('')
  const [draftArticleType, setDraftArticleType] = useState<'base' | 'arrow'>('base')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const { data: keywords, isLoading, error, refetch } = useKeywords({ search })
  const { data: projects } = useProjects()
  const deleteMutation = useDeleteKeyword()
  const bulkCreateDraftsMutation = useBulkCreateDrafts()
  const isPrivacyMode = usePrivacyStore((state) => state.isPrivacyMode)

  const handleHeaderSort = useCallback((key: typeof sortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDirection('desc')
      return key
    })
  }, [])

  const getSortIcon = useCallback(
    (key: typeof sortKey) => {
      if (sortKey !== key) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />
      }
      return sortDirection === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      )
    },
    [sortDirection, sortKey]
  )

  const columns = useMemo(
    () => [
      { key: 'select', label: '', sortable: false, minWidth: 56, width: 56 },
      { key: 'keyword', label: 'Palavra-chave', sortable: true, sortKey: 'keyword', minWidth: 220, width: 280 },
      { key: 'language', label: 'Idioma', sortable: true, sortKey: 'language', minWidth: 90, width: 100 },
      { key: 'country', label: 'Pais', sortable: true, sortKey: 'country', minWidth: 90, width: 100 },
      { key: 'cpc_min', label: 'CPC Min', sortable: true, sortKey: 'cpc_min', minWidth: 110, width: 120 },
      { key: 'cpc_max', label: 'CPC Max', sortable: true, sortKey: 'cpc_max', minWidth: 110, width: 120 },
      { key: 'discrepancy', label: 'Discrepancia', sortable: true, sortKey: 'discrepancy', minWidth: 130, width: 140 },
      { key: 'volume', label: 'Pesquisas', sortable: true, sortKey: 'volume', minWidth: 120, width: 130 },
      { key: 'usages', label: 'Art. Criados', sortable: true, sortKey: 'usages', minWidth: 120, width: 140 },
      { key: 'updated_at', label: 'Atualizado em', sortable: true, sortKey: 'updated_at', minWidth: 140, width: 160 },
      { key: 'actions', label: 'Acoes', sortable: false, minWidth: 72, width: 72 },
    ],
    []
  )

  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map((column) => column.key))

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.key))
  }, [columns, setColumnOrder])

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key))
        .filter((column): column is (typeof columns)[number] => Boolean(column)),
    [columnMap, columnOrder]
  )

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column.key] = column.width
    })
    return widths
  }, [columns])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map((column) => ({ key: column.key, minWidth: column.minWidth }))
  )

  // Pagination calculations
  const filteredKeywords = useMemo(() => keywords || [], [keywords])
  const sortedKeywords = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...filteredKeywords].sort((a, b) => {
      switch (sortKey) {
        case 'keyword':
          return direction * a.keyword.localeCompare(b.keyword)
        case 'language':
          return direction * (a.language || '').localeCompare(b.language || '')
        case 'country':
          return direction * (a.country || '').localeCompare(b.country || '')
        case 'cpc_min':
          return direction * ((a.cpc || 0) - (b.cpc || 0))
        case 'cpc_max':
          return direction * ((a.cpc_max || 0) - (b.cpc_max || 0))
        case 'discrepancy': {
          const ratioA = a.cpc && a.cpc_max ? a.cpc_max / a.cpc : 0
          const ratioB = b.cpc && b.cpc_max ? b.cpc_max / b.cpc : 0
          return direction * (ratioA - ratioB)
        }
        case 'volume':
          return direction * ((a.search_volume || 0) - (b.search_volume || 0))
        case 'usages':
          return direction * ((a.usages?.length || 0) - (b.usages?.length || 0))
        case 'updated_at':
        default: {
          const dateA = a.updated_at || a.created_at
          const dateB = b.updated_at || b.created_at
          const valueA = dateA ? new Date(dateA).getTime() : 0
          const valueB = dateB ? new Date(dateB).getTime() : 0
          return direction * (valueA - valueB)
        }
      }
    })
  }, [filteredKeywords, sortDirection, sortKey])

  const totalItems = sortedKeywords.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedKeywords = sortedKeywords.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const confirmDelete = async () => {
    if (deletingKeyword) {
      await deleteMutation.mutateAsync({ id: deletingKeyword.id, keyword: deletingKeyword.keyword })
      setDeletingKeyword(null)
    }
  }

  // Selection functions
  const toggleSelectKeyword = (keywordId: number) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev)
      if (next.has(keywordId)) {
        next.delete(keywordId)
      } else {
        next.add(keywordId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedKeywords.size === paginatedKeywords.length) {
      setSelectedKeywords(new Set())
    } else {
      setSelectedKeywords(new Set(paginatedKeywords.map((k) => k.id)))
    }
  }

  const clearSelection = () => {
    setSelectedKeywords(new Set())
  }

  const getSelectedKeywordsData = () => {
    return filteredKeywords.filter((k) => selectedKeywords.has(k.id))
  }

  const handleCreateDrafts = async () => {
    if (!draftProjectId || selectedKeywords.size === 0) return

    const selectedData = getSelectedKeywordsData()
    // Pass full keyword data to create keyword_snapshot for each article
    // This ensures articles have language, country, and other metadata for Google Ads
    await bulkCreateDraftsMutation.mutateAsync({
      keywordsWithData: selectedData.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        search_volume: k.search_volume,
        cpc: k.cpc,
        cpc_max: k.cpc_max,
        visibility: k.visibility,
        created_at: k.created_at,
        updated_at: k.updated_at,
        competition: k.competition,
        language: k.language,
        country: k.country,
      })),
      project_id: parseInt(draftProjectId),
      article_type: draftArticleType,
      language: selectedData[0]?.language || 'pt',
    })

    setIsDraftsModalOpen(false)
    setSelectedKeywords(new Set())
    setDraftProjectId('')
    setDraftArticleType('base')
  }

  // Check selection state
  const isAllSelected = paginatedKeywords.length > 0 && selectedKeywords.size === paginatedKeywords.length
  const isPartiallySelected = selectedKeywords.size > 0 && selectedKeywords.size < paginatedKeywords.length

  const formatNumber = (num?: number) => {
    if (!num) return '-'
    return new Intl.NumberFormat('pt-BR').format(num)
  }

  const formatCurrency = (num?: number, currency = 'BRL') => {
    if (num === undefined || num === null) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(num)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}/${year}`
  }

  const toggleExpand = (keywordId: number) => {
    setExpandedKeyword(expandedKeyword === keywordId ? null : keywordId)
  }

  const renderUsagesBadge = (keyword: Keyword) => {
    const usages = keyword.usages || []
    if (usages.length === 0) {
      return <span className={styles.noUsage}>0</span>
    }

    // Group by project
    const projectsMap = new Map<string, KeywordUsage[]>()
    usages.forEach((usage) => {
      const key = usage.projectName || 'Sem projeto'
      if (!projectsMap.has(key)) {
        projectsMap.set(key, [])
      }
      projectsMap.get(key)!.push(usage)
    })

    const projectNames = Array.from(projectsMap.keys())

    // Mask project names if privacy mode is on
    const displayNames = isPrivacyMode
      ? projectNames.map((name) => `${name.slice(0, 3)  }••••••`)
      : projectNames

    return (
      <button
        className={styles.usageBtn}
        onClick={(e) => {
          e.stopPropagation()
          toggleExpand(keyword.id)
        }}
      >
        <span className={styles.usageCount}>{usages.length}</span>
        {displayNames.length > 0 && (
          <span className={styles.usageProjects}>
            {displayNames.slice(0, 2).join(', ')}
            {displayNames.length > 2 && ` +${displayNames.length - 2}`}
          </span>
        )}
      </button>
    )
  }

  const renderExpandedUsages = (keyword: Keyword, colSpan: number) => {
    if (expandedKeyword !== keyword.id || !keyword.usages?.length) return null

    return (
      <tr className={styles.expandedRow}>
        <td colSpan={colSpan}>
          <div className={styles.usagesPanel}>
            <div className={styles.usagesPanelHeader}>
              <FileText size={16} />
              <span>Artigos que usam "<MaskedValue value={keyword.keyword} type="partial" visibleStart={3} />"</span>
            </div>
            <div className={styles.usagesList}>
              {keyword.usages.map((usage) => (
                <div key={usage.articleId} className={styles.usageItem}>
                  <div className={styles.usageInfo}>
                    <span className={styles.usageArticleTitle}>
                      <MaskedValue value={usage.articleTitle || `Artigo #${usage.articleId}`} type="partial" visibleStart={5} />
                    </span>
                    {usage.projectName && (
                      <span className={styles.projectBadge}>
                        <MaskedValue value={usage.projectName} type="partial" visibleStart={3} />
                      </span>
                    )}
                  </div>
                  <div className={styles.usageMeta}>
                    <span className={styles.usageDate}>
                      {new Date(usage.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      className={styles.usageLink}
                      onClick={() => window.open(`/articles/edit/${usage.articleId}`, '_blank')}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </td>
      </tr>
    )
  }

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: Array<number | 'ellipsis'> = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Zap size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Mineração 10x</h1>
            <p className={styles.subtitle}>Descubra as melhores palavras-chave.</p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setIsMiningModalOpen(true)}
        >
          Nova Mineração
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar palavra-chave"
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedKeywords.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.bulkActionsLeft}>
            <button className={styles.clearSelectionBtn} onClick={clearSelection}>
              <X size={16} />
            </button>
            <span className={styles.selectionCount}>
              <strong>{selectedKeywords.size}</strong> palavra{selectedKeywords.size !== 1 ? 's' : ''} selecionada{selectedKeywords.size !== 1 ? 's' : ''}
            </span>
          </div>
          <div className={styles.bulkActionsRight}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<FileEdit size={16} />}
              onClick={() => setIsDraftsModalOpen(true)}
            >
              Criar Rascunhos
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar keywords: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : keywords?.length === 0 ? (
        <EmptyState
          icon={<Zap size={48} />}
          title="Nenhuma palavra-chave encontrada"
          description={search ? 'Tente uma busca diferente' : 'Adicione sua primeira mineração'}
          action={
            !search && (
              <Button leftIcon={<Plus size={18} />} onClick={() => setIsMiningModalOpen(true)}>
                Nova Mineração
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table} ref={tableRef}>
              <thead>
                <tr>
                  {orderedColumns.map((column) => {
                    const isSortable = column.sortable && column.sortKey
                    const columnWidth = columnWidths[column.key]

                    return (
                      <th
                        key={column.key}
                        data-column-key={column.key}
                        className={`${styles.th} ${styles.draggableHeader} ${
                          column.key === 'select' ? styles.checkboxCol : ''
                        } ${draggedColumn === column.key ? styles.draggingHeader : ''} ${
                          dragOverColumn === column.key ? styles.dragOverHeader : ''
                        }`}
                        style={{ width: columnWidth || undefined }}
                        draggable
                        onDragStart={(e) => handleDragStart(column.key, e)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(column.key, e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(column.key, e)}
                      >
                        <div className={styles.thContent}>
                          {column.key === 'select' ? (
                            <button
                              className={`${styles.checkboxBtn} ${isPartiallySelected ? styles.partial : ''}`}
                              onClick={toggleSelectAll}
                              aria-label={isAllSelected ? 'Desmarcar todos' : 'Marcar todos'}
                            >
                              {isAllSelected ? (
                                <CheckSquare size={20} />
                              ) : isPartiallySelected ? (
                                <MinusSquare size={20} />
                              ) : (
                                <Square size={20} />
                              )}
                            </button>
                          ) : isSortable ? (
                            <button
                              type="button"
                              className={styles.sortButton}
                              onClick={() => handleHeaderSort(column.sortKey as typeof sortKey)}
                            >
                              {column.label}
                              {getSortIcon(column.sortKey as typeof sortKey)}
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                        </div>
                        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                        <div
                          className={styles.resizeHandle}
                          onMouseDown={(e) => handleMouseDown(column.key, e)}
                          onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                        />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedKeywords.map((keyword) => (
                  <Fragment key={keyword.id}>
                    <tr
                      className={`${expandedKeyword === keyword.id ? styles.expandedParent : ''} ${
                        selectedKeywords.has(keyword.id) ? styles.selectedRow : ''
                      }`}
                    >
                      {orderedColumns.map((column) => {
                        const columnWidth = columnWidths[column.key]

                        if (column.key === 'select') {
                          return (
                            <td key={column.key} data-column-key={column.key} className={styles.checkboxCol} style={{ width: columnWidth || undefined }}>
                              <button
                                className={`${styles.checkboxBtn} ${selectedKeywords.has(keyword.id) ? styles.checked : ''}`}
                                onClick={() => toggleSelectKeyword(keyword.id)}
                                aria-label={selectedKeywords.has(keyword.id) ? 'Desmarcar' : 'Marcar'}
                              >
                                {selectedKeywords.has(keyword.id) ? (
                                  <CheckSquare size={20} />
                                ) : (
                                  <Square size={20} />
                                )}
                              </button>
                            </td>
                          )
                        }

                        if (column.key === 'keyword') {
                          return (
                            <td key={column.key} data-column-key={column.key} className={styles.keywordCell} style={{ width: columnWidth || undefined }}>
                              <span className={styles.keywordText}>
                                <MaskedValue value={keyword.keyword} type="partial" visibleStart={3} />
                              </span>
                            </td>
                          )
                        }

                        if (column.key === 'language') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {keyword.language?.toUpperCase() || 'PT'}
                            </td>
                          )
                        }

                        if (column.key === 'country') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {keyword.country?.toUpperCase() || 'BR'}
                            </td>
                          )
                        }

                        if (column.key === 'cpc_min') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {formatCurrency(keyword.cpc)}
                            </td>
                          )
                        }

                        if (column.key === 'cpc_max') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {formatCurrency(keyword.cpc_max)}
                            </td>
                          )
                        }

                        if (column.key === 'discrepancy') {
                          const disc = getDiscrepancy(keyword)
                          const discClass =
                            disc.level === 'high' ? styles.discrepancyHigh : disc.level === 'low' ? styles.discrepancyLow : styles.discrepancyMedium

                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              <span className={`${styles.discrepancyBadge} ${discClass}`}>
                                {disc.value}
                              </span>
                            </td>
                          )
                        }

                        if (column.key === 'volume') {
                          const volLevel = getVolumeLevel(keyword.search_volume)
                          const volClass =
                            volLevel === 'high' ? styles.volumeHigh : volLevel === 'low' ? styles.volumeLow : styles.volumeMedium

                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              <span className={volClass}>{formatNumber(keyword.search_volume)}</span>
                            </td>
                          )
                        }

                        if (column.key === 'usages') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {renderUsagesBadge(keyword)}
                            </td>
                          )
                        }

                        if (column.key === 'updated_at') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              <span className={styles.dateWithIcon}>
                                {formatDate(keyword.updated_at || keyword.created_at)}
                                <RefreshCw size={14} className={styles.refreshIcon} />
                              </span>
                            </td>
                          )
                        }

                        if (column.key === 'actions') {
                          const items: RowActionItem[] = [
                            {
                              label: 'Excluir',
                              onSelect: () => setDeletingKeyword(keyword),
                              icon: <Trash2 size={16} />,
                              destructive: true,
                            },
                          ]

                          return (
                            <td key={column.key} data-column-key={column.key} className={styles.actionsCell} style={{ width: columnWidth || undefined }}>
                              <RowActionsMenu items={items} ariaLabel="Acoes da keyword" />
                            </td>
                          )
                        }

                        return null
                      })}
                    </tr>
                    {renderExpandedUsages(keyword, orderedColumns.length)}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                <span>
                  {startIndex + 1} para {endIndex} de {totalItems}
                </span>
                <Select
                  value={String(pageSize)}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  options={pageSizeOptions}
                  className={styles.pageSizeSelect}
                />
              </div>
              <div className={styles.paginationControls}>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  aria-label="Primeira página"
                >
                  <ChevronLeft size={16} />
                  <ChevronLeft size={16} style={{ marginLeft: -8 }} />
                </button>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className={styles.paginationEllipsis}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      className={`${styles.paginationBtn} ${currentPage === page ? styles.active : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  className={styles.paginationBtn}
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Última página"
                >
                  <ChevronRight size={16} />
                  <ChevronRight size={16} style={{ marginLeft: -8 }} />
                </button>
              </div>
              <span className={styles.pageIndicator}>Página {currentPage} de {totalPages}</span>
            </div>
          )}
        </>
      )}

      {/* Mining Modal */}
      <KeywordMiningModal
        isOpen={isMiningModalOpen}
        onClose={() => setIsMiningModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingKeyword}
        onClose={() => setDeletingKeyword(null)}
        title="Excluir palavra-chave"
        size="sm"
      >
        <p className={styles.deleteMessage}>
          Tem certeza que deseja excluir a palavra-chave <strong><MaskedValue value={deletingKeyword?.keyword} type="partial" visibleStart={3} /></strong>?
        </p>
        <div className={styles.deleteActions}>
          <Button variant="outline" onClick={() => setDeletingKeyword(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} isLoading={deleteMutation.isPending}>
            Excluir
          </Button>
        </div>
      </Modal>

      {/* Create Drafts Modal */}
      <Modal
        isOpen={isDraftsModalOpen}
        onClose={() => setIsDraftsModalOpen(false)}
        title="Criar Rascunhos de Artigos"
        size="md"
      >
        <div className={styles.draftsModalContent}>
          <p className={styles.draftsModalDescription}>
            Você está prestes a criar <strong>{selectedKeywords.size}</strong> rascunho{selectedKeywords.size !== 1 ? 's' : ''} de artigo a partir das palavras-chave selecionadas.
          </p>

          <div className={styles.draftsForm}>
            <div className={styles.formGroup}>
              <SearchableSelect
                label="Projeto"
                value={draftProjectId}
                onChange={(value) => setDraftProjectId(value)}
                placeholder="Selecione um projeto"
                options={projects?.map((p) => ({ value: String(p.id), label: p.name })) || []}
                fullWidth
              />
            </div>

            <div className={styles.formGroup}>
              <span className={styles.formLabel}>Tipo de Artigo</span>
              <div className={styles.articleTypeToggle}>
                <button
                  className={`${styles.articleTypeBtn} ${draftArticleType === 'base' ? styles.active : ''}`}
                  onClick={() => setDraftArticleType('base')}
                >
                  <FileText size={16} />
                  Artigo de Base
                </button>
                <button
                  className={`${styles.articleTypeBtn} ${draftArticleType === 'arrow' ? styles.active : ''}`}
                  onClick={() => setDraftArticleType('arrow')}
                >
                  <Zap size={16} />
                  Artigo Flecha
                </button>
              </div>
            </div>
          </div>

          <div className={styles.selectedKeywordsList}>
            <p className={styles.selectedKeywordsTitle}>Palavras-chave selecionadas:</p>
            <div className={styles.keywordsTags}>
              {getSelectedKeywordsData().slice(0, 10).map((kw) => (
                <span key={kw.id} className={styles.keywordTag}>
                  <MaskedValue value={kw.keyword} type="partial" visibleStart={3} />
                </span>
              ))}
              {selectedKeywords.size > 10 && (
                <span className={styles.moreKeywords}>
                  +{selectedKeywords.size - 10} mais
                </span>
              )}
            </div>
          </div>

          <div className={styles.draftsActions}>
            <Button variant="outline" onClick={() => setIsDraftsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateDrafts}
              isLoading={bulkCreateDraftsMutation.isPending}
              disabled={!draftProjectId}
            >
              Criar {selectedKeywords.size} Rascunho{selectedKeywords.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
