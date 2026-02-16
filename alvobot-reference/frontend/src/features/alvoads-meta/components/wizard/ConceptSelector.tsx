/**
 * ConceptSelector - Component for selecting concepts and quantities in preset mode
 * T030: Created for Andromeda Creative Diversity System
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { AlertCircle, Sparkles, CheckCircle2, Search, X } from 'lucide-react'
import { Spinner } from '@/shared/components'
import { ConceptCard } from './ConceptCard'
import styles from './ConceptSelector.module.css'
import { useConcepts } from '../../api/useConcepts'
import type { CreativeConcept, ConceptSelection, CreativeNiche } from '../../types/creative'

interface ConceptSelectorProps {
  niche: CreativeNiche
  selections: ConceptSelection[]
  requiredCount: number
  onSelectionsChange: (selections: ConceptSelection[]) => void
  disabled?: boolean
  onComplete?: () => void // Callback when selection is complete
}

export function ConceptSelector({
  niche,
  selections,
  requiredCount,
  onSelectionsChange,
  disabled,
  onComplete,
}: ConceptSelectorProps) {
  const { data: conceptsData, isLoading, error } = useConcepts(niche)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Calculate total selected
  const totalSelected = useMemo(() => {
    return selections.reduce((sum, s) => sum + s.quantity, 0)
  }, [selections])

  const remaining = requiredCount - totalSelected
  const isComplete = totalSelected === requiredCount
  const isOverSelected = totalSelected > requiredCount

  // Notify parent when selection is complete
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete()
    }
  }, [isComplete, onComplete])

  // Handle quantity change for a concept
  const handleQuantityChange = (concept: CreativeConcept, quantity: number) => {
    const existingIndex = selections.findIndex(
      (s) => s.conceptId === concept.id
    )

    if (quantity === 0) {
      // Remove selection
      if (existingIndex >= 0) {
        const newSelections = [...selections]
        newSelections.splice(existingIndex, 1)
        onSelectionsChange(newSelections)
      }
    } else {
      // Add or update selection
      const newSelection: ConceptSelection = {
        conceptId: concept.id,
        conceptSlug: concept.slug,
        quantity,
      }

      if (existingIndex >= 0) {
        const newSelections = [...selections]
        newSelections[existingIndex] = newSelection
        onSelectionsChange(newSelections)
      } else {
        onSelectionsChange([...selections, newSelection])
      }
    }
  }

  // Get quantity for a concept
  const getQuantity = (conceptId: string): number => {
    const selection = selections.find((s) => s.conceptId === conceptId)
    return selection?.quantity || 0
  }

  // Calculate max quantity per concept (remaining + current)
  const getMaxQuantity = (conceptId: string): number => {
    const currentQuantity = getQuantity(conceptId)
    return remaining + currentQuantity
  }

  // Flatten all concepts for display
  const allConcepts = useMemo(() => {
    if (!conceptsData) return []

    const concepts: CreativeConcept[] = [...conceptsData.universal]

    if (conceptsData.nicheSpecific) {
      const { narrativa, provaSocial, produto, curiosidade, estiloVisual } =
        conceptsData.nicheSpecific
      if (narrativa) concepts.push(...narrativa)
      if (provaSocial) concepts.push(...provaSocial)
      if (produto) concepts.push(...produto)
      if (curiosidade) concepts.push(...curiosidade)
      if (estiloVisual) concepts.push(...estiloVisual)
    }

    return concepts
  }, [conceptsData])

  // Filter concepts based on search query
  const filteredConcepts = useMemo(() => {
    if (!searchQuery.trim()) return allConcepts

    const query = searchQuery.toLowerCase().trim()
    return allConcepts.filter(
      (concept) =>
        concept.name.toLowerCase().includes(query) ||
        (concept.description?.toLowerCase().includes(query) ?? false) ||
        concept.category?.toLowerCase().includes(query)
    )
  }, [allConcepts, searchQuery])

  // Group concepts by category for display (using filtered concepts)
  const conceptsByCategory = useMemo(() => {
    const groups: Record<string, CreativeConcept[]> = {}

    for (const concept of filteredConcepts) {
      const category = concept.category || 'universal'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(concept)
    }

    return groups
  }, [filteredConcepts])

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('')
    searchInputRef.current?.focus()
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="md" />
        <span>Carregando conceitos...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <AlertCircle size={20} />
        <span>Erro ao carregar conceitos</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header with progress */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={20} className={styles.headerIcon} />
          <div>
            <h4 className={styles.title}>Selecione os Conceitos</h4>
            <p className={styles.subtitle}>
              Escolha os conceitos visuais e defina quantas imagens de cada
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div
            className={`${styles.progress} ${isComplete ? styles.progressComplete : ''} ${isOverSelected ? styles.progressError : ''}`}
          >
            {isComplete ? (
              <CheckCircle2 size={16} />
            ) : isOverSelected ? (
              <AlertCircle size={16} />
            ) : null}
            <span>
              {totalSelected} / {requiredCount}
            </span>
          </div>
        </div>
      </div>

      {/* Search input */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClearButton}
              onClick={handleClearSearch}
              aria-label="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchQuery && (
          <span className={styles.searchResults}>
            {filteredConcepts.length} template{filteredConcepts.length !== 1 ? 's' : ''} encontrado{filteredConcepts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Status message */}
      {!isComplete && !isOverSelected && (
        <div className={styles.statusMessage}>
          <AlertCircle size={16} />
          <span>
            {remaining === 1
              ? 'Falta selecionar 1 imagem'
              : `Faltam selecionar ${remaining} imagens`}
          </span>
        </div>
      )}

      {isOverSelected && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>
            Você selecionou {totalSelected - requiredCount} imagens a mais do
            que o necessário
          </span>
        </div>
      )}

      {/* Concept grid by category */}
      {filteredConcepts.length === 0 && searchQuery ? (
        <div className={styles.noResults}>
          <Search size={24} />
          <span>Nenhum template encontrado para "{searchQuery}"</span>
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={handleClearSearch}
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div className={styles.categories}>
          {Object.entries(conceptsByCategory).map(([category, concepts]) => (
            <div key={category} className={styles.category}>
              <h5 className={styles.categoryTitle}>
                {formatCategoryTitle(category)}
                <span className={styles.categoryCount}>
                  ({concepts.length})
                </span>
              </h5>

              <div className={styles.grid}>
                {concepts.map((concept) => (
                  <ConceptCard
                    key={concept.id}
                    concept={concept}
                    quantity={getQuantity(concept.id)}
                    maxQuantity={getMaxQuantity(concept.id)}
                    onQuantityChange={(qty) => handleQuantityChange(concept, qty)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatCategoryTitle(category: string): string {
  const titles: Record<string, string> = {
    universal: 'Conceitos Universais',
    narrativa: 'Narrativas',
    prova_social: 'Prova Social',
    produto: 'Produto',
    curiosidade: 'Curiosidade',
    estilo_visual: 'Estilos Visuais',
  }
  return titles[category] || category
}
