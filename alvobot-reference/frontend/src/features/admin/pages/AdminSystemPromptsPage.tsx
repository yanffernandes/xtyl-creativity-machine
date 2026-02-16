import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Plus, Edit2, Trash2, MessageSquare, Check, X, Play } from 'lucide-react'
import { Button, Spinner, Modal, Input, Toggle, showToast, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { useColumnReorder, useColumnResize, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminSystemPromptsPage.module.css'
import {
  useCreateSystemPrompt,
  useUpdateSystemPrompt,
  useDeleteSystemPrompt,
  useLogAdminAction,
  useTestSystemPrompt,
} from '../api/mutations'
import { useSystemPrompts, useSystemPromptCategories, useOpenRouterModels, useValidateOpenRouterKey } from '../api/queries'
import type { SystemPrompt, CreateSystemPromptDto, SystemPromptFilters, TestPromptResponse, AIProvider } from '../types'

const DEFAULT_GEMINI_MODEL = 'google/gemini-3-flash-preview'

const OPENAI_MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
]

const PROVIDER_OPTIONS: Array<{ value: AIProvider; label: string }> = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'openrouter', label: 'OpenRouter' },
]

const emptyPrompt: CreateSystemPromptDto = {
  key: '',
  name: '',
  description: '',
  category: 'general',
  system_prompt: '',
  user_prompt_template: '',
  provider: 'openrouter',
  model: DEFAULT_GEMINI_MODEL,
  temperature: 0.7,
  max_tokens: 2000,
  is_active: true,
}

