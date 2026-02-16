import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Plus,
  Calendar,
  Search,
  ChevronDown,
  TrendingUp,
  X,
  FileText,
  FolderOpen,
  AlertCircle,
} from 'lucide-react'
import { useUserCredits } from '@/features/auth/api/useUserPlan'
import { useKeywords } from '@/features/keywords/api/useKeywords'
import type { Keyword } from '@/features/keywords/types'
import { useProjects } from '@/features/projects/api/useProjects'
import {
  Modal,
  Button,
  Input,
  SearchableSelect,
  Textarea,
  Alert,
  Spinner,
} from '@/shared/components'
import styles from './CreateArticleModal.module.css'
import { useCreateArrowArticle, useCreateBaseArticle } from '../../api/mutations'
import type { ArticleType } from '../../api/useArticles'

interface CreateArticleModalProps {
  isOpen: boolean
  onClose: () => void
  articleType: ArticleType
  onSuccess?: (articleId: number) => void
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Format number with K/M suffix
function formatVolume(volume?: number): string {
  if (!volume) return '0'
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`
  return volume.toLocaleString('pt-BR')
}

// Get unique project names from keyword usages
function getUniqueProjects(keyword: Keyword): string[] {
  if (!keyword.usages || keyword.usages.length === 0) return []
  const projectNames = keyword.usages
    .map((u) => u.projectName)
    .filter((name): name is string => !!name)
  return [...new Set(projectNames)]
}

export function CreateArticleModal({
  isOpen,
  onClose,
  articleType,
  onSuccess,
}: CreateArticleModalProps) {
  // Common state
  const [projectId, setProjectId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>(
    articleType === 'arrow' ? getTodayDate() : ''
  )
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Arrow article specific state
  const [keywordSearch, setKeywordSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const { data: keywords = [], isLoading: isLoadingKeywords } = useKeywords({})
  const { data: credits, isLoading: creditsLoading } = useUserCredits()

  // Mutations
  const createArrowMutation = useCreateArrowArticle()
  const createBaseMutation = useCreateBaseArticle()

  // Reset form when modal opens or article type changes
  useEffect(() => {
    if (isOpen) {
      setProjectId('')
      setScheduledDate(articleType === 'arrow' ? getTodayDate() : '')
      setTitle('')
      setDescription('')
      setError(null)
      setKeywordSearch('')
      setIsDropdownOpen(false)
      setSelectedKeyword(null)
    }
  }, [isOpen, articleType])

  // Close dropdown when clicking outside (for arrow articles)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter keywords based on search
  const filteredKeywords = useMemo(() => {
    if (!keywordSearch.trim()) return keywords
    const searchLower = keywordSearch.toLowerCase()
    return keywords.filter((kw) => kw.keyword.toLowerCase().includes(searchLower))
  }, [keywords, keywordSearch])

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))

  // Credit checks for base articles
  const hasReachedLimit = credits ? credits.remaining <= 0 : false
  const hasNoPlan = credits ? !credits.hasActivePlan : true

  const handleClose = () => {
    onClose()
  }

  const handleSelectKeyword = (keyword: Keyword) => {
    setSelectedKeyword(keyword)
    setKeywordSearch('')
    setIsDropdownOpen(false)
  }

  const handleClearKeyword = () => {
    setSelectedKeyword(null)
    setKeywordSearch('')
  }

  const handleSubmit = async () => {
    // Common validations
    if (!projectId) {
      setError('Selecione um projeto')
      return
    }

    // Arrow-specific validations
    if (articleType === 'arrow') {
      if (!selectedKeyword) {
        setError('Selecione uma palavra-chave')
        return
      }
    }

    // Base-specific validations
    if (articleType === 'base') {
      if (!title.trim()) {
        setError('Informe o título do artigo')
        return
      }
      if (hasReachedLimit) {
        setError('Você atingiu o limite de artigos do seu plano neste ciclo.')
        return
      }
      if (hasNoPlan) {
        setError('Você precisa de um plano ativo para criar artigos.')
        return
      }
    }

    setError(null)

    try {
      if (articleType === 'arrow' && selectedKeyword) {
        const result = await createArrowMutation.mutateAsync({
          keyword_used: selectedKeyword.keyword,
          project_id: Number(projectId),
          title: title.trim() || undefined,
          excerpt: description.trim() || undefined,
          date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
          language: selectedKeyword.language,
          country: selectedKeyword.country,
          keyword_snapshot: {
            id: selectedKeyword.id,
            word: selectedKeyword.keyword,
            search_volume: selectedKeyword.search_volume,
            cpc_min: selectedKeyword.cpc,
            cpc_max: selectedKeyword.cpc_max,
            visibility: selectedKeyword.visibility,
            created_at: selectedKeyword.created_at,
            updated_at: selectedKeyword.updated_at,
            competition: selectedKeyword.competition,
            language: selectedKeyword.language,
            country: selectedKeyword.country,
          },
        })
        handleClose()
        onSuccess?.(result.id)
      } else if (articleType === 'base') {
        const result = await createBaseMutation.mutateAsync({
          title: title.trim(),
          project_id: Number(projectId),
          excerpt: description.trim() || undefined,
          date: scheduledDate || undefined,
        })
        handleClose()
        onSuccess?.(result.id)
      }
    } catch {
      setError('Erro ao criar artigo. Tente novamente.')
    }
  }

  const isLoading =
    articleType === 'arrow' ? createArrowMutation.isPending : createBaseMutation.isPending
  const isDisabled =
    articleType === 'arrow'
      ? !selectedKeyword || !projectId
      : !title.trim() || !projectId || hasReachedLimit || hasNoPlan

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {articleType === 'arrow' ? (
              <>
                Criar novo Artigo Flecha <span className={styles.arrow}>↓</span>
              </>
            ) : (
              <>
                Siga os passos abaixo para gerar seu artigo <span className={styles.arrow}>↓</span>
              </>
            )}
          </h2>
        </div>

        {error && (
          <Alert variant="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        {/* Arrow Article: Step 1 - Keyword Selection */}
        {articleType === 'arrow' && (
          <div className={styles.step}>
            <p className={styles.stepLabel}>Passo 1: Selecione a palavra-chave:</p>

            <div className={styles.keywordDropdown} ref={dropdownRef}>
              {/* Selected Keyword Display or Search Input */}
              {selectedKeyword ? (
                <div className={styles.selectedKeyword}>
                  <div className={styles.selectedKeywordContent}>
                    <span className={styles.selectedKeywordText}>{selectedKeyword.keyword}</span>
                    <div className={styles.selectedKeywordMeta}>
                      <span className={styles.keywordMetaItem}>
                        <TrendingUp size={12} />
                        {formatVolume(selectedKeyword.search_volume)} buscas
                      </span>
                      <span className={styles.keywordMetaItem}>
                        R$ {selectedKeyword.cpc?.toFixed(2) || '0.00'}
                      </span>
                      <span className={styles.keywordMetaItem}>
                        <FileText size={12} />
                        {selectedKeyword.articles_count || 0} uso
                        {(selectedKeyword.articles_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {(selectedKeyword.articles_count || 0) > 0 && (
                      <div className={styles.usedInProjects}>
                        <FolderOpen size={12} />
                        <span>
                          Usado em:{' '}
                          {getUniqueProjects(selectedKeyword).join(', ') ||
                            'Projeto não identificado'}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.clearKeywordBtn}
                    onClick={handleClearKeyword}
                    title="Limpar seleção"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className={styles.dropdownTrigger}>
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar palavra-chave..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className={styles.dropdownInput}
                    onFocus={() => setIsDropdownOpen(true)}
                    leftIcon={<Search size={18} />}
                    size="md"
                  />
                  <button
                    type="button"
                    className={styles.dropdownToggle}
                    onClick={() => setIsDropdownOpen(true)}
                    aria-label="Abrir lista de palavras-chave"
                  >
                    <ChevronDown
                      size={18}
                      className={`${styles.chevronIcon} ${isDropdownOpen ? styles.rotated : ''}`}
                    />
                  </button>
                </div>
              )}

              {/* Dropdown List */}
              {isDropdownOpen && !selectedKeyword && (
                <div className={styles.dropdownList}>
                  {isLoadingKeywords ? (
                    <div className={styles.dropdownLoading}>
                      <Spinner size="sm" />
                      <span>Carregando palavras-chave...</span>
                    </div>
                  ) : filteredKeywords.length === 0 ? (
                    <div className={styles.dropdownEmpty}>
                      {keywordSearch ? (
                        <>Nenhuma palavra-chave encontrada para "{keywordSearch}"</>
                      ) : (
                        <>Nenhuma palavra-chave cadastrada</>
                      )}
                    </div>
                  ) : (
                    <ul className={styles.dropdownOptions}>
                      {filteredKeywords.slice(0, 50).map((keyword) => {
                        const uniqueProjects = getUniqueProjects(keyword)
                        const usageCount = keyword.articles_count || 0
                        return (
                          <li key={keyword.id} className={styles.dropdownOption}>
                            <button
                              type="button"
                              className={styles.dropdownOptionButton}
                              onClick={() => handleSelectKeyword(keyword)}
                            >
                              <div className={styles.optionContent}>
                                <span className={styles.optionKeyword}>{keyword.keyword}</span>
                                <div className={styles.optionMeta}>
                                  <span className={styles.optionVolume}>
                                    <TrendingUp size={12} />
                                    {formatVolume(keyword.search_volume)}
                                  </span>
                                  <span className={styles.optionCpc}>
                                    R$ {keyword.cpc?.toFixed(2) || '0.00'}
                                  </span>
                                  <span className={styles.optionUsage}>
                                    <FileText size={12} />
                                    {usageCount} uso{usageCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {usageCount > 0 && uniqueProjects.length > 0 && (
                                  <div className={styles.optionProjects}>
                                    <FolderOpen size={10} />
                                    <span>
                                      {uniqueProjects.slice(0, 3).join(', ')}
                                      {uniqueProjects.length > 3
                                        ? ` +${uniqueProjects.length - 3}`
                                        : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </button>
                          </li>
                        )
                      })}
                      {filteredKeywords.length > 50 && (
                        <li className={styles.dropdownMoreItems}>
                          +{filteredKeywords.length - 50} palavras-chave. Refine sua busca.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project and Date Selection */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>
            {articleType === 'arrow'
              ? 'Passo 2: Selecione o projeto e data de publicação:'
              : 'Passo 1: Selecione o projeto e escolha a data de publicação:'}
          </p>
          <div className={styles.stepRow}>
            <div className={styles.projectSelect}>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                placeholder="Selecione o Projeto"
                searchPlaceholder="Buscar projeto..."
                isLoading={projectsLoading}
                emptyMessage="Nenhum projeto encontrado"
                noResultsMessage="Nenhum projeto encontrado para esta busca"
                fullWidth
              />
            </div>
            <div className={styles.dateInputWrapper}>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                placeholder={
                  articleType === 'arrow' ? 'Data de publicação' : 'Seleciona a data'
                }
                className={styles.dateInput}
                rightIcon={<Calendar size={18} />}
              />
            </div>
          </div>
        </div>

        {/* Title and Description */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>
            {articleType === 'arrow'
              ? 'Passo 3: Título e descrição (opcional):'
              : 'Passo 2: Defina o título e descrição:'}
          </p>
          <div className={styles.inputWrapper}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                articleType === 'arrow'
                  ? 'Título do artigo (a IA irá gerar se não informado)'
                  : 'Título do artigo'
              }
              maxLength={65}
              className={styles.titleInput}
            />
            <span className={styles.charCount}>{title.length}/65</span>
          </div>
          <div className={styles.textareaWrapper}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                articleType === 'arrow'
                  ? 'Descrição do artigo (opcional)'
                  : 'Descrição do artigo (Opcional)'
              }
              maxLength={160}
              rows={3}
              className={styles.descriptionInput}
            />
            <span className={styles.charCount}>{description.length}/160</span>
          </div>
          <p className={styles.hint}>
            {articleType === 'arrow'
              ? 'A IA usará a palavra-chave e os campos preenchidos para criar o artigo.'
              : 'A IA usará todos os campos preenchidos para criar o artigo.'}
          </p>
        </div>

        {/* Credit limit warnings (Base articles only) */}
        {articleType === 'base' && hasReachedLimit && (
          <Alert variant="warning" className={styles.alert}>
            <AlertCircle size={16} />
            <span>
              Você atingiu o limite de artigos deste ciclo. Aguarde o próximo ciclo ou faça upgrade
              do plano.
            </span>
          </Alert>
        )}

        {articleType === 'base' && hasNoPlan && !creditsLoading && (
          <Alert variant="warning" className={styles.alert}>
            <AlertCircle size={16} />
            <span>Você não possui um plano ativo. Assine um plano para criar artigos.</span>
          </Alert>
        )}

        <div className={styles.footer}>
          {articleType === 'base' && (
            <div className={styles.credits}>
              <span>Artigos neste ciclo:</span>
              {creditsLoading ? (
                <strong>...</strong>
              ) : credits ? (
                <strong className={hasReachedLimit ? styles.creditsExceeded : ''}>
                  {credits.used}/{credits.limit}
                </strong>
              ) : (
                <strong>-/-</strong>
              )}
            </div>
          )}
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            leftIcon={<Plus size={18} />}
            disabled={isDisabled}
          >
            {articleType === 'arrow' ? 'Gerar Artigo Flecha' : 'Gerar Novo Artigo'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
