import { useState, useEffect, useMemo, useRef } from 'react'
import { Plus, Calendar, Search, ChevronDown, TrendingUp, X, FileText, FolderOpen } from 'lucide-react'
import { useKeywords } from '@/features/keywords/api/useKeywords'
import type { Keyword } from '@/features/keywords/types'
import { useProjects } from '@/features/projects/api/useProjects'
import { Modal, Button, Input, SearchableSelect, Textarea, Alert, Spinner } from '@/shared/components'
import styles from './CreateArrowArticleModal.module.css'
import { useCreateArrowArticle } from '../api/mutations'

interface CreateArrowArticleModalProps {
  isOpen: boolean
  onClose: () => void
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

export function CreateArrowArticleModal({ isOpen, onClose }: CreateArrowArticleModalProps) {
  const [keywordSearch, setKeywordSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null)
  const [projectId, setProjectId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>(getTodayDate())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { data: projects = [] } = useProjects()
  const { data: keywords = [], isLoading: isLoadingKeywords } = useKeywords({})
  const createMutation = useCreateArrowArticle()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setKeywordSearch('')
      setIsDropdownOpen(false)
      setSelectedKeyword(null)
      setProjectId('')
      setScheduledDate(getTodayDate())
      setTitle('')
      setDescription('')
      setError(null)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
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
    // Validação: palavra-chave é obrigatória
    if (!selectedKeyword) {
      setError('Selecione uma palavra-chave')
      return
    }

    // Validação: projeto é obrigatório
    if (!projectId) {
      setError('Selecione um projeto')
      return
    }

    setError(null)

    try {
      await createMutation.mutateAsync({
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
    } catch {
      setError('Erro ao criar artigo. Tente novamente.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Criar novo Artigo Flecha <span className={styles.arrow}>↓</span>
          </h2>
        </div>

        {error && (
          <Alert variant="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        {/* Passo 1: Seleção de palavra-chave */}
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
                      {selectedKeyword.articles_count || 0} uso{(selectedKeyword.articles_count || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {(selectedKeyword.articles_count || 0) > 0 && (
                    <div className={styles.usedInProjects}>
                      <FolderOpen size={12} />
                      <span>Usado em: {getUniqueProjects(selectedKeyword).join(', ') || 'Projeto não identificado'}</span>
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
              <div
                role="combobox"
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-controls="keyword-listbox"
                tabIndex={0}
                className={`${styles.dropdownTrigger} ${isDropdownOpen ? styles.dropdownOpen : ''}`}
                onClick={() => setIsDropdownOpen(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsDropdownOpen(true) }}
              >
                <Search size={18} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar palavra-chave..."
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                  className={styles.dropdownInput}
                  onFocus={() => setIsDropdownOpen(true)}
                />
                <ChevronDown size={18} className={`${styles.chevronIcon} ${isDropdownOpen ? styles.rotated : ''}`} />
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
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
                  <ul id="keyword-listbox" role="listbox" className={styles.dropdownOptions}>
                    {filteredKeywords.slice(0, 50).map((keyword) => {
                      const uniqueProjects = getUniqueProjects(keyword)
                      const usageCount = keyword.articles_count || 0
                      return (
                        /* eslint-disable jsx-a11y/no-noninteractive-element-to-interactive-role */
                        <li
                          key={keyword.id}
                          role="option"
                          aria-selected={false}
                          tabIndex={0}
                          className={styles.dropdownOption}
                          onClick={() => handleSelectKeyword(keyword)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSelectKeyword(keyword) }}
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
                                <span>{uniqueProjects.slice(0, 3).join(', ')}{uniqueProjects.length > 3 ? ` +${uniqueProjects.length - 3}` : ''}</span>
                              </div>
                            )}
                          </div>
                        </li>
                        /* eslint-enable jsx-a11y/no-noninteractive-element-to-interactive-role */
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

        {/* Passo 2: Projeto e data */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>Passo 2: Selecione o projeto e data de publicação:</p>
          <div className={styles.stepRow}>
            <div className={styles.projectSelect}>
              <SearchableSelect
                options={projectOptions}
                value={projectId}
                onChange={setProjectId}
                placeholder="Selecione o Projeto"
                searchPlaceholder="Buscar projeto..."
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
                placeholder="Data de publicação"
                className={styles.dateInput}
                rightIcon={<Calendar size={18} />}
              />
            </div>
          </div>
        </div>

        {/* Passo 3: Título e descrição (opcionais) */}
        <div className={styles.step}>
          <p className={styles.stepLabel}>Passo 3: Título e descrição (opcional):</p>
          <div className={styles.inputWrapper}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do artigo (a IA irá gerar se não informado)"
              maxLength={65}
              className={styles.titleInput}
            />
            <span className={styles.charCount}>{title.length}/65</span>
          </div>
          <div className={styles.textareaWrapper}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do artigo (opcional)"
              maxLength={160}
              rows={3}
              className={styles.descriptionInput}
            />
            <span className={styles.charCount}>{description.length}/160</span>
          </div>
          <p className={styles.hint}>A IA usará a palavra-chave e os campos preenchidos para criar o artigo.</p>
        </div>

        <div className={styles.footer}>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            leftIcon={<Plus size={18} />}
            disabled={!selectedKeyword || !projectId}
          >
            Gerar Artigo Flecha
          </Button>
        </div>
      </div>
    </Modal>
  )
}
