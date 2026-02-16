import { useState } from 'react'
import { AlertTriangle, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './FailedSourcesNotification.module.css'

export interface FailedSource {
  type: 'ad_manager' | 'adsense'
  connectionId: string
  networkId?: string
  accountId?: string
  name: string
  error: string
  retryable: boolean
}

interface FailedSourcesNotificationProps {
  failedSources: FailedSource[]
  onRetry?: () => void
  onDismiss?: () => void
}

/**
 * Nielsen's Heuristics Compliance:
 * 1. Visibility of System Status - Shows which sources failed and why
 * 2. Error Prevention - Clear error messages help users understand what happened
 * 3. Help Users Recognize, Diagnose, and Recover from Errors - Shows actionable info
 * 4. Aesthetic and Minimalist Design - Collapsible details, non-intrusive placement
 */
export function FailedSourcesNotification({
  failedSources,
  onRetry,
  onDismiss,
}: FailedSourcesNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  if (failedSources.length === 0 || isDismissed) {
    return null
  }

  const hasRetryable = failedSources.some(s => s.retryable)
  const adManagerCount = failedSources.filter(s => s.type === 'ad_manager').length
  const adsenseCount = failedSources.filter(s => s.type === 'adsense').length

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  const handleRetry = () => {
    setIsDismissed(true)
    onRetry?.()
  }

  return (
    <div className={styles.container} role="alert" aria-live="polite">
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={20} className={styles.icon} />
        </div>

        <div className={styles.content}>
          <div className={styles.title}>
            {failedSources.length === 1 ? (
              <>Uma fonte não pôde ser carregada</>
            ) : (
              <>{failedSources.length} fontes não puderam ser carregadas</>
            )}
          </div>

          <div className={styles.summary}>
            {adManagerCount > 0 && (
              <span className={styles.sourceTag}>
                Ad Manager: {adManagerCount}
              </span>
            )}
            {adsenseCount > 0 && (
              <span className={styles.sourceTag}>
                AdSense: {adsenseCount}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          {hasRetryable && onRetry && (
            <button
              type="button"
              className={styles.retryButton}
              onClick={handleRetry}
              title="Tentar novamente"
            >
              <RefreshCw size={16} />
              <span>Tentar novamente</span>
            </button>
          )}

          <button
            type="button"
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            title={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button
            type="button"
            className={styles.dismissButton}
            onClick={handleDismiss}
            title="Dispensar"
            aria-label="Dispensar notificação"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.details}>
          <ul className={styles.sourceList}>
            {failedSources.map((source, index) => (
              <li key={`${source.connectionId}-${source.networkId || source.accountId || index}`} className={styles.sourceItem}>
                <div className={styles.sourceName}>
                  <span className={`${styles.sourceType} ${styles[source.type]}`}>
                    {source.type === 'ad_manager' ? 'AM' : 'AS'}
                  </span>
                  {source.name}
                </div>
                <div className={styles.sourceError}>
                  {source.error}
                  {source.retryable && (
                    <span className={styles.retryableTag}>Pode ser temporário</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <p className={styles.helpText}>
            Os dados exibidos podem estar incompletos. Tente novamente ou verifique suas{' '}
            <a href="/connections" className={styles.link}>conexões</a>.
          </p>
        </div>
      )}
    </div>
  )
}
