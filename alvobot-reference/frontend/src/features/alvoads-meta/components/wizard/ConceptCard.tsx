/**
 * ConceptCard - Card component for displaying and selecting a creative concept
 * T032: Created for Andromeda Creative Diversity System
 */

import { Minus, Plus, Check } from 'lucide-react'
import styles from './ConceptSelector.module.css'
import type { CreativeConcept } from '../../types/creative'

interface ConceptCardProps {
  concept: CreativeConcept
  quantity: number
  maxQuantity: number
  onQuantityChange: (quantity: number) => void
  disabled?: boolean
}

// Map concept slugs to emoji icons
const CONCEPT_ICONS: Record<string, string> = {
  'before-after': '↔️',
  'problem-solution': '💡',
  'aspirational': '⭐',
  'curiosity': '❓',
  'social-proof': '👥',
  'urgency': '⏰',
  'transformation': '🦋',
  'simplicity': '✨',
  // Financial concepts
  'hero-conquista': '🏆',
  'familia-segura': '👨‍👩‍👧',
  'liberdade-financeira': '🗽',
  'novo-comeco': '🌅',
  'testemunho-real': '💬',
  'numero-grande': '📊',
  'case-sucesso': '🎯',
  'produto-cartao': '💳',
  'produto-app': '📱',
  'produto-dinheiro': '💵',
  'pergunta-hook': '🤔',
  'erro-comum': '⚠️',
  'revelacao': '🔍',
}

export function ConceptCard({
  concept,
  quantity,
  maxQuantity,
  onQuantityChange,
  disabled,
}: ConceptCardProps) {
  const isSelected = quantity > 0
  const icon = concept.icon || CONCEPT_ICONS[concept.slug] || '🎨'

  const handleIncrement = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1)
    }
  }

  const handleDecrement = () => {
    if (quantity > 0) {
      onQuantityChange(quantity - 1)
    }
  }

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      data-disabled={disabled}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>{icon}</div>
        {isSelected && (
          <div className={styles.selectedBadge}>
            <Check size={12} />
          </div>
        )}
      </div>

      <div className={styles.cardContent}>
        <h4 className={styles.cardTitle}>{concept.name}</h4>
        {concept.description && (
          <p className={styles.cardDescription}>{concept.description}</p>
        )}
      </div>

      <div className={styles.cardActions}>
        <div className={styles.quantityControl}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleDecrement}
            disabled={disabled || quantity === 0}
            aria-label="Diminuir quantidade"
          >
            <Minus size={14} />
          </button>

          <span className={styles.quantityValue}>{quantity}</span>

          <button
            type="button"
            className={styles.quantityButton}
            onClick={handleIncrement}
            disabled={disabled || quantity >= maxQuantity}
            aria-label="Aumentar quantidade"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {concept.category && concept.category !== 'universal' && (
        <div className={styles.categoryBadge}>
          {formatCategory(concept.category)}
        </div>
      )}
    </div>
  )
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    universal: 'Universal',
    narrativa: 'Narrativa',
    prova_social: 'Prova Social',
    produto: 'Produto',
    curiosidade: 'Curiosidade',
    estilo_visual: 'Estilo Visual',
  }
  return categoryMap[category] || category
}
