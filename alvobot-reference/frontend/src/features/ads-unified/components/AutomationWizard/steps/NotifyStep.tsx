/**
 * NotifyStep — Step 5 of AutomationWizard
 *
 * Collects:
 * - Email addresses (tag-style input)
 * - Notification triggers (on action, error, no match)
 * - Custom subject line
 * - Include options (summary, entity details, metrics)
 */

import { useState, useCallback, type KeyboardEvent } from 'react'
import { X, Mail } from 'lucide-react'
import { Input, Checkbox } from '@/shared/components'
import type { UseAutomationFormReturn } from '../../../hooks/useAutomationForm'
import type { NotificationConfig } from '../../../types/automation'
import styles from '../AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface NotifyStepProps {
  form: UseAutomationFormReturn
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function NotifyStep({ form }: NotifyStepProps) {
  const { state, updateField } = form
  const notifications = state.notifications
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

  // ── Notification update helper ──

  const updateNotifications = useCallback(
    (updates: Partial<NotificationConfig>) => {
      updateField('notifications', { ...notifications, ...updates })
    },
    [notifications, updateField],
  )

  // ── Email management ──

  const addEmail = useCallback(
    (email: string) => {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed) return

      if (!isValidEmail(trimmed)) {
        setEmailError('Email inválido')
        return
      }

      if (notifications.emails.includes(trimmed)) {
        setEmailError('Email já adicionado')
        return
      }

      setEmailError(null)
      updateNotifications({
        emails: [...notifications.emails, trimmed],
      })
      setEmailInput('')
    },
    [notifications.emails, updateNotifications],
  )

  const removeEmail = useCallback(
    (email: string) => {
      updateNotifications({
        emails: notifications.emails.filter((e) => e !== email),
      })
    },
    [notifications.emails, updateNotifications],
  )

  const handleEmailKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        addEmail(emailInput)
      }
      if (
        e.key === 'Backspace' &&
        !emailInput &&
        notifications.emails.length > 0
      ) {
        removeEmail(notifications.emails[notifications.emails.length - 1])
      }
    },
    [emailInput, addEmail, removeEmail, notifications.emails],
  )

  const handleEmailBlur = useCallback(() => {
    if (emailInput.trim()) {
      addEmail(emailInput)
    }
  }, [emailInput, addEmail])

  return (
    <div>
      {/* ── Email Addresses ── */}
      <div className={styles.notifySection}>
        <span className={styles.notifySectionTitle}>
          <Mail
            size={14}
            style={{
              display: 'inline',
              verticalAlign: 'middle',
              marginRight: 'var(--space-2)',
            }}
          />
          Destinatários
        </span>
        <div className={styles.emailTags}>
          {notifications.emails.map((email) => (
            <span key={email} className={styles.emailTag}>
              {email}
              <button
                type="button"
                className={styles.emailTagRemove}
                onClick={() => removeEmail(email)}
                aria-label={`Remover ${email}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            type="email"
            className={styles.emailInput}
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value)
              setEmailError(null)
            }}
            onKeyDown={handleEmailKeyDown}
            onBlur={handleEmailBlur}
            placeholder={
              notifications.emails.length === 0
                ? 'Digite um email e pressione Enter'
                : 'Adicionar outro email...'
            }
          />
        </div>
        {emailError && (
          <span
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-error)',
              marginTop: 'var(--space-1)',
              display: 'block',
            }}
          >
            {emailError}
          </span>
        )}
        <span className={styles.fieldHint}>
          Pressione Enter ou vírgula para adicionar. Backspace para remover o
          último.
        </span>
      </div>

      {/* ── Notification Triggers ── */}
      <div className={styles.notifySection}>
        <span className={styles.notifySectionTitle}>Quando notificar</span>
        <div className={styles.notifyCheckboxes}>
          <Checkbox
            label="Ação executada"
            description="Notificar quando uma ação for aplicada a uma entidade"
            checked={notifications.notifyOnAction}
            onCheckedChange={(checked) =>
              updateNotifications({ notifyOnAction: checked === true })
            }
          />
          <Checkbox
            label="Erro de execução"
            description="Notificar quando ocorrer um erro durante a execução"
            checked={notifications.notifyOnError}
            onCheckedChange={(checked) =>
              updateNotifications({ notifyOnError: checked === true })
            }
          />
          <Checkbox
            label="Nenhuma correspondência"
            description="Notificar quando nenhuma entidade atender às condições (útil para debug)"
            checked={notifications.notifyOnNoMatch}
            onCheckedChange={(checked) =>
              updateNotifications({ notifyOnNoMatch: checked === true })
            }
          />
        </div>
      </div>

      {/* ── Custom Subject ── */}
      <div className={styles.notifySection}>
        <span className={styles.notifySectionTitle}>Assunto do email</span>
        <div className={styles.formField}>
          <Input
            placeholder="Ex: [AlvoBot] Automação executada: {rule_name}"
            value={notifications.customSubject || ''}
            onChange={(e) =>
              updateNotifications({
                customSubject: e.target.value || undefined,
              })
            }
            fullWidth
          />
          <span className={styles.fieldHint}>
            Deixe em branco para usar o assunto padrão. Use {'{rule_name}'} para
            incluir o nome da regra.
          </span>
        </div>
      </div>

      {/* ── Include Options ── */}
      <div className={styles.notifySection}>
        <span className={styles.notifySectionTitle}>
          Incluir no email
        </span>
        <div className={styles.notifyCheckboxes}>
          <Checkbox
            label="Resumo das ações"
            description="Tabela resumindo todas as ações executadas"
            checked={notifications.includeSummary}
            onCheckedChange={(checked) =>
              updateNotifications({ includeSummary: checked === true })
            }
          />
          <Checkbox
            label="Detalhes das entidades"
            description="Informações detalhadas de cada entidade afetada"
            checked={notifications.includeEntityDetails}
            onCheckedChange={(checked) =>
              updateNotifications({ includeEntityDetails: checked === true })
            }
          />
          <Checkbox
            label="Snapshot de métricas"
            description="Valores atuais das métricas no momento da execução"
            checked={notifications.includeMetricsSnapshot}
            onCheckedChange={(checked) =>
              updateNotifications({
                includeMetricsSnapshot: checked === true,
              })
            }
          />
        </div>
      </div>
    </div>
  )
}
