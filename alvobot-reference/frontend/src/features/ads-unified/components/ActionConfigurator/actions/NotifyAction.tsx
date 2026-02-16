/**
 * NotifyAction — notify
 *
 * Sends email notifications. Configures:
 * - Email addresses (comma-separated input)
 * - Custom message
 */

import { useCallback, useState } from 'react'
import { Info } from 'lucide-react'
import type { NotifyParams, ActionParams } from '../../../types/automation'
import styles from '../ActionConfigurator.module.css'

interface NotifyActionProps {
  params: NotifyParams
  onChange: (params: ActionParams) => void
}

export function NotifyAction({ params, onChange }: NotifyActionProps) {
  // Local state for the email input text (comma-separated)
  const [emailInput, setEmailInput] = useState<string>(
    (params.emails ?? []).join(', '),
  )

  const handleEmailsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setEmailInput(raw)

      // Parse emails from comma-separated string
      const emails = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      onChange({ ...params, emails })
    },
    [params, onChange],
  )

  const handleMessageChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...params, message: e.target.value })
    },
    [params, onChange],
  )

  return (
    <div className={styles.actionForm}>
      {/* Email addresses */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>E-mails de notificação</label>
        <input
          type="text"
          className={styles.nativeInput}
          value={emailInput}
          onChange={handleEmailsChange}
          placeholder="email@exemplo.com, outro@exemplo.com"
        />
        <span className={styles.fieldHint}>
          Separe múltiplos e-mails por vírgula
        </span>
      </div>

      {/* Custom message */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Mensagem personalizada (opcional)</label>
        <textarea
          className={styles.nativeTextarea}
          value={params.message ?? ''}
          onChange={handleMessageChange}
          placeholder="Descreva o que aconteceu e quais métricas dispararam esta notificação..."
          rows={3}
        />
      </div>

      {/* Info */}
      <div className={styles.infoBanner}>
        <Info className={styles.infoBannerIcon} />
        <span className={styles.infoBannerText}>
          A notificação incluirá automaticamente o nome da regra, as entidades afetadas e as
          métricas relevantes no momento da execução.
        </span>
      </div>
    </div>
  )
}
