import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CreditCard,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Button, Spinner, Input, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { useColumnReorder, useColumnResize, useConfirmDialog, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminSubscriptionsPage.module.css'
import { useCancelTransaction, useLogAdminAction } from '../api/mutations'
import { useAdminTransactions, useAdminPlans } from '../api/queries'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number | null): string {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
    case 'completed':
      return <CheckCircle size={14} />
    case 'cancelled':
    case 'refunded':
      return <XCircle size={14} />
    case 'pending':
      return <Clock size={14} />
    default:
      return <AlertCircle size={14} />
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Aprovado'
    case 'completed':
      return 'Concluido'
    case 'cancelled':
      return 'Cancelado'
    case 'refunded':
      return 'Reembolsado'
    case 'pending':
      return 'Pendente'
    default:
      return status
  }
}

export function AdminSubscriptionsPage() {
  useDocumentTitle('Admin - Assinaturas')
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  })
  const [searchUserId, setSearchUserId] = useState('')
  const [sortKey, setSortKey] = useState<
    'id' | 'user' | 'plan' | 'value' | 'method' | 'duration' | 'date' | 'status'
  >('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  const { data: transactions, isLoading, refetch } = useAdminTransactions({
    status: filters.status || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    userId: searchUserId || undefined,
  })
  const { data: plans } = useAdminPlans()
  const cancelTransaction = useCancelTransaction()
  const logAction = useLogAdminAction()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleCancelTransaction = async (transactionId: number) => {
    const confirmed = await confirm({
      title: 'Cancelar transação',
      message: 'Tem certeza que deseja cancelar esta transação?',
      confirmText: 'Cancelar transação',
      cancelText: 'Voltar',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await cancelTransaction.mutateAsync(transactionId)
      await logAction.mutateAsync({
        action: 'transaction_cancel',
        resource_type: 'transaction',
        resource_id: transactionId.toString(),
      })
      refetch()
    } catch (error) {
      console.error('Error cancelling transaction:', error)
    }
  }

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
      { key: 'id', label: 'Id', sortable: true, sortKey: 'id', minWidth: 80, width: 100 },
      { key: 'user', label: 'Usuario', sortable: true, sortKey: 'user', minWidth: 160, width: 200 },
      { key: 'plan', label: 'Plano', sortable: true, sortKey: 'plan', minWidth: 160, width: 200 },
      { key: 'value', label: 'Valor', sortable: true, sortKey: 'value', minWidth: 120, width: 140 },
      { key: 'method', label: 'Metodo', sortable: true, sortKey: 'method', minWidth: 120, width: 140 },
      { key: 'duration', label: 'Duracao', sortable: true, sortKey: 'duration', minWidth: 110, width: 130 },
      { key: 'date', label: 'Data', sortable: true, sortKey: 'date', minWidth: 150, width: 170 },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status', minWidth: 150, width: 170 },
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

  const sortedTransactions = useMemo(() => {
    if (!transactions) return []
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...transactions].sort((a, b) => {
      switch (sortKey) {
        case 'id':
          return direction * (a.id - b.id)
        case 'user':
          return direction * (a.user_id || '').localeCompare(b.user_id || '')
        case 'plan':
          return direction * (a.plan_name || '').localeCompare(b.plan_name || '')
        case 'value':
          return direction * ((a.buyer_paid || 0) - (b.buyer_paid || 0))
        case 'method':
          return direction * (a.payment_method || '').localeCompare(b.payment_method || '')
        case 'duration':
          return direction * ((a.duration || 0) - (b.duration || 0))
        case 'status':
          return direction * (a.status || '').localeCompare(b.status || '')
        case 'date':
        default: {
          const dateA = a.timestamp_approved || a.created_at
          const dateB = b.timestamp_approved || b.created_at
          const valueA = dateA ? new Date(dateA).getTime() : 0
          const valueB = dateB ? new Date(dateB).getTime() : 0
          return direction * (valueA - valueB)
        }
      }
    })
  }, [sortDirection, sortKey, transactions])

  const buildTransactionActions = (transactionId: number): RowActionItem[] => [
    {
      label: 'Cancelar transacao',
      onSelect: () => handleCancelTransaction(transactionId),
      icon: <XCircle size={16} />,
      destructive: true,
    },
  ]

  // Calculate summary stats
  const stats = {
    total: transactions?.length || 0,
    approved: transactions?.filter((t) => t.status === 'approved').length || 0,
    totalRevenue: transactions
      ?.filter((t) => t.status === 'approved')
      .reduce((sum, t) => sum + (t.buyer_paid || 0), 0) || 0,
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assinaturas</h1>
          <p className={styles.subtitle}>Gerencie todas as transacoes e assinaturas</p>
        </div>
        <Button variant="secondary" leftIcon={<Download size={18} />}>
          Exportar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total de Transacoes</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Aprovadas</div>
          <div className={styles.statValue}>{stats.approved}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Receita Total</div>
          <div className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <Input
          placeholder="Buscar por ID do usuario..."
          leftIcon={<Search size={18} />}
          value={searchUserId}
          onChange={(e) => setSearchUserId(e.target.value)}
          className={styles.searchInput}
          size="md"
        />

        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className={styles.filterSelect}
        >
          <option value="">Todos status</option>
          <option value="approved">Aprovado</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelado</option>
          <option value="refunded">Reembolsado</option>
        </select>

        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
          className={styles.filterInput}
          placeholder="Data inicial"
        />

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
          className={styles.filterInput}
          placeholder="Data final"
        />
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <CreditCard size={48} />
          <h3>Nenhuma transacao encontrada</h3>
          <p>Tente ajustar os filtros de busca</p>
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
              {sortedTransactions.map((tx) => (
                <tr key={tx.id}>
                  {orderedColumns.map((column) => {
                    const columnWidth = columnWidths[column.key]

                    if (column.key === 'id') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span className={styles.transactionId}>#{tx.id}</span>
                        </td>
                      )
                    }

                    if (column.key === 'user') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span className={styles.userId}>
                            {tx.user_id ? `${tx.user_id.slice(0, 8)}...` : '-'}
                          </span>
                        </td>
                      )
                    }

                    if (column.key === 'plan') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {tx.plan_name || '-'}
                        </td>
                      )
                    }

                    if (column.key === 'value') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatCurrency(tx.buyer_paid)}
                        </td>
                      )
                    }

                    if (column.key === 'method') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {tx.payment_method || '-'}
                        </td>
                      )
                    }

                    if (column.key === 'duration') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {tx.duration ? `${tx.duration} mes(es)` : '-'}
                        </td>
                      )
                    }

                    if (column.key === 'date') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatDate(tx.timestamp_approved || tx.created_at)}
                        </td>
                      )
                    }

                    if (column.key === 'status') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span className={`${styles.statusBadge} ${styles[tx.status]}`}>
                            {getStatusIcon(tx.status)}
                            {getStatusLabel(tx.status)}
                          </span>
                        </td>
                      )
                    }

                    if (column.key === 'actions') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.actionsCell}>
                            {tx.status === 'approved' ? (
                              <RowActionsMenu
                                items={buildTransactionActions(tx.id)}
                                ariaLabel="Acoes da transacao"
                              />
                            ) : (
                              <span className={styles.actionsPlaceholder} />
                            )}
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

      {/* Plans Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Planos Disponiveis</h2>
        <div className={styles.plansGrid}>
          {plans?.map((plan) => (
            <div key={plan.id} className={styles.planCard}>
              <h3>{plan.name}</h3>
              <p className={styles.planDescription}>{plan.description}</p>
              <div className={styles.planPrice}>{formatCurrency(plan.price)}/mes</div>
              <ul className={styles.planFeatures}>
                <li>{plan.monthly_credits} creditos/mes</li>
                <li>{plan.project_limit} projetos</li>
              </ul>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog />
    </div>
  )
}
