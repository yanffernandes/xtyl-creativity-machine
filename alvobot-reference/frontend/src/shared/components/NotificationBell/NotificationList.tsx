import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ConnectionNeedingReconnect } from '@/features/connections/api/useConnectionsNeedingReconnect'
import { Spinner } from '@/shared/components/Spinner'
import type { Notification, NotificationType } from '@/shared/types/database'
import styles from './NotificationBell.module.css'

interface NotificationListProps {
  notifications: Notification[]
  connectionsNeedingReconnect: ConnectionNeedingReconnect[]
  isLoading: boolean
  onMarkAsRead: (id: number) => void
  onMarkAllAsRead: () => void
  onClose: () => void
}

const notificationIcons: Record<NotificationType, string> = {
  article_published: '📝',
  article_failed: '❌',
  task_due: '⏰',
  task_overdue: '🚨',
  workspace_invite: '👥',
  workspace_joined: '✅',
  credit_low: '💳',
  credit_depleted: '⚠️',
  flow_completed: '✓',
  flow_failed: '✗',
  system: 'ℹ️',
  // Connection notifications
  token_expiring: '⏳',
  token_expired: '🔐',
  connection_error: '🔌',
  connection_success: '✅',
  // PageSpeed notifications
  pagespeed_poor_performance: '🐢',
  pagespeed_degraded: '📉',
  pagespeed_cwv_failed: '⚠️',
  pagespeed_improved: '🚀',
}

/**
 * Get navigation path for notification based on type and metadata
 */
function getNotificationPath(notification: Notification): string | null {
  const metadata = notification.data as Record<string, unknown>

  // PageSpeed notifications - navigate to project management
  if (notification.type.startsWith('pagespeed_') && metadata?.project_id) {
    return `/projects?manage=${metadata.project_id}`
  }

  // Connection notifications - navigate to connections page
  if (notification.type.startsWith('connection_') || notification.type.startsWith('token_')) {
    return '/connections'
  }

  return null
}

/**
 * Get user-friendly service type name
 */
function getServiceTypeName(connection: ConnectionNeedingReconnect): string {
  const serviceType = connection.metadata?.type
  const serviceTypeNames: Record<string, string> = {
    ads: 'Google Ads',
    adsense: 'AdSense',
    ad_manager: 'Ad Manager',
    search_console: 'Search Console',
    analytics: 'Analytics',
  }
  return serviceTypeNames[serviceType || ''] || connection.plataform_name
}

export function NotificationList({
  notifications,
  connectionsNeedingReconnect,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationListProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="md" />
      </div>
    )
  }

  const hasUnread = notifications.some((n) => !n.read_at)
  const hasReconnectAlert = connectionsNeedingReconnect.length > 0
  const isEmpty = notifications.length === 0 && !hasReconnectAlert

  const handleReconnectClick = () => {
    navigate('/connections')
    onClose()
  }

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <h3 className={styles.title}>Notificações</h3>
        {hasUnread && (
          <button
            type="button"
            className={styles.markAllButton}
            onClick={onMarkAllAsRead}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className={styles.list}>
        {/* Persistent reconnect alert - always shown at top when connections need attention */}
        {hasReconnectAlert && (
          <button
            type="button"
            className={styles.reconnectAlert}
            onClick={handleReconnectClick}
          >
            <span className={styles.reconnectIconWrapper}>
              <AlertTriangle size={18} />
            </span>
            <div className={styles.content}>
              <p className={styles.reconnectTitle}>
                {connectionsNeedingReconnect.length === 1
                  ? connectionsNeedingReconnect[0].reason === 'expired'
                    ? 'Conexão com token expirado'
                    : 'Conexão precisa ser reconectada'
                  : `${connectionsNeedingReconnect.length} conexões precisam de atenção`}
              </p>
              <p className={styles.reconnectMessage}>
                {connectionsNeedingReconnect.length === 1
                  ? `${connectionsNeedingReconnect[0].connection_name} (${getServiceTypeName(connectionsNeedingReconnect[0])})${connectionsNeedingReconnect[0].owner_name ? ` • ${connectionsNeedingReconnect[0].owner_name}` : ''}`
                  : connectionsNeedingReconnect
                      .slice(0, 3)
                      .map((c) => `${c.connection_name}${c.owner_name ? ` (${c.owner_name})` : ''}`)
                      .join(', ') +
                    (connectionsNeedingReconnect.length > 3
                      ? ` e mais ${connectionsNeedingReconnect.length - 3}`
                      : '')}
              </p>
              <span className={styles.reconnectAction}>
                Clique para reconectar
              </span>
            </div>
          </button>
        )}

        {/* Regular notifications */}
        {isEmpty ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔔</span>
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          notifications.map((notification) => {
            const navigationPath = getNotificationPath(notification)
            return (
            <button
              key={notification.id}
              type="button"
              className={`${styles.item} ${!notification.read_at ? styles.unread : ''}`}
              onClick={() => {
                if (!notification.read_at) {
                  onMarkAsRead(notification.id)
                }
                if (navigationPath) {
                  navigate(navigationPath)
                }
                onClose()
              }}
            >
              <span className={styles.icon}>
                {notificationIcons[notification.type] || 'ℹ️'}
              </span>
              <div className={styles.content}>
                <p className={styles.itemTitle}>{notification.title}</p>
                {notification.message && (
                  <p className={styles.message}>{notification.message}</p>
                )}
                <span className={styles.time}>
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              {!notification.read_at && <span className={styles.unreadDot} />}
            </button>
          )})
        )}
      </div>
    </div>
  )
}
