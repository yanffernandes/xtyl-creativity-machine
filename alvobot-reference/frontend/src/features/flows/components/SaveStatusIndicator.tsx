import { memo } from 'react'
import { Cloud, Loader2, Check, AlertCircle } from 'lucide-react'
import styles from './SaveStatusIndicator.module.css'
import { useFlowEditorStore, type SaveStatus } from '../stores/flowEditorStore'

function formatLastSaved(date: Date | null): string {
  if (!date) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 5) return 'agora mesmo'
  if (diffSeconds < 60) return `há ${diffSeconds}s`
  if (diffMinutes < 60) return `há ${diffMinutes}min`
  if (diffHours < 24) return `há ${diffHours}h`

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig: Record<SaveStatus, { icon: typeof Cloud; label: string; className: string }> = {
  idle: {
    icon: Cloud,
    label: 'Não salvo',
    className: styles.idle,
  },
  pending: {
    icon: Cloud,
    label: 'Alterações pendentes',
    className: styles.pending,
  },
  saving: {
    icon: Loader2,
    label: 'Salvando...',
    className: styles.saving,
  },
  saved: {
    icon: Check,
    label: 'Salvo',
    className: styles.saved,
  },
  error: {
    icon: AlertCircle,
    label: 'Erro ao salvar',
    className: styles.error,
  },
}

export const SaveStatusIndicator = memo(function SaveStatusIndicator() {
  const { saveStatus, lastSavedAt, saveError } = useFlowEditorStore()

  const config = statusConfig[saveStatus]
  const Icon = config.icon
  const isSpinning = saveStatus === 'saving'

  return (
    <div
      className={`${styles.indicator} ${config.className}`}
      title={saveError || (lastSavedAt ? `Último salvamento: ${formatLastSaved(lastSavedAt)}` : config.label)}
    >
      <Icon size={16} className={isSpinning ? styles.spinning : ''} />
      <span className={styles.label}>
        {saveStatus === 'saved' && lastSavedAt
          ? `Salvo ${formatLastSaved(lastSavedAt)}`
          : config.label}
      </span>
    </div>
  )
})
