/**
 * UTM Preview Section Component
 *
 * Shows a preview of the final URL with UTM parameters added.
 * Includes character counter and warnings for URL length limits.
 */

import { Info, Link, AlertTriangle, XCircle } from 'lucide-react'
import styles from './sidebar.module.css'
import { MESSENGER_LIMITS } from '../../types'
import {
  previewFlowUrl,
  getUrlLengthStatus,
  calculateUrlLengthWithUtm,
  getFlowUtmTemplate,
} from '../../utils/utmBuilder'

interface UtmPreviewSectionProps {
  url: string
  flowId: string
  flowName: string
  nodeId: string
  nodeName?: string
  utmEnabled: boolean
}

export function UtmPreviewSection({
  url,
  flowId,
  flowName,
  nodeId,
  nodeName,
  utmEnabled,
}: UtmPreviewSectionProps) {
  if (!utmEnabled || !url) {
    return null
  }

  const config = {
    flowId,
    flowName,
    nodeId,
    nodeName,
  }

  const previewUrl = previewFlowUrl(url, config)
  const urlLength = calculateUrlLengthWithUtm(url, {
    ...config,
    // Include placeholders for full length calculation
    triggerId: '{{trigger.id}}',
    triggerName: '{{trigger.name}}',
    runId: '{{run.id}}',
  })
  const status = getUrlLengthStatus(url, {
    ...config,
    triggerId: '{{trigger.id}}',
    triggerName: '{{trigger.name}}',
    runId: '{{run.id}}',
  })

  const getStatusClass = () => {
    switch (status) {
      case 'warning':
        return styles.utmStatusWarning
      case 'error':
        return styles.utmStatusError
      default:
        return styles.utmStatusOk
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'warning':
        return <AlertTriangle size={14} />
      case 'error':
        return <XCircle size={14} />
      default:
        return <Link size={14} />
    }
  }

  return (
    <div className={styles.utmPreviewSection}>
      <div className={styles.utmPreviewHeader}>
        <span className={styles.utmPreviewTitle}>
          <Link size={14} />
          URL com UTM
        </span>
        <span className={`${styles.utmCharCounter} ${getStatusClass()}`}>
          {getStatusIcon()}
          {urlLength} / {MESSENGER_LIMITS.BUTTON_URL}
        </span>
      </div>

      <div className={styles.utmPreviewBox}>
        <code className={styles.utmPreviewUrl}>{previewUrl}</code>
      </div>

      {status === 'warning' && (
        <div className={styles.utmWarning}>
          <AlertTriangle size={14} />
          <span>URL próximo do limite. Considere usar uma URL mais curta.</span>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.utmError}>
          <XCircle size={14} />
          <span>
            URL excede o limite do Messenger ({MESSENGER_LIMITS.BUTTON_URL} caracteres). A mensagem
            pode falhar ao ser enviada.
          </span>
        </div>
      )}

      <div className={styles.utmInfoBox}>
        <Info size={14} />
        <span>
          Os placeholders como <code>{'{{trigger.id}}'}</code> e <code>{'{{run.id}}'}</code> serão
          substituídos no momento do envio.
        </span>
      </div>
    </div>
  )
}

/**
 * Shows the UTM template format for documentation/tooltip
 */
export function UtmTemplateInfo() {
  const template = getFlowUtmTemplate()

  return (
    <div className={styles.utmTemplateInfo}>
      <h4>Formato UTM Automático</h4>
      <code className={styles.utmTemplateCode}>{template}</code>
      <p className={styles.utmTemplateDescription}>
        Os parâmetros UTM são adicionados automaticamente aos links para rastreamento de conversões.
      </p>
    </div>
  )
}
