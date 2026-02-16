import { useState, useEffect, useMemo } from 'react'
import { FileText, Search, CheckCircle2, Circle, RefreshCw, AlertCircle } from 'lucide-react'
import { Button, Input, Spinner, Alert } from '@/shared/components'
import styles from './StepSelectArticles.module.css'
import { useGenerateTitles } from '../../api/mutations'

interface ArticleSuggestion {
  id: string
  title: string
  category: string
}

interface StepSelectArticlesProps {
  selectedArticles: string[]
  onSelect: (articles: string[]) => void
  onArticlesGenerated?: (articles: Array<{ id: string; title: string; category: string }>) => void
  categories: string[]
  niche: string | null
  requiredCount?: number
}

export function StepSelectArticles({
  selectedArticles,
  onSelect,
  onArticlesGenerated,
  categories,
  niche,
  requiredCount = 30,
}: StepSelectArticlesProps) {
  const [articles, setArticles] = useState<ArticleSuggestion[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const generateTitlesMutation = useGenerateTitles()

  const fetchTitles = async () => {
    if (!niche || categories.length === 0) return

    try {
      const response = await generateTitlesMutation.mutateAsync({
        niche,
        categories,
      })

      const generatedArticles = response.titles.map((item, index) => ({
        id: String(index + 1),
        title: item.title,
        category: item.category,
      }))

      setArticles(generatedArticles)

      // Notify parent component of generated articles
      onArticlesGenerated?.(generatedArticles)

      // Auto-select first 30 articles
      if (selectedArticles.length === 0 && response.titles.length >= requiredCount) {
        onSelect(response.titles.slice(0, requiredCount).map((_, i) => String(i + 1)))
      }
    } catch (error) {
      console.error('Failed to generate titles:', error)
    }
  }

  useEffect(() => {
    fetchTitles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, niche])

  const filteredArticles = useMemo(() => {
    let filtered = articles

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        a => a.title.toLowerCase().includes(searchLower) ||
             a.category.toLowerCase().includes(searchLower)
      )
    }

    if (filterCategory) {
      filtered = filtered.filter(a => a.category === filterCategory)
    }

    return filtered
  }, [articles, search, filterCategory])

  const handleToggle = (articleId: string) => {
    if (selectedArticles.includes(articleId)) {
      onSelect(selectedArticles.filter(id => id !== articleId))
    } else if (selectedArticles.length < requiredCount) {
      onSelect([...selectedArticles, articleId])
    }
  }

  const handleSelectAll = () => {
    const toSelect = filteredArticles
      .slice(0, requiredCount - selectedArticles.length)
      .map(a => a.id)
      .filter(id => !selectedArticles.includes(id))

    onSelect([...selectedArticles, ...toSelect])
  }

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredArticles.map(a => a.id))
    onSelect(selectedArticles.filter(id => !filteredIds.has(id)))
  }

  const handleRefresh = () => {
    onSelect([])
    fetchTitles()
  }

  const isLoading = generateTitlesMutation.isPending
  const isComplete = selectedArticles.length >= requiredCount
  const selectedInCurrentFilter = filteredArticles.filter(a => selectedArticles.includes(a.id)).length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <FileText size={24} />
        </div>
        <div>
          <h2 className={styles.title}>Selecione os Artigos</h2>
          <p className={styles.description}>
            Escolha {requiredCount} artigos para iniciar seu blog
          </p>
        </div>
      </div>

      {generateTitlesMutation.isError && (
        <Alert variant="error" className={styles.alert}>
          <AlertCircle size={18} />
          <span>Erro ao gerar títulos. Verifique sua conexão e tente novamente.</span>
        </Alert>
      )}

      <div className={styles.progressBar}>
        <div className={styles.progressInfo}>
          <span className={isComplete ? styles.complete : ''}>
            {selectedArticles.length} / {requiredCount}
          </span>
          <span>artigos selecionados</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={`${styles.progressFill} ${isComplete ? styles.complete : ''}`}
            style={{ width: `${Math.min((selectedArticles.length / requiredCount) * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar artigos..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          size="md"
        />

        <div className={styles.filters}>
          <select
            className={styles.categoryFilter}
            value={filterCategory || ''}
            onChange={(e) => setFilterCategory(e.target.value || null)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={selectedArticles.length >= requiredCount || isLoading}
          >
            Selecionar tudo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeselectAll}
            disabled={isLoading}
          >
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            leftIcon={<RefreshCw size={14} className={isLoading ? styles.spinning : ''} />}
          >
            Novas sugestões
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
          <p>Gerando títulos com IA (4-layer technique)...</p>
        </div>
      ) : (
        <>
          <div className={styles.tableHeader}>
            <span className={styles.checkboxCol} />
            <span className={styles.titleCol}>Título do Artigo</span>
            <span className={styles.categoryCol}>Categoria</span>
          </div>

          <div className={styles.articleList}>
            {filteredArticles.map((article) => {
              const isSelected = selectedArticles.includes(article.id)
              const isDisabled = !isSelected && selectedArticles.length >= requiredCount

              return (
                <button
                  key={article.id}
                  type="button"
                  className={`${styles.articleRow} ${isSelected ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
                  onClick={() => handleToggle(article.id)}
                  disabled={isDisabled}
                >
                  <span className={styles.checkboxCol}>
                    {isSelected ? (
                      <CheckCircle2 size={20} className={styles.checked} />
                    ) : (
                      <Circle size={20} className={styles.unchecked} />
                    )}
                  </span>
                  <span className={styles.titleCol}>
                    <span className={styles.articleTitle}>{article.title}</span>
                  </span>
                  <span className={styles.categoryCol}>
                    <span className={styles.categoryBadge}>{article.category}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {filteredArticles.length === 0 && (
            <div className={styles.emptyState}>
              <FileText size={48} />
              <p>Nenhum artigo encontrado</p>
              <span>Tente ajustar os filtros de busca</span>
            </div>
          )}

          <div className={styles.summary}>
            <span>
              Mostrando {filteredArticles.length} artigos
              {filterCategory && ` em ${filterCategory}`}
              {selectedInCurrentFilter > 0 && ` (${selectedInCurrentFilter} selecionados)`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
