import { useState } from 'react'
import {
  Search,
  Plus,
  Zap,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Edit,
  Trash2,
  Calendar,
  FileText,
  RefreshCw,
  Key,
} from 'lucide-react'
import { Button, Input, Spinner, EmptyState, Alert, Modal } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useToggleTriggerStatus, useDeleteTrigger } from '../api/mutations'
import {
  useTriggers,
  useTriggerStats,
  getTriggerTypeLabel,
  type TriggerType,
  type TriggerStatus,
  type MessageTrigger,
} from '../api/useTriggers'
import { TriggerModal } from '../components'
import styles from './TriggersPage.module.css'

const typeIconMap: Record<TriggerType, typeof Zap> = {
  any_message: Zap,
  keywords: Key,
  schedule: Calendar,
  event: Zap,
  webhook: RefreshCw,
  manual: Play,
  keyword: Key,
}

export function TriggersPage() {
  useDocumentTitle('Acionadores')
  const [search, setSearch] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [triggerToDelete, setTriggerToDelete] = useState<MessageTrigger | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [triggerToEdit, setTriggerToEdit] = useState<MessageTrigger | null>(null)

  // Queries
  const { data: triggers = [], isLoading, error } = useTriggers({ search })
  const { data: stats } = useTriggerStats()

  // Mutations
  const toggleStatusMutation = useToggleTriggerStatus()
  const deleteMutation = useDeleteTrigger()

  const getStatusBadge = (status: TriggerStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            <CheckCircle size={14} /> Ativo
          </span>
        )
      case 'paused':
        return (
          <span className={`${styles.badge} ${styles.badgeWarning}`}>
            <Pause size={14} /> Pausado
          </span>
        )
      case 'error':
        return (
          <span className={`${styles.badge} ${styles.badgeDanger}`}>
            <XCircle size={14} /> Erro
          </span>
        )
      default:
        return null
    }
  }

  const getTypeIcon = (type: TriggerType) => {
    const Icon = typeIconMap[type] || Zap
    return <Icon size={16} />
  }

  const getTypeClassName = (type: TriggerType): string => {
    const typeMap: Record<TriggerType, string> = {
      any_message: styles.typeEvent,
      keywords: styles.typeKeyword,
      schedule: styles.typeSchedule,
      event: styles.typeEvent,
      webhook: styles.typeWebhook,
      manual: styles.typeManual,
      keyword: styles.typeKeyword,
    }
    return typeMap[type] || styles.typeEvent
  }

  const getFlowName = (trigger: MessageTrigger): string => {
    if (!trigger.flow) return 'Fluxo nao vinculado'
    return trigger.flow.name
  }

  const handleToggleStatus = async (trigger: MessageTrigger) => {
    const newStatus: TriggerStatus = trigger.status === 'active' ? 'paused' : 'active'
    try {
      await toggleStatusMutation.mutateAsync({ id: trigger.id, status: newStatus })
    } catch (err) {
      console.error('Error toggling trigger status:', err)
    }
  }

  const handleDelete = async () => {
    if (!triggerToDelete) return
    try {
      await deleteMutation.mutateAsync({ id: triggerToDelete.id, title: triggerToDelete.title })
      setDeleteModalOpen(false)
      setTriggerToDelete(null)
    } catch (err) {
      console.error('Error deleting trigger:', err)
    }
  }

  const openDeleteModal = (trigger: MessageTrigger) => {
    setTriggerToDelete(trigger)
    setDeleteModalOpen(true)
  }

  const openEditModal = (trigger: MessageTrigger) => {
    setTriggerToEdit(trigger)
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    setTriggerToEdit(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Zap size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Acionadores</h1>
            <p className={styles.subtitle}>Configure gatilhos para executar seus fluxos automaticamente</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setCreateModalOpen(true)}>
          Novo Acionador
        </Button>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar acionadores: {error.message}
        </Alert>
      )}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <Zap size={24} className={styles.statIconActive} />
          <div>
            <span className={styles.statValue}>{stats?.active ?? 0}</span>
            <span className={styles.statLabel}>Ativos</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Pause size={24} className={styles.statIconPaused} />
          <div>
            <span className={styles.statValue}>{stats?.paused ?? 0}</span>
            <span className={styles.statLabel}>Pausados</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <XCircle size={24} className={styles.statIconError} />
          <div>
            <span className={styles.statValue}>{stats?.error ?? 0}</span>
            <span className={styles.statLabel}>Com Erro</span>
          </div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar acionadores..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : triggers.length === 0 ? (
        <EmptyState
          icon={<Zap size={48} />}
          title="Nenhum acionador encontrado"
          description={
            search
              ? 'Tente ajustar sua busca'
              : 'Crie seu primeiro acionador para automatizar a execucao dos seus fluxos'
          }
          action={
            !search && (
              <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setCreateModalOpen(true)}>
                Criar Acionador
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.list}>
          {triggers.map((trigger) => (
            <div key={trigger.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <div className={`${styles.typeIcon} ${getTypeClassName(trigger.trigger_type)}`}>
                  {getTypeIcon(trigger.trigger_type)}
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{trigger.title}</h3>
                    {getStatusBadge(trigger.status)}
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.typeLabel}>
                      {getTriggerTypeLabel(trigger.trigger_type)}
                    </span>
                    <span>•</span>
                    <span className={styles.flowName}>
                      <FileText size={14} />
                      {getFlowName(trigger)}
                    </span>
                  </div>
                  {trigger.trigger_keywords && trigger.trigger_keywords.length > 0 && (
                    <div className={styles.keywords}>
                      <Key size={14} />
                      {trigger.trigger_keywords.slice(0, 3).join(', ')}
                      {trigger.trigger_keywords.length > 3 &&
                        ` +${trigger.trigger_keywords.length - 3}`}
                    </div>
                  )}
                  <div className={styles.runInfo}>
                    {trigger.cooldown_minutes && (
                      <span>Cooldown: {trigger.cooldown_minutes} min</span>
                    )}
                    {trigger.max_triggers_per_user && (
                      <span>Max. por usuario: {trigger.max_triggers_per_user}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                {trigger.status === 'active' ? (
                  <button
                    className={styles.actionBtn}
                    title="Pausar"
                    onClick={() => handleToggleStatus(trigger)}
                    disabled={toggleStatusMutation.isPending}
                  >
                    <Pause size={16} />
                  </button>
                ) : (
                  <button
                    className={styles.actionBtn}
                    title="Ativar"
                    onClick={() => handleToggleStatus(trigger)}
                    disabled={toggleStatusMutation.isPending}
                  >
                    <Play size={16} />
                  </button>
                )}
                <button
                  className={styles.actionBtn}
                  title="Editar"
                  onClick={() => openEditModal(trigger)}
                >
                  <Edit size={16} />
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.danger}`}
                  title="Excluir"
                  onClick={() => openDeleteModal(trigger)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Trigger Modal */}
      <TriggerModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Edit Trigger Modal */}
      <TriggerModal
        isOpen={editModalOpen}
        onClose={closeEditModal}
        trigger={triggerToEdit}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setTriggerToDelete(null)
        }}
        title="Excluir Acionador"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir o acionador{' '}
            <strong>{triggerToDelete?.title}</strong>?
          </p>
          <p className={styles.deleteWarning}>Esta acao nao pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setTriggerToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
