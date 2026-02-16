import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  History,
} from 'lucide-react'
import { Modal, Button, Spinner, EmptyState } from '@/shared/components'
import type { Connection } from '@/shared/types/entities'
import { api } from '@/shared/utils/api'
import styles from './ConnectionLogsModal.module.css'

interface ConnectionLog {
  id: string
  connection_id: string
  action: string
  status: 'success' | 'error' | 'warning'
  message: string
  metadata?: Record<string, unknown>
  created_at: string
}

interface ConnectionLogsResponse {
  success: boolean
  logs: ConnectionLog[]
  total: number
}

interface ConnectionLogsModalProps {
  connection: Connection | null
  isOpen: boolean
  onClose: () => void
}

const PAGE_SIZE = 10

const actionLabels: Record<string, string> = {
  oauth_start: 'Início OAuth',
  oauth_complete: 'OAuth Completo',
  token_refresh: 'Renovação de Token',
  delete: 'Remoção',
  activate: 'Ativação',
  deactivate: 'Desativação',
  sync: 'Sincronização',
  api_call: 'Chamada de API',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle size={16} className={styles.iconSuccess} />
    case 'error':
      return <XCircle size={16} className={styles.iconError} />
    case 'warning':
      return <AlertTriangle size={16} className={styles.iconWarning} />
    default:
      return null
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'success':
      return styles.statusSuccess
    case 'error':
      return styles.statusError
    case 'warning':
      return styles.statusWarning
    default:
      return ''
  }
}

export function ConnectionLogsModal({
  connection,
  isOpen,
  onClose,
}: ConnectionLogsModalProps) {
  const [page, setPage] = useState(0)

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<ConnectionLogsResponse>({
    queryKey: ['connectionLogs', connection?.id, page],
    queryFn: async () => {
      if (!connection?.id) return { success: false, logs: [], total: 0 }
      return api.get<ConnectionLogsResponse>(
        `/connections/${connection.id}/logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`
      )
    },
    enabled: isOpen && !!connection?.id,
  })

  const logs = data?.logs || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1)
    }
  }

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Histórico de ${connection?.connection_name || 'Conexão'}`}
      size="lg"
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.totalLabel}>
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner size="md" />
            <span>Carregando logs...</span>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <XCircle size={24} />
            <p>Erro ao carregar logs</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<History size={48} />}
            title="Nenhum registro encontrado"
            description="O histórico de atividades desta conexão aparecerá aqui."
          />
        ) : (
          <>
            <div className={styles.logsList}>
              {logs.map((log) => (
                <div key={log.id} className={styles.logItem}>
                  <div className={styles.logIcon}>{getStatusIcon(log.status)}</div>
                  <div className={styles.logContent}>
                    <div className={styles.logHeader}>
                      <span className={styles.logAction}>
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className={`${styles.logStatus} ${getStatusClass(log.status)}`}>
                        {log.status === 'success' && 'Sucesso'}
                        {log.status === 'error' && 'Erro'}
                        {log.status === 'warning' && 'Atenção'}
                      </span>
                    </div>
                    <p className={styles.logMessage}>{log.message}</p>
                    <span className={styles.logDate}>{formatDate(log.created_at)}</span>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className={styles.logMetadata}>
                        <summary>Detalhes</summary>
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ChevronLeft size={14} />}
                  onClick={handlePrevPage}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <span className={styles.pageInfo}>
                  Página {page + 1} de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ChevronRight size={14} />}
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
