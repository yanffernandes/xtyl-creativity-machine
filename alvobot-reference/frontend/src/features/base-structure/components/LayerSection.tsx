import { Plus, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './LayerSection.module.css'
import type { BaseStructureCategory, BaseStructureAuthor } from '../types'

interface LayerSectionProps {
  title: string
  description: string
  layerNumber: 1 | 2 | 3 | 4
  items: BaseStructureCategory[] | BaseStructureAuthor[]
  onAdd: () => void
  onEdit: (item: BaseStructureCategory | BaseStructureAuthor) => void
  onDelete: (item: BaseStructureCategory | BaseStructureAuthor) => void
  disabled?: boolean
  parentFilter?: string // For subcategories - filter by parent category
}

function isAuthor(item: BaseStructureCategory | BaseStructureAuthor): item is BaseStructureAuthor {
  return 'display_name' in item
}

export function LayerSection({
  title,
  description,
  layerNumber,
  items,
  onAdd,
  onEdit,
  onDelete,
  disabled = false,
}: LayerSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.layerBadge}>Camada {layerNumber}</span>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={disabled}
          className={styles.addButton}
        >
          <Plus size={16} />
          Adicionar
        </Button>
      </div>

      <div className={styles.itemsList}>
        {items.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhum item adicionado ainda</p>
            <Button variant="ghost" size="sm" onClick={onAdd} disabled={disabled}>
              <Plus size={14} />
              Adicionar primeiro item
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.itemHandle}>
                <GripVertical size={16} />
              </div>

              {isAuthor(item) ? (
                <div className={styles.itemContent}>
                  {item.avatar_url && (
                    <img
                      src={item.avatar_url}
                      alt={item.display_name}
                      className={styles.authorAvatar}
                    />
                  )}
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.display_name}</span>
                    {item.role && <span className={styles.itemMeta}>{item.role}</span>}
                  </div>
                </div>
              ) : (
                <div className={styles.itemContent}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.slug && <span className={styles.itemMeta}>/{item.slug}</span>}
                  </div>
                </div>
              )}

              <div className={styles.itemActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => onEdit(item)}
                  title="Editar"
                  disabled={disabled}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => onDelete(item)}
                  title="Excluir"
                  disabled={disabled}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.counter}>
        {items.length} {items.length === 1 ? 'item' : 'itens'}
      </div>
    </div>
  )
}
