import { Button } from '@/shared/components'
import styles from './BulkActionsBar.module.css'

interface Props {
  selectedCount: number
  onInspect: () => void
  onIndex: () => void
  onClear: () => void
  isInspecting?: boolean
  isIndexing?: boolean
  disableActions?: boolean
  disabledReason?: string
}

export function BulkActionsBar({
  selectedCount,
  onInspect,
  onIndex,
  onClear,
  isInspecting,
  isIndexing,
  disableActions,
  disabledReason,
}: Props) {
  return (
    <div className={styles.container}>
      <span>{selectedCount} selecionadas</span>
      <div className={styles.actions}>
        <Button
          size="sm"
          variant="outline"
          onClick={onInspect}
          isLoading={isInspecting}
          disabled={disableActions}
          title={disableActions ? disabledReason : undefined}
        >
          Verificar status
        </Button>
        <Button
          size="sm"
          onClick={onIndex}
          isLoading={isIndexing}
          disabled={disableActions}
          title={disableActions ? disabledReason : undefined}
        >
          Solicitar indexação
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Limpar
        </Button>
      </div>
    </div>
  )
}
