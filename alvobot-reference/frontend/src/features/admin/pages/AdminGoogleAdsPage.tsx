import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  Plus,
  Megaphone,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react'
import {
  useGoogleAdsAdvertisers,
  useAddAdvertiser,
  useToggleAdvertiser,
  useDeleteAdvertiser,
} from '@/features/google-ads-transparency/api'
import type { GoogleAdsAdvertiser } from '@/features/google-ads-transparency/types'
import { Button, Spinner, Modal, Input, Alert, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { useColumnReorder, useColumnResize, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminGoogleAdsPage.module.css'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminGoogleAdsPage() {
  useDocumentTitle('Admin - Google Ads')

  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<GoogleAdsAdvertiser | null>(null)
  const [sortKey, setSortKey] = useState<'advertiser' | 'id' | 'status' | 'created_at' | 'last_sync'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  // Form state
  const [newAdvertiserId, setNewAdvertiserId] = useState('')
  const [addError, setAddError] = useState('')

  // Queries and mutations
  const { data: advertisers, isLoading } = useGoogleAdsAdvertisers()
  const addAdvertiser = useAddAdvertiser()
  const toggleAdvertiser = useToggleAdvertiser()
  const deleteAdvertiser = useDeleteAdvertiser()

  const filteredAdvertisers = advertisers?.filter(
    (adv) =>
      adv.advertiserId.toLowerCase().includes(search.toLowerCase()) ||
      (adv.advertiserName && adv.advertiserName.toLowerCase().includes(search.toLowerCase()))
  )

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
      { key: 'advertiser', label: 'Anunciante', sortable: true, sortKey: 'advertiser', minWidth: 220, width: 320 },
      { key: 'id', label: 'Id', sortable: true, sortKey: 'id', minWidth: 200, width: 240 },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status', minWidth: 140, width: 160 },
      { key: 'created_at', label: 'Adicionado em', sortable: true, sortKey: 'created_at', minWidth: 160, width: 180 },
      { key: 'last_sync', label: 'Ultima sincronizacao', sortable: true, sortKey: 'last_sync', minWidth: 180, width: 200 },
      { key: 'actions', label: 'Acao', sortable: false, minWidth: 72, width: 72 },
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

  const sortedAdvertisers = useMemo(() => {
    if (!filteredAdvertisers) return []
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...filteredAdvertisers].sort((a, b) => {
      switch (sortKey) {
        case 'advertiser':
          return direction * (a.advertiserName || '').localeCompare(b.advertiserName || '')
        case 'id':
          return direction * a.advertiserId.localeCompare(b.advertiserId)
        case 'status':
          return direction * (Number(a.active) - Number(b.active))
        case 'last_sync': {
          const dateA = a.last_scraped_at ? new Date(a.last_scraped_at).getTime() : 0
          const dateB = b.last_scraped_at ? new Date(b.last_scraped_at).getTime() : 0
          return direction * (dateA - dateB)
        }
        case 'created_at':
        default: {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return direction * (dateA - dateB)
        }
      }
    })
  }, [filteredAdvertisers, sortDirection, sortKey])

  const buildAdvertiserActions = (advertiser: GoogleAdsAdvertiser): RowActionItem[] => [
    {
      label: advertiser.active ? 'Desativar' : 'Ativar',
      onSelect: () => handleToggle(advertiser),
      icon: advertiser.active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />,
    },
    {
      label: 'Ver no Google',
      onSelect: () => {
        window.open(
          `https://adstransparency.google.com/advertiser/${advertiser.advertiserId}`,
          '_blank',
          'noopener,noreferrer'
        )
      },
      icon: <ExternalLink size={16} />,
    },
    { type: 'separator' },
    {
      label: 'Excluir',
      onSelect: () => openDeleteModal(advertiser),
      icon: <Trash2 size={16} />,
      destructive: true,
    },
  ]

  const handleAdd = async () => {
    if (!newAdvertiserId.trim()) {
      setAddError('ID do anunciante é obrigatório')
      return
    }

    // Extract advertiser ID from URL if pasted
    let advertiserId = newAdvertiserId.trim()
    const urlMatch = advertiserId.match(/advertiser\/([^/?]+)/)
    if (urlMatch) {
      advertiserId = urlMatch[1]
    }

    try {
      await addAdvertiser.mutateAsync({ advertiserId, advertiserName: '' })
      setShowAddModal(false)
      setNewAdvertiserId('')
      setAddError('')
    } catch (error) {
      setAddError(error instanceof Error ? error.message : 'Erro ao adicionar anunciante')
    }
  }

  const handleToggle = async (advertiser: GoogleAdsAdvertiser) => {
    try {
      await toggleAdvertiser.mutateAsync({
        advertiserId: advertiser.advertiserId,
        active: !advertiser.active,
      })
    } catch (error) {
      console.error('Error toggling advertiser:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedAdvertiser) return

    try {
      await deleteAdvertiser.mutateAsync(selectedAdvertiser.advertiserId)
      setShowDeleteModal(false)
      setSelectedAdvertiser(null)
    } catch (error) {
      console.error('Error deleting advertiser:', error)
    }
  }

  const openDeleteModal = (advertiser: GoogleAdsAdvertiser) => {
    setSelectedAdvertiser(advertiser)
    setShowDeleteModal(true)
  }

  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setNewAdvertiserId('')
    setAddError('')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Megaphone size={24} />
            Google Ads Spy
          </h1>
          <p className={styles.subtitle}>
            Gerencie os anunciantes monitorados pelo scraper
          </p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
          Adicionar Anunciante
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Input
          placeholder="Buscar por ID ou nome..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          size="md"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !filteredAdvertisers || filteredAdvertisers.length === 0 ? (
        <div className={styles.emptyState}>
          <Megaphone size={48} />
          <h3>Nenhum anunciante encontrado</h3>
          <p>Adicione anunciantes para começar a monitorar seus anúncios</p>
          <Button onClick={() => setShowAddModal(true)} leftIcon={<Plus size={16} />}>
            Adicionar Anunciante
          </Button>
        </div>
      ) : (
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
                        draggedColumn === column.key ? styles.draggingHeader : ''
                      } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                      style={{ width: columnWidth || undefined }}
                      draggable
                      onDragStart={(e) => handleDragStart(column.key, e)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(column.key, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(column.key, e)}
                    >
                      <div className={styles.thContent}>
                        {isSortable ? (
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
              {sortedAdvertisers.map((advertiser) => (
                <tr key={advertiser.advertiserId}>
                  {orderedColumns.map((column) => {
                    const columnWidth = columnWidths[column.key]

                    if (column.key === 'advertiser') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.advertiserCell}>
                            <span className={styles.advertiserName}>
                              {advertiser.advertiserName || 'Nome não disponível'}
                            </span>
                          </div>
                        </td>
                      )
                    }

                    if (column.key === 'id') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <a
                            href={`https://adstransparency.google.com/advertiser/${advertiser.advertiserId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.advertiserLink}
                          >
                            {advertiser.advertiserId}
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      )
                    }

                    if (column.key === 'status') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span
                            className={`${styles.statusBadge} ${
                              advertiser.active ? styles.active : styles.inactive
                            }`}
                          >
                            {advertiser.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      )
                    }

                    if (column.key === 'created_at') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatDate(advertiser.created_at)}
                        </td>
                      )
                    }

                    if (column.key === 'last_sync') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatDate(advertiser.last_scraped_at)}
                        </td>
                      )
                    }

                    if (column.key === 'actions') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.actionsCell}>
                            <RowActionsMenu
                              items={buildAdvertiserActions(advertiser)}
                              ariaLabel="Acoes do anunciante"
                            />
                          </div>
                        </td>
                      )
                    }

                    return null
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={handleCloseAddModal} title="Adicionar Anunciante">
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Adicione um novo anunciante para monitorar seus anúncios do Google Ads Transparency
            Center.
          </p>

          {addError && (
            <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>
              {addError}
            </Alert>
          )}

          <div className={styles.formGroup}>
            <Input
              label="ID do Anunciante ou URL"
              value={newAdvertiserId}
              onChange={(e) => setNewAdvertiserId(e.target.value)}
              placeholder="AR12345678901234567 ou URL do Google Ads Transparency"
            />
            <p className={styles.hint}>
              Cole o ID do anunciante ou a URL completa do Google Ads Transparency Center
            </p>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={handleCloseAddModal}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} isLoading={addAdvertiser.isPending}>
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Anunciante"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Tem certeza que deseja excluir o anunciante{' '}
            <strong>{selectedAdvertiser?.advertiserName || selectedAdvertiser?.advertiserId}</strong>?
          </p>
          <p className={styles.warningText}>
            Os anúncios já coletados serão mantidos, mas não serão mais atualizados.
          </p>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteAdvertiser.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
