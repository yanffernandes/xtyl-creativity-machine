import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useConnectionsNeedingReconnect } from '@/features/connections/api/useConnectionsNeedingReconnect'
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/features/notifications/api'
import styles from './NotificationBell.module.css'
import { NotificationList } from './NotificationList'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useNotifications({ limit: 10 })
  const { data: connectionsNeedingReconnect } = useConnectionsNeedingReconnect()
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  const unreadCount = data?.unread_count || 0
  const notifications = data?.data || []
  const reconnectCount = connectionsNeedingReconnect?.length || 0

  // Total badge count includes both unread notifications and connections needing reconnect
  const totalBadgeCount = unreadCount + reconnectCount

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificações"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {totalBadgeCount > 0 && (
          <span className={reconnectCount > 0 ? styles.badgeAlert : styles.badge}>
            {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationList
          notifications={notifications}
          connectionsNeedingReconnect={connectionsNeedingReconnect || []}
          isLoading={isLoading}
          onMarkAsRead={(id) => markAsRead.mutate(id)}
          onMarkAllAsRead={() => markAllAsRead.mutate()}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
