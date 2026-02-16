import { useState } from 'react'
import {
  History,
  Search,
  User,
  Settings,
  CreditCard,
  Shield,
  Building2,
  FileText,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button, Spinner, Input } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminAuditPage.module.css'
import { useAdminAuditLog } from '../api/queries'
import type { AdminAuditLog } from '../types'

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    user_create: 'Criou usuario',
    user_update: 'Atualizou usuario',
    user_delete: 'Excluiu usuario',
    user_ban: 'Baniu usuario',
    user_unban: 'Desbaniu usuario',
    user_impersonate: 'Login como usuario',
    admin_create: 'Adicionou admin',
    admin_remove: 'Removeu admin',
    admin_update: 'Atualizou admin',
    subscription_create: 'Criou assinatura',
    subscription_cancel: 'Cancelou assinatura',
    transaction_cancel: 'Cancelou transacao',
    plan_create: 'Criou plano',
    plan_update: 'Atualizou plano',
    plan_delete: 'Excluiu plano',
    workspace_delete: 'Excluiu workspace',
    setting_update: 'Atualizou configuracao',
  }
  return labels[action] || action
}

function getActionIcon(resourceType: string) {
  switch (resourceType) {
    case 'user':
      return <User size={16} />
    case 'admin':
      return <Shield size={16} />
    case 'subscription':
    case 'transaction':
    case 'plan':
      return <CreditCard size={16} />
    case 'workspace':
      return <Building2 size={16} />
    case 'setting':
      return <Settings size={16} />
    default:
      return <FileText size={16} />
  }
}

function getActionColor(action: string): string {
  if (action.includes('delete') || action.includes('ban') || action.includes('cancel')) {
    return 'danger'
  }
  if (action.includes('create') || action.includes('unban')) {
    return 'success'
  }
  if (action.includes('impersonate')) {
    return 'warning'
  }
  return 'neutral'
}

export function AdminAuditPage() {
  useDocumentTitle('Admin - Auditoria')
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const perPage = 50

  const { data: logs, isLoading } = useAdminAuditLog(page, perPage)

  // Filter logs by search term
  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      log.resource_id?.toLowerCase().includes(searchLower) ||
      JSON.stringify(log.details).toLowerCase().includes(searchLower)
    )
  })

  const handleExport = () => {
    if (!filteredLogs) return

    const csvContent = [
      ['Data', 'Acao', 'Tipo', 'Recurso ID', 'Detalhes'].join(','),
      ...filteredLogs.map((log) =>
        [
          formatDateTime(log.created_at),
          getActionLabel(log.action),
          log.resource_type,
          log.resource_id || '-',
          JSON.stringify(log.details),
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Log de Auditoria</h1>
          <p className={styles.subtitle}>
            Historico completo de acoes administrativas no sistema
          </p>
        </div>
        <Button variant="secondary" leftIcon={<Download size={18} />} onClick={handleExport}>
          Exportar CSV
        </Button>
      </div>

      {/* Search */}
      <div className={styles.filters}>
        <Input
          placeholder="Buscar por acao, tipo ou detalhes..."
          leftIcon={<Search size={18} />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
          size="md"
        />
      </div>

      {/* Audit Log */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !filteredLogs || filteredLogs.length === 0 ? (
        <div className={styles.emptyState}>
          <History size={48} />
          <h3>Nenhum registro encontrado</h3>
          <p>O log de auditoria aparecera aqui conforme acoes administrativas forem realizadas</p>
        </div>
      ) : (
        <>
          <div className={styles.timeline}>
            {filteredLogs.map((log, index) => (
              <AuditLogItem key={log.id} log={log} isLast={index === filteredLogs.length - 1} />
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className={styles.pageInfo}>Pagina {page}</span>
            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              onClick={() => setPage((p) => p + 1)}
              disabled={!logs || logs.length < perPage}
            >
              Proxima
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function AuditLogItem({ log, isLast }: { log: AdminAuditLog; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const color = getActionColor(log.action)

  return (
    <div className={styles.logItem}>
      <div className={styles.logTimeline}>
        <div className={`${styles.logIcon} ${styles[color]}`}>{getActionIcon(log.resource_type)}</div>
        {!isLast && <div className={styles.logLine} />}
      </div>

      <div className={styles.logContent}>
        <div className={styles.logHeader}>
          <span className={`${styles.logAction} ${styles[color]}`}>
            {getActionLabel(log.action)}
          </span>
          <span className={styles.logTime}>{formatDateTime(log.created_at)}</span>
        </div>

        <div className={styles.logMeta}>
          <span className={styles.logResourceType}>{log.resource_type}</span>
          {log.resource_id && (
            <span className={styles.logResourceId}>ID: {log.resource_id.slice(0, 8)}...</span>
          )}
        </div>

        {log.details && Object.keys(log.details).length > 0 && (
          <>
            <button
              className={styles.expandButton}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>

            {expanded && (
              <div className={styles.logDetails}>
                <pre>{JSON.stringify(log.details, null, 2)}</pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
