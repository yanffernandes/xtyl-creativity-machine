import { Trash2, Save, Download, Upload, Wand2 } from 'lucide-react'
import styles from './toolbar.module.css'

interface FlowToolbarProps {
  isActive: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  onToggleActive: () => void
  onClear: () => void
  onSave: () => void
  onExport: () => void
  onImport: () => void
  onAutoLayout: () => void
}

export function FlowToolbar({
  isActive,
  isSaving,
  hasUnsavedChanges,
  onToggleActive,
  onClear,
  onSave,
  onExport,
  onImport,
  onAutoLayout,
}: FlowToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Flow Active Toggle */}
      <label
        className={styles.flowToggle}
        title={isActive ? 'Clique para desativar o fluxo' : 'Clique para ativar o fluxo'}
      >
        <input
          type="checkbox"
          checked={isActive}
          onChange={onToggleActive}
          className={styles.toggleInput}
          aria-label="Ativar/Desativar Fluxo"
        />
        <span className={styles.toggleSlider} />
        <span className={styles.toggleLabel}>
          {isActive ? 'Ativo' : 'Inativo'}
        </span>
      </label>

      {hasUnsavedChanges && (
        <span className={styles.unsavedBadge}>Não salvo</span>
      )}

      <div className={styles.toolbarDivider} />

      <button
        className={styles.toolbarBtn}
        onClick={onAutoLayout}
        title="Organizar nós automaticamente"
      >
        <Wand2 size={18} />
      </button>

      <button
        className={styles.toolbarBtn}
        onClick={onClear}
        title="Limpar fluxo"
      >
        <Trash2 size={18} />
      </button>

      <button
        className={styles.toolbarBtn}
        onClick={onSave}
        title="Salvar fluxo"
        disabled={isSaving}
      >
        <Save size={18} />
      </button>

      <button
        className={styles.toolbarBtn}
        onClick={onExport}
        title="Exportar fluxo"
      >
        <Download size={18} />
      </button>

      <button
        className={styles.toolbarBtn}
        onClick={onImport}
        title="Importar fluxo"
      >
        <Upload size={18} />
      </button>
    </div>
  )
}
