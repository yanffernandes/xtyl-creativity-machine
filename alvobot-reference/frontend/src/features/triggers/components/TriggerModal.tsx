import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'
import { useFlows } from '@/features/flows/api/useFlows'
import { useActiveMetaPages } from '@/features/runs/api/useMetaPages'
import { Button, Input, Modal, Spinner, SearchableSelect, Checkbox, Select } from '@/shared/components'
import styles from './TriggerModal.module.css'
import { useCreateTrigger, useUpdateTrigger, type CreateTriggerInput, type UpdateTriggerInput } from '../api/mutations'
import type { MessageTrigger, TriggerType } from '../api/useTriggers'

interface TriggerModalProps {
  isOpen: boolean
  onClose: () => void
  trigger?: MessageTrigger | null // If provided, it's edit mode
}

const triggerTypeOptions: Array<{ value: TriggerType; label: string }> = [
  { value: 'any_message', label: 'Qualquer mensagem' },
  { value: 'keywords', label: 'Palavras-chave' },
]

export function TriggerModal({ isOpen, onClose, trigger }: TriggerModalProps) {
  const isEditMode = !!trigger

  // Form state
  const [title, setTitle] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('any_message')
  const [flowId, setFlowId] = useState<string>('')
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [keywords, setKeywords] = useState('')
  const [cooldownMinutes, setCooldownMinutes] = useState<string>('')
  const [maxTriggersPerUser, setMaxTriggersPerUser] = useState<string>('')

  // Modal filters
  const [pageSearchFilter, setPageSearchFilter] = useState('')
  const [connectionFilter, setConnectionFilter] = useState<string>('')

  // Queries
  const { data: flows = [] } = useFlows({ status: 'active' })
  const { data: metaPages = [], isLoading: isLoadingPages } = useActiveMetaPages()

  // Get unique connections for filter dropdown
  const uniqueConnections = useMemo(() => {
    const connectionsMap = new Map<string, { id: string; name: string }>()
    metaPages.forEach(page => {
      if (page.connection?.id && page.connection?.connection_name) {
        connectionsMap.set(page.connection.id, {
          id: page.connection.id,
          name: page.connection.connection_name
        })
      }
    })
    return Array.from(connectionsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [metaPages])

  // Filter and deduplicate pages based on filters
  const filteredPages = useMemo(() => {
    let pages = [...metaPages]

    // If connection filter is set, show all pages from that connection (no dedup)
    if (connectionFilter) {
      pages = pages.filter(p => p.connection?.id === connectionFilter)
    } else {
      // No connection filter: deduplicate by page_id, keeping most recent
      const pageMap = new Map<string, typeof pages[0]>()
      // Sort by created_at descending to get most recent first
      const sortedPages = [...pages].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      sortedPages.forEach(page => {
        if (!pageMap.has(page.page_id)) {
          pageMap.set(page.page_id, page)
        }
      })
      pages = Array.from(pageMap.values())
    }

    // Apply name search filter
    if (pageSearchFilter) {
      const searchLower = pageSearchFilter.toLowerCase()
      pages = pages.filter(p =>
        p.page_name.toLowerCase().includes(searchLower)
      )
    }

    // Sort alphabetically by name
    return pages.sort((a, b) => a.page_name.localeCompare(b.page_name))
  }, [metaPages, connectionFilter, pageSearchFilter])

  // Check if all filtered pages are selected (using page_id which is Facebook ID)
  const allFilteredSelected = filteredPages.length > 0 &&
    filteredPages.every(p => selectedPageIds.includes(p.page_id))

  // Mutations
  const createMutation = useCreateTrigger()
  const updateMutation = useUpdateTrigger()

  const isPending = createMutation.isPending || updateMutation.isPending

  // Initialize form when editing
  useEffect(() => {
    if (trigger) {
      setTitle(trigger.title || '')
      setTriggerType(trigger.trigger_type || 'any_message')
      setFlowId(trigger.flow_id || '')
      setSelectedPageIds(trigger.page_ids || [])
      setKeywords(trigger.trigger_keywords?.join(', ') || '')
      setCooldownMinutes(trigger.cooldown_minutes?.toString() || '')
      setMaxTriggersPerUser(trigger.max_triggers_per_user?.toString() || '')
    } else {
      // Reset form for new trigger
      setTitle('')
      setTriggerType('any_message')
      setFlowId('')
      setSelectedPageIds([])
      setKeywords('')
      setCooldownMinutes('')
      setMaxTriggersPerUser('')
    }
    // Reset filters when modal opens
    setPageSearchFilter('')
    setConnectionFilter('')
  }, [trigger, isOpen])

  const handlePageToggle = (pageId: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(pageId)
        ? prev.filter((id) => id !== pageId)
        : [...prev, pageId]
    )
  }

  // Select/deselect all filtered pages (using page_id which is Facebook ID)
  const toggleAllFilteredPages = () => {
    const filteredIds = filteredPages.map(p => p.page_id)
    const allSelected = filteredIds.every(id => selectedPageIds.includes(id))

    if (allSelected) {
      // Deselect all filtered pages
      setSelectedPageIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      // Select all filtered pages (add to existing selection)
      setSelectedPageIds(prev => {
        const newSelection = new Set(prev)
        filteredIds.forEach(id => newSelection.add(id))
        return Array.from(newSelection)
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const keywordsArray = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    const baseInput = {
      title,
      trigger_type: triggerType,
      flow_id: flowId || undefined,
      page_ids: selectedPageIds.length > 0 ? selectedPageIds : undefined,
      trigger_keywords: triggerType === 'keywords' ? keywordsArray : undefined,
      cooldown_minutes: cooldownMinutes ? parseInt(cooldownMinutes, 10) : undefined,
      max_triggers_per_user: maxTriggersPerUser ? parseInt(maxTriggersPerUser, 10) : undefined,
    }

    try {
      if (isEditMode && trigger) {
        await updateMutation.mutateAsync({
          id: trigger.id,
          ...baseInput,
        } as UpdateTriggerInput & { id: number })
      } else {
        await createMutation.mutateAsync(baseInput as CreateTriggerInput)
      }
      onClose()
    } catch (err) {
      console.error('Error saving trigger:', err)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar Acionador' : 'Novo Acionador'}
      size="md"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <Input
            label="Nome do Acionador *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Mensagem de boas-vindas"
            required
          />
        </div>

        <div className={styles.field}>
          <Select
            label="Tipo de Acionador *"
            options={triggerTypeOptions}
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            required
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Páginas do Meta *</span>
          <span className={styles.hint}>Selecione as páginas que vão acionar este trigger</span>

          {/* Filters row */}
          {metaPages.length > 0 && (
            <div className={styles.pagesFilters}>
              <Input
                placeholder="Buscar página..."
                value={pageSearchFilter}
                onChange={(e) => setPageSearchFilter(e.target.value)}
                className={styles.pageSearchWrapper}
                leftIcon={<Search size={16} />}
                size="md"
              />
              <div className={styles.connectionFilterWrapper}>
                <Filter size={16} className={styles.connectionFilterIcon} />
                <select
                  value={connectionFilter}
                  onChange={(e) => setConnectionFilter(e.target.value)}
                  className={styles.connectionFilterSelect}
                >
                  <option value="">Todas as conexões</option>
                  {uniqueConnections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className={styles.pagesContainer}>
            {isLoadingPages ? (
              <div className={styles.loadingPages}>
                <Spinner size="sm" />
                <span>Carregando páginas...</span>
              </div>
            ) : metaPages.length === 0 ? (
              <div className={styles.noPages}>
                <ImageIcon size={20} />
                <span>Nenhuma página do Meta conectada</span>
              </div>
            ) : filteredPages.length === 0 ? (
              <div className={styles.noPages}>
                <span>Nenhuma página encontrada com os filtros aplicados.</span>
              </div>
            ) : (
              <>
                <div className={styles.pagesSelectHeader}>
                  <span className={styles.pagesSelectCount}>
                    {selectedPageIds.length} selecionada(s)
                    {(pageSearchFilter || connectionFilter) && (
                      <span className={styles.filteredCount}>
                        {' '}• {filteredPages.length} exibida(s)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={styles.selectAllBtn}
                    onClick={toggleAllFilteredPages}
                  >
                    {allFilteredSelected ? 'Desmarcar exibidas' : 'Selecionar exibidas'}
                  </button>
                </div>
                <div className={styles.pagesList}>
                  {filteredPages.map((page) => (
                      <div
                        key={page.id}
                        className={`${styles.pageItem} ${selectedPageIds.includes(page.page_id) ? styles.selected : ''}`}
                        onClick={() => handlePageToggle(page.page_id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            handlePageToggle(page.page_id)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedPageIds.includes(page.page_id)}
                      >
                        <Checkbox
                          checked={selectedPageIds.includes(page.page_id)}
                          className={styles.pageCheckbox}
                        />
                        {page.image ? (
                          <>
                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                            <img
                              src={page.image}
                              alt={page.page_name}
                              className={styles.pageImage}
                              onError={(e) => {
                                // Fallback to placeholder on image load error
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove(styles.hidden)
                              }}
                            />
                          </>
                        ) : null}
                        <div className={`${styles.pageImagePlaceholder} ${page.image ? styles.hidden : ''}`}>
                          <ImageIcon size={20} />
                        </div>
                        <div className={styles.pageInfo}>
                          <span className={styles.pageName}>{page.page_name}</span>
                          <span className={styles.pageConnection}>
                            <LinkIcon size={10} />
                            {page.connection?.connection_name || 'Conexão não encontrada'}
                          </span>
                        </div>
                        <span className={`${styles.pageStatus} ${page.is_active ? styles.pageStatusActive : styles.pageStatusInactive}`}>
                          {page.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <SearchableSelect
            label="Fluxo Vinculado"
            options={flows.map((flow) => ({ value: flow.id, label: flow.name }))}
            value={flowId}
            onChange={setFlowId}
            placeholder="Nenhum fluxo selecionado"
            searchPlaceholder="Buscar fluxo..."
            emptyMessage="Nenhum fluxo ativo encontrado. Crie e ative um fluxo primeiro."
            noResultsMessage="Nenhum fluxo encontrado"
            fullWidth
          />
          <span className={styles.hint}>Selecione o fluxo que será executado</span>
        </div>

        {triggerType === 'keywords' && (
          <div className={styles.field}>
            <Input
              label="Palavras-chave *"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Ex: oi, ola, bom dia"
            />
            <span className={styles.hint}>Separe as palavras-chave por virgula</span>
          </div>
        )}

        <div className={styles.row}>
          <div className={styles.field}>
            <Input
              label="Cooldown (minutos)"
              type="number"
              min="0"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(e.target.value)}
              placeholder="Sem limite"
            />
            <span className={styles.hint}>Tempo minimo entre acionamentos. Vazio = sem espera</span>
          </div>

          <div className={styles.field}>
            <Input
              label="Max. por usuario"
              type="number"
              min="0"
              value={maxTriggersPerUser}
              onChange={(e) => setMaxTriggersPerUser(e.target.value)}
              placeholder="Sem limite"
            />
            <span className={styles.hint}>Limite de acionamentos por usuario. Vazio = ilimitado</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isPending}>
            {isEditMode ? 'Salvar' : 'Criar Acionador'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