export function AdminSystemPromptsPage() {
  useDocumentTitle('Admin - Prompts do Sistema')
  const descriptionId = useId()
  const providerId = useId()
  const modelId = useId()
  const systemPromptId = useId()
  const userPromptId = useId()
  // Filters
  const [filters, setFilters] = useState<SystemPromptFilters>({
    search: '',
    category: undefined,
    is_active: undefined,
  })

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [formData, setFormData] = useState<CreateSystemPromptDto>(emptyPrompt)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [promptToDelete, setPromptToDelete] = useState<SystemPrompt | null>(null)

  // Test modal states
  const [showTestModal, setShowTestModal] = useState(false)
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<TestPromptResponse | null>(null)
  const [sortKey, setSortKey] = useState<'key' | 'name' | 'category' | 'model' | 'status'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const tableRef = useRef<HTMLTableElement>(null)

  // Queries and mutations
  const { data: prompts, isLoading, refetch } = useSystemPrompts(filters)
  const { data: categories } = useSystemPromptCategories()
  const { data: openRouterKeyStatus } = useValidateOpenRouterKey()
  const { data: openRouterModelsData, isLoading: isLoadingOpenRouterModels } = useOpenRouterModels(
    'text',
    formData.provider === 'openrouter'
  )
  const createPrompt = useCreateSystemPrompt()
  const updatePrompt = useUpdateSystemPrompt()
  const deletePrompt = useDeleteSystemPrompt()
  const logAction = useLogAdminAction()
  const testPrompt = useTestSystemPrompt()

  // Determine if OpenRouter is available
  const isOpenRouterAvailable = openRouterKeyStatus?.configured && openRouterKeyStatus?.valid

  // Get available provider options (hide OpenRouter if not configured)
  const availableProviders = useMemo(() => {
    if (isOpenRouterAvailable) {
      return PROVIDER_OPTIONS
    }
    return PROVIDER_OPTIONS.filter((p) => p.value !== 'openrouter')
  }, [isOpenRouterAvailable])

  // Get model options based on selected provider
  const modelOptions = useMemo(() => {
    if (formData.provider === 'openrouter' && openRouterModelsData?.models) {
      return openRouterModelsData.models.map((m) => ({
        value: m.id,
        label: m.name,
      }))
    }
    return OPENAI_MODEL_OPTIONS
  }, [formData.provider, openRouterModelsData])

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
  }

  const handleHeaderSort = useCallback((key: typeof sortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDirection('asc')
      return key
    })
  }, [])

  const getSortIcon = useCallback(
    (key: typeof sortKey) => {
      if (sortKey !== key) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />
      }
      return sortDirection === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      )
    },
    [sortDirection, sortKey]
  )

  const columns = useMemo(
    () => [
      { key: 'key', label: 'Key', sortable: true, sortKey: 'key', minWidth: 180, width: 220 },
      { key: 'name', label: 'Nome', sortable: true, sortKey: 'name', minWidth: 220, width: 320 },
      { key: 'category', label: 'Categoria', sortable: true, sortKey: 'category', minWidth: 140, width: 180 },
      { key: 'model', label: 'Modelo', sortable: true, sortKey: 'model', minWidth: 200, width: 260 },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status', minWidth: 140, width: 160 },
      { key: 'actions', label: 'Acao', sortable: false, minWidth: 88, width: 88 },
    ],
    []
  )

  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map((column) => column.key))

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.key))
  }, [columns, setColumnOrder])

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key))
        .filter((column): column is (typeof columns)[number] => Boolean(column)),
    [columnMap, columnOrder]
  )

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column.key] = column.width
    })
    return widths
  }, [columns])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map((column) => ({ key: column.key, minWidth: column.minWidth }))
  )

  const sortedPrompts = useMemo(() => {
    if (!prompts) return []
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...prompts].sort((a, b) => {
      switch (sortKey) {
        case 'key':
          return direction * a.key.localeCompare(b.key)
        case 'category':
          return direction * a.category.localeCompare(b.category)
        case 'model': {
          const modelA = a.provider === 'openrouter' ? (a.provider_model || a.model || '') : (a.model || '')
          const modelB = b.provider === 'openrouter' ? (b.provider_model || b.model || '') : (b.model || '')
          return direction * modelA.localeCompare(modelB)
        }
        case 'status':
          return direction * (Number(a.is_active) - Number(b.is_active))
        case 'name':
        default:
          return direction * a.name.localeCompare(b.name)
      }
    })
  }, [prompts, sortDirection, sortKey])

  const buildPromptActions = (prompt: SystemPrompt): RowActionItem[] => [
    {
      label: 'Editar',
      onSelect: () => handleOpenModal(prompt),
      icon: <Edit2 size={16} />,
    },
    {
      label: 'Excluir',
      onSelect: () => {
        setPromptToDelete(prompt)
        setShowDeleteModal(true)
      },
      icon: <Trash2 size={16} />,
      destructive: true,
    },
  ]

  const handleOpenModal = (prompt?: SystemPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setFormData({
        key: prompt.key,
        name: prompt.name,
        description: prompt.description || '',
        category: prompt.category,
        system_prompt: prompt.system_prompt,
        user_prompt_template: prompt.user_prompt_template,
        provider: prompt.provider || 'openai',
        provider_model: prompt.provider_model || undefined,
        model: prompt.model || DEFAULT_GEMINI_MODEL,
        temperature: prompt.temperature ?? 0.7,
        max_tokens: prompt.max_tokens ?? 2000,
        is_active: prompt.is_active,
        variables: prompt.variables || [],
      })
    } else {
      setEditingPrompt(null)
      setFormData(emptyPrompt)
    }
    setShowModal(true)
  }

  const handleProviderChange = (provider: AIProvider) => {
    setFormData((prev) => ({
      ...prev,
      provider,
      // Reset model when provider changes
      model: provider === 'openai' ? OPENAI_MODEL_OPTIONS[0]?.value || '' : DEFAULT_GEMINI_MODEL,
      provider_model: provider === 'openrouter' ? '' : undefined,
    }))
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPrompt(null)
    setFormData(emptyPrompt)
  }

  const handleSubmit = async () => {
    try {
      if (editingPrompt) {
        await updatePrompt.mutateAsync({
          id: editingPrompt.id,
          ...formData,
        })
        await logAction.mutateAsync({
          action: 'system_prompt_update',
          resource_type: 'system_prompt',
          resource_id: editingPrompt.id,
          details: { key: formData.key, name: formData.name },
        })
        showToast.success('Prompt atualizado com sucesso!')
      } else {
        await createPrompt.mutateAsync(formData)
        await logAction.mutateAsync({
          action: 'system_prompt_create',
          resource_type: 'system_prompt',
          details: { key: formData.key, name: formData.name },
        })
        showToast.success('Prompt criado com sucesso!')
      }
      handleCloseModal()
      refetch()
    } catch (error) {
      console.error('Error saving prompt:', error)
      showToast.error('Erro ao salvar prompt')
    }
  }

  const handleDeletePrompt = async () => {
    if (!promptToDelete) return

    try {
      await deletePrompt.mutateAsync(promptToDelete.id)
      await logAction.mutateAsync({
        action: 'system_prompt_delete',
        resource_type: 'system_prompt',
        resource_id: promptToDelete.id,
        details: { key: promptToDelete.key, name: promptToDelete.name },
      })
      showToast.success('Prompt excluido com sucesso!')
      setShowDeleteModal(false)
      setPromptToDelete(null)
      refetch()
    } catch (error) {
      console.error('Error deleting prompt:', error)
      showToast.error('Erro ao excluir prompt')
    }
  }

  // Extract variables from user_prompt_template using regex
  const extractVariables = (template: string): string[] => {
    const matches = template.match(/\{\{(\w+)\}\}/g)
    if (!matches) return []
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))]
  }

  const handleOpenTestModal = () => {
    // Initialize test variables with defaults from formData or editingPrompt
    const variables = formData.variables || editingPrompt?.variables || []
    const extractedVars = extractVariables(formData.user_prompt_template)

    const initialVars: Record<string, string> = {}
    extractedVars.forEach((varName) => {
      const definedVar = variables.find((v) => v.name === varName)
      initialVars[varName] = definedVar?.default || ''
    })

    setTestVariables(initialVars)
    setTestResult(null)
    setShowTestModal(true)
  }

  const handleCloseTestModal = () => {
    setShowTestModal(false)
    setTestVariables({})
    setTestResult(null)
  }

  const handleRunTest = async () => {
    try {
      const model = formData.provider === 'openrouter'
        ? (formData.provider_model || formData.model || DEFAULT_GEMINI_MODEL)
        : (formData.model || DEFAULT_GEMINI_MODEL)

      const result = await testPrompt.mutateAsync({
        system_prompt: formData.system_prompt,
        user_prompt_template: formData.user_prompt_template,
        variables: testVariables,
        provider: formData.provider ?? 'openai',
        model,
        temperature: formData.temperature ?? 0.7,
        max_tokens: formData.max_tokens ?? 2000,
      })
      setTestResult(result)
      showToast.success('Teste executado com sucesso!')
    } catch (error: unknown) {
      console.error('Error testing prompt:', error)
      // T045: Show user-friendly error messages from backend
      let errorMessage = 'Erro ao executar teste'
      if (error && typeof error === 'object') {
        const err = error as { message?: string; response?: { data?: { message?: string } } }
        // Try to get error message from response or error object
        if (err.response?.data?.message) {
          errorMessage = err.response.data.message
        } else if (err.message) {
          // Handle common OpenRouter error patterns
          if (err.message.includes('503') || err.message.includes('Service Unavailable')) {
            errorMessage = 'Servico OpenRouter temporariamente indisponivel. Tente novamente em alguns minutos.'
          } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Chave API invalida ou expirada. Verifique suas credenciais OpenRouter.'
          } else if (err.message.includes('429') || err.message.includes('Too Many')) {
            errorMessage = 'Limite de requisicoes excedido. Aguarde um momento e tente novamente.'
          } else if (err.message.includes('404')) {
            errorMessage = 'Modelo nao encontrado. O modelo selecionado pode nao estar disponivel.'
          } else {
            errorMessage = err.message
          }
        }
      }
      showToast.error(errorMessage)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Prompts</h1>
          <p className={styles.subtitle}>Gerencie os prompts de IA do sistema</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => handleOpenModal()}>
          Novo Prompt
        </Button>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar por key ou nome..."
          value={filters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className={styles.searchInput}
          leftIcon={<Search size={18} />}
          size="md"
        />

        <select
          value={filters.category || ''}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              category: e.target.value || undefined,
            }))
          }
          className={styles.filterSelect}
        >
          <option value="">Todas as categorias</option>
          {categories?.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={filters.is_active === undefined ? '' : filters.is_active ? 'true' : 'false'}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              is_active: e.target.value === '' ? undefined : e.target.value === 'true',
            }))
          }
          className={styles.filterSelect}
        >
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !prompts || prompts.length === 0 ? (
        <div className={styles.emptyState}>
          <MessageSquare size={48} />
          <h3>Nenhum prompt encontrado</h3>
          <p>Crie o primeiro prompt para comecar</p>
          <Button leftIcon={<Plus size={18} />} onClick={() => handleOpenModal()}>
            Criar Prompt
          </Button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} ref={tableRef}>
            <thead>
              <tr>
                {orderedColumns.map((column) => {
                  const isSortable = column.sortable && column.sortKey
                  const columnWidth = columnWidths[column.key]

                  return (
                    <th
                      key={column.key}
                      data-column-key={column.key}
                      className={`${styles.th} ${styles.draggableHeader} ${
                        draggedColumn === column.key ? styles.draggingHeader : ''
                      } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                      style={{ width: columnWidth || undefined }}
                      draggable
                      onDragStart={(e) => handleDragStart(column.key, e)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(column.key, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(column.key, e)}
                    >
                      <div className={styles.thContent}>
                        {isSortable ? (
                          <button
                            type="button"
                            className={styles.sortButton}
                            onClick={() => handleHeaderSort(column.sortKey as typeof sortKey)}
                          >
                            {column.label}
                            {getSortIcon(column.sortKey as typeof sortKey)}
                          </button>
                        ) : (
                          <span>{column.label}</span>
                        )}
                      </div>
                      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                      <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => handleMouseDown(column.key, e)}
                        onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedPrompts.map((prompt) => (
                <tr key={prompt.id}>
                  {orderedColumns.map((column) => {
                    const columnWidth = columnWidths[column.key]

                    if (column.key === 'key') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <code className={styles.keyCode}>{prompt.key}</code>
                        </td>
                      )
                    }

                    if (column.key === 'name') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.nameCell}>
                            <span className={styles.promptName}>{prompt.name}</span>
                            {prompt.description && (
                              <span className={styles.promptDescription}>{prompt.description}</span>
                            )}
                          </div>
                        </td>
                      )
                    }

                    if (column.key === 'category') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span className={styles.categoryBadge}>{prompt.category}</span>
                        </td>
                      )
                    }

                    if (column.key === 'model') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.modelCell}>
                            {prompt.provider && prompt.provider !== 'openai' && (
                              <span className={styles.providerBadge}>{prompt.provider}</span>
                            )}
                            <span className={styles.modelBadge}>
                              {prompt.provider === 'openrouter'
                                ? (prompt.provider_model || prompt.model || 'N/A')
                                : (prompt.model || DEFAULT_GEMINI_MODEL)}
                            </span>
                          </div>
                        </td>
                      )
                    }

                    if (column.key === 'status') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span
                            className={`${styles.statusBadge} ${
                              prompt.is_active ? styles.statusActive : styles.statusInactive
                            }`}
                          >
                            {prompt.is_active ? (
                              <>
                                <Check size={12} /> Ativo
                              </>
                            ) : (
                              <>
                                <X size={12} /> Inativo
                              </>
                            )}
                          </span>
                        </td>
                      )
                    }

                    if (column.key === 'actions') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.actionsCell}>
                            <RowActionsMenu items={buildPromptActions(prompt)} ariaLabel="Acoes do prompt" />
                          </div>
                        </td>
                      )
                    }

                    return null
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
        size="lg"
      >
        <div className={styles.modalContent}>
          <div className={styles.formRow}>
            <Input
              label="Key (identificador unico)"
              value={formData.key}
              onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
              placeholder="ex: generate_article_title"
              disabled={!!editingPrompt}
            />
            <Input
              label="Nome"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nome do prompt"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={descriptionId}>Descricao</label>
            <textarea
              id={descriptionId}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descricao do prompt..."
              className={styles.textarea}
              rows={2}
            />
          </div>

          <div className={styles.formRow}>
            <Input
              label="Categoria"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              placeholder="ex: articles, seo, general"
            />
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor={providerId}>Provider</label>
              <select
                id={providerId}
                value={formData.provider || 'openai'}
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                className={styles.select}
              >
                {availableProviders.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor={modelId}>
                Modelo
                {isLoadingOpenRouterModels && formData.provider === 'openrouter' && (
                  <Spinner size="sm" className={styles.inlineSpinner} />
                )}
              </label>
              <select
                id={modelId}
                value={formData.provider === 'openrouter' ? (formData.provider_model || formData.model || '') : (formData.model || DEFAULT_GEMINI_MODEL)}
                onChange={(e) => {
                  if (formData.provider === 'openrouter') {
                    setFormData((prev) => ({ ...prev, provider_model: e.target.value, model: e.target.value }))
                  } else {
                    setFormData((prev) => ({ ...prev, model: e.target.value }))
                  }
                }}
                className={styles.select}
                disabled={isLoadingOpenRouterModels && formData.provider === 'openrouter'}
              >
                {formData.provider === 'openrouter' && modelOptions.length === 0 && (
                  <option value="">Carregando modelos...</option>
                )}
                {modelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={systemPromptId}>System Prompt</label>
            <textarea
              id={systemPromptId}
              value={formData.system_prompt}
              onChange={(e) => setFormData((prev) => ({ ...prev, system_prompt: e.target.value }))}
              placeholder="Voce e um assistente..."
              className={styles.textarea}
              rows={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={userPromptId}>User Prompt Template</label>
            <textarea
              id={userPromptId}
              value={formData.user_prompt_template}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, user_prompt_template: e.target.value }))
              }
              placeholder="Use {{variavel}} para variaveis dinamicas..."
              className={styles.textarea}
              rows={6}
            />
            <span className={styles.hint}>
              Use {'{{variavel}}'} para variaveis dinamicas no template
            </span>
          </div>

          <div className={styles.formRow}>
            <Input
              label="Temperature"
              type="number"
              value={formData.temperature?.toString() || '0.7'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))
              }
              placeholder="0.7"
            />
            <Input
              label="Max Tokens"
              type="number"
              value={formData.max_tokens?.toString() || '2000'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, max_tokens: parseInt(e.target.value) || 2000 }))
              }
              placeholder="2000"
            />
          </div>

          <div className={styles.toggleWrapper}>
            <Toggle
              checked={formData.is_active ?? true}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
              label="Prompt ativo"
            />
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              variant="ghost"
              leftIcon={<Play size={16} />}
              onClick={handleOpenTestModal}
              disabled={!formData.system_prompt || !formData.user_prompt_template}
            >
              Testar Prompt
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={createPrompt.isPending || updatePrompt.isPending}
              disabled={!formData.key || !formData.name || !formData.system_prompt}
            >
              {editingPrompt ? 'Salvar' : 'Criar Prompt'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Test Prompt Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={handleCloseTestModal}
        title="Testar Prompt"
        size="lg"
      >
        <div className={styles.modalContent}>
          <p className={styles.testDescription}>
            Preencha as variaveis abaixo e clique em "Executar" para testar o prompt.
          </p>

          {Object.keys(testVariables).length > 0 ? (
            <div className={styles.variablesSection}>
              <h4 className={styles.variablesTitle}>Variaveis</h4>
              {Object.keys(testVariables).map((varName) => {
                const definedVar = formData.variables?.find((v) => v.name === varName)
                const isTextarea = definedVar?.type === 'textarea'
                return (
                  <div key={varName} className={styles.formGroup}>
                    <label className={styles.label}>
                      {definedVar?.label || varName}
                      <code className={styles.varCode}>{`{{${varName}}}`}</code>
                    </label>
                    {isTextarea ? (
                      <textarea
                        value={testVariables[varName]}
                        onChange={(e) =>
                          setTestVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                        }
                        className={styles.textarea}
                        rows={3}
                        placeholder={`Valor para ${varName}`}
                      />
                    ) : (
                      <input
                        type={definedVar?.type === 'number' ? 'number' : 'text'}
                        value={testVariables[varName]}
                        onChange={(e) =>
                          setTestVariables((prev) => ({ ...prev, [varName]: e.target.value }))
                        }
                        className={styles.input}
                        placeholder={`Valor para ${varName}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className={styles.noVariables}>
              Este prompt nao possui variaveis dinamicas.
            </p>
          )}

          {testResult && (
            <div className={styles.testResultSection}>
              <div className={styles.testResultHeader}>
                <h4 className={styles.testResultTitle}>Resultado</h4>
                <div className={styles.testMeta}>
                  <span className={styles.testMetaItem}>
                    Provider: <strong>{testResult.provider}</strong>
                  </span>
                  <span className={styles.testMetaItem}>
                    Modelo: <strong>{testResult.model}</strong>
                  </span>
                  <span className={styles.testMetaItem}>
                    Tempo: <strong>{testResult.processingTime}ms</strong>
                  </span>
                  {testResult.tokensUsed && (
                    <span className={styles.testMetaItem}>
                      Tokens: <strong>{testResult.tokensUsed.total}</strong>
                    </span>
                  )}
                </div>
              </div>
              <pre className={styles.testOutput}>{testResult.output}</pre>
            </div>
          )}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={handleCloseTestModal}>
              Fechar
            </Button>
            <Button
              onClick={handleRunTest}
              isLoading={testPrompt.isPending}
              leftIcon={<Play size={16} />}
            >
              Executar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setPromptToDelete(null)
        }}
        title="Excluir Prompt"
        size="sm"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Tem certeza que deseja excluir o prompt <strong>{promptToDelete?.name}</strong>?
          </p>
          <p className={styles.modalWarning}>
            Key: <code>{promptToDelete?.key}</code>
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setPromptToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeletePrompt}
              isLoading={deletePrompt.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
