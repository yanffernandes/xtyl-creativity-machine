import { useState, useEffect } from 'react'
import { Grid3X3, Check, RefreshCw, AlertCircle, Globe } from 'lucide-react'
import { Button, Spinner, Alert } from '@/shared/components'
import styles from './StepSelectCategories.module.css'
import { useGenerateCategories, useWordPressCategories } from '../../api/mutations'

interface Category {
  id: string
  name: string
  group: number
  isFromWordPress?: boolean
}

interface StepSelectCategoriesProps {
  selectedCategories: string[]
  onSelect: (categories: string[]) => void
  niche: string | null
  projectId: number | null
  minRequired?: number
  maxAllowed?: number
}

export function StepSelectCategories({
  selectedCategories,
  onSelect,
  niche,
  projectId,
  minRequired = 3,
  maxAllowed = 8,
}: StepSelectCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [hasLoadedWpCategories, setHasLoadedWpCategories] = useState(false)
  const generateCategoriesMutation = useGenerateCategories()

  // Fetch existing WordPress categories
  const { data: wpCategories, isLoading: wpCategoriesLoading } = useWordPressCategories(projectId)

  const fetchCategories = async (keepSelected = false) => {
    if (!niche) return

    try {
      const response = await generateCategoriesMutation.mutateAsync({ niche })

      // Flatten the grouped categories and add group info
      const newCategories: Category[] = []
      response.categories.forEach((group, groupIndex) => {
        group.forEach((item, itemIndex) => {
          newCategories.push({
            id: `ai-${groupIndex}-${itemIndex}`,
            name: item.title,
            group: groupIndex + 1,
          })
        })
      })

      // Get all names that should be kept (selected + WordPress)
      const wpCategoryNames = wpCategories?.map(c => c.name) || []
      const namesToKeep = [...selectedCategories, ...wpCategoryNames]

      // Build the final categories list
      const finalCategories: Category[] = []

      // 1. Add selected categories that aren't from WordPress
      if (keepSelected) {
        selectedCategories.forEach((name, idx) => {
          if (!wpCategoryNames.includes(name)) {
            finalCategories.push({
              id: `selected-${idx}`,
              name,
              group: 0,
            })
          }
        })
      }

      // 2. Add WordPress categories at the top
      wpCategories?.forEach((wpCat, idx) => {
        finalCategories.push({
          id: `wp-${idx}`,
          name: wpCat.name,
          group: -1, // Mark as WordPress category
          isFromWordPress: true,
        })
      })

      // 3. Add AI-generated categories that aren't duplicates
      const filteredNew = newCategories.filter(
        cat => !namesToKeep.includes(cat.name)
      )
      finalCategories.push(...filteredNew)

      setCategories(finalCategories)
    } catch (error) {
      console.error('Failed to generate categories:', error)
    }
  }

  // Initial load - includes WordPress categories
  useEffect(() => {
    if (!hasLoadedWpCategories && wpCategories !== undefined) {
      setHasLoadedWpCategories(true)
      fetchCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, wpCategories, hasLoadedWpCategories])

  const handleToggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      onSelect(selectedCategories.filter(c => c !== categoryName))
    } else if (selectedCategories.length < maxAllowed) {
      onSelect([...selectedCategories, categoryName])
    }
  }

  const handleRefresh = () => {
    fetchCategories(true) // Keep already selected categories
  }

  const isLoading = generateCategoriesMutation.isPending || wpCategoriesLoading
  const isValid = selectedCategories.length >= minRequired
  const hasWordPressCategories = (wpCategories?.length || 0) > 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Grid3X3 size={24} />
        </div>
        <div>
          <h2 className={styles.title}>Escolha as Categorias</h2>
          <p className={styles.description}>
            {hasWordPressCategories
              ? `Selecione de ${minRequired} a ${maxAllowed} categorias. Incluímos as que já existem no seu WordPress.`
              : `Selecione de ${minRequired} a ${maxAllowed} categorias para seu blog`
            }
            {niche && <span className={styles.nicheBadge}>{niche}</span>}
          </p>
        </div>
      </div>

      {generateCategoriesMutation.isError && (
        <Alert variant="error" className={styles.alert}>
          <AlertCircle size={18} />
          <span>Erro ao gerar categorias. Verifique sua conexão e tente novamente.</span>
        </Alert>
      )}

      <div className={styles.counter}>
        <span className={isValid ? styles.valid : styles.invalid}>
          {selectedCategories.length}
        </span>
        <span className={styles.separator}>/</span>
        <span>{maxAllowed}</span>
        <span className={styles.counterLabel}>categorias selecionadas</span>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
          <p>Gerando categorias com IA...</p>
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.name)
              const isDisabled = !isSelected && selectedCategories.length >= maxAllowed

              return (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles.categoryCard} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''} ${category.isFromWordPress ? styles.wordpress : ''}`}
                  onClick={() => handleToggleCategory(category.name)}
                  disabled={isDisabled}
                >
                  <div className={styles.categoryContent}>
                    {category.isFromWordPress && (
                      <span className={styles.wordpressBadge}>
                        <Globe size={12} />
                        WP
                      </span>
                    )}
                    <span className={styles.categoryName}>{category.name}</span>
                  </div>
                  {isSelected && (
                    <div className={styles.checkmark}>
                      <Check size={14} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              leftIcon={<RefreshCw size={16} className={isLoading ? styles.spinning : ''} />}
            >
              Sugerir outras
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
