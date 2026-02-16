import { useState } from 'react'
import { Plus, Search, Workflow, Play, Pause, Edit2, Trash2, CheckCircle, PauseCircle, GitBranch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Input, Modal, Spinner, EmptyState, Alert, SearchableSelect } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './FlowsPage.module.css'
import { useCreateFlow, useDeleteFlow, useUpdateFlow } from '../api/mutations'
import { useFlows } from '../api/useFlows'
import type { Flow } from '../types'

const statusConfig = {
  active: { label: 'Ativo', color: '#059669', bgColor: '#D1FAE5', icon: CheckCircle, accentColor: '#10B981' },
  paused: { label: 'Pausado', color: '#D97706', bgColor: '#FEF3C7', icon: PauseCircle, accentColor: '#F59E0B' },
}

export function FlowsPage() {
  useDocumentTitle('Meus Fluxos')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newFlowName, setNewFlowName] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [deletingFlow, setDeletingFlow] = useState<Flow | null>(null)

  const { data: flows, isLoading, error } = useFlows({ search })
  const { data: projects = [] } = useProjects()
  const createMutation = useCreateFlow()
  const updateMutation = useUpdateFlow()
  const deleteMutation = useDeleteFlow()

  const handleCreate = async () => {
    if (!newFlowName.trim() || !selectedProjectId) return

    const flow = await createMutation.mutateAsync({
      name: newFlowName,
      project_id: parseInt(selectedProjectId, 10),
    })
    setNewFlowName('')
    setSelectedProjectId('')
    setIsModalOpen(false)
    navigate(`/flows/${flow.id}`)
  }

  const handleToggleActive = async (flow: Flow) => {
    await updateMutation.mutateAsync({ id: flow.id, is_active: !flow.is_active })
  }

  const confirmDelete = async () => {
    if (deletingFlow) {
      await deleteMutation.mutateAsync({ id: deletingFlow.id, name: deletingFlow.name })
      setDeletingFlow(null)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <GitBranch size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Fluxos</h1>
            <p className={styles.subtitle}>Automatize suas tarefas</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
          Novo fluxo
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar fluxos..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar fluxos: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : flows?.length === 0 ? (
        <EmptyState
          icon={<Workflow size={48} />}
          title="Nenhum fluxo encontrado"
          description={search ? 'Tente uma busca diferente' : 'Crie seu primeiro fluxo para começar'}
          action={
            !search && (
              <Button leftIcon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>
                Criar fluxo
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.list}>
          {flows?.map((flow) => {
            const status = flow.is_active ? statusConfig.active : statusConfig.paused
            const StatusIcon = status.icon
            return (
              <div
                key={flow.id}
                className={styles.row}
                style={{ borderLeftColor: status.accentColor }}
              >
                <div className={styles.rowMain}>
                  {/* Left: Status + Info */}
                  <div className={styles.rowInfo}>
                    <span
                      className={styles.statusBadge}
                      style={{ color: status.color, backgroundColor: status.bgColor }}
                    >
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                    <div className={styles.rowTitle}>
                      <span className={styles.flowName}>{flow.name}</span>
                      <span className={styles.flowMeta}>
                        {flow.nodes?.length || 0} nós • Atualizado em {new Date(flow.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className={styles.rowActions}>
                    <button
                      className={styles.editBtn}
                      onClick={() => navigate(`/flows/${flow.id}`)}
                    >
                      <Edit2 size={14} />
                      Editar
                    </button>

                    {flow.is_active ? (
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleToggleActive(flow)}
                        title="Pausar"
                      >
                        <Pause size={16} />
                      </button>
                    ) : (
                      <button
                        className={`${styles.actionBtn} ${styles.actionPlay}`}
                        onClick={() => handleToggleActive(flow)}
                        title="Ativar"
                      >
                        <Play size={16} />
                      </button>
                    )}

                    <button
                      className={`${styles.actionBtn} ${styles.actionDelete}`}
                      onClick={() => setDeletingFlow(flow)}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {flow.description && (
                  <p className={styles.rowDescription}>{flow.description}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Flow Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setNewFlowName('')
          setSelectedProjectId('')
        }}
        title="Novo fluxo"
        size="sm"
      >
        <div className={styles.createForm}>
          <SearchableSelect
            label="Projeto"
            options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            placeholder="Selecione um projeto..."
            searchPlaceholder="Buscar projeto..."
            emptyMessage="Nenhum projeto encontrado. Crie um projeto primeiro."
            noResultsMessage="Nenhum projeto encontrado"
            fullWidth
          />
          <Input
            label="Nome do fluxo"
            placeholder="Ex: Publicar artigo automaticamente"
            value={newFlowName}
            onChange={(e) => setNewFlowName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && selectedProjectId && handleCreate()}
            fullWidth
          />
          <div className={styles.createActions}>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false)
                setNewFlowName('')
                setSelectedProjectId('')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={createMutation.isPending}
              disabled={!newFlowName.trim() || !selectedProjectId}
            >
              Criar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingFlow}
        onClose={() => setDeletingFlow(null)}
        title="Excluir fluxo"
        size="sm"
      >
        <p className={styles.deleteMessage}>
          Tem certeza que deseja excluir o fluxo <strong>{deletingFlow?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className={styles.deleteActions}>
          <Button variant="outline" onClick={() => setDeletingFlow(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
