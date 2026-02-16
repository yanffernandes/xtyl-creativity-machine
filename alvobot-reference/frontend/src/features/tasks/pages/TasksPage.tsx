import { useState } from 'react'
import { Plus, Search, CheckSquare, LayoutGrid, Download } from 'lucide-react'
import { Button, Input, Modal, Spinner, EmptyState, Alert, showToast } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useCreateTask, useUpdateTask, useDeleteTask } from '../api/mutations'
import { useTasks } from '../api/useTasks'
import { KanbanBoard, TaskModal, ImportTasksModal } from '../components'
import styles from './TasksPage.module.css'
import type { Task, TaskStatus, CreateTaskInput } from '../types'

export function TasksPage() {
  useDocumentTitle('Minhas Tarefas')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('to_do')
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)

  const { data: tasks, isLoading, error } = useTasks({ search })
  const createMutation = useCreateTask()
  const updateMutation = useUpdateTask()
  const deleteMutation = useDeleteTask()

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null)
    setDefaultStatus(status)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setDefaultStatus(task.status)
    setIsModalOpen(true)
  }

  const handleDeleteTask = (task: Task) => {
    setDeletingTask(task)
  }

  const handleSubmit = async (data: CreateTaskInput) => {
    try {
      const isEditing = !!editingTask
      if (isEditing) {
        await updateMutation.mutateAsync({ id: editingTask.id, ...data })
      } else {
        await createMutation.mutateAsync(data)
      }
      setIsModalOpen(false)
      setEditingTask(null)
      showToast.success(isEditing ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!')
    } catch {
      showToast.error('Erro ao salvar tarefa', {
        description: 'Tente novamente mais tarde.',
      })
    }
  }

  const handleTaskMove = async (taskId: string, newStatus: TaskStatus, newIndex: number) => {
    await updateMutation.mutateAsync({
      id: taskId,
      status: newStatus,
      sort_order: newIndex,
    } as { id: string; status: TaskStatus })
  }

  const confirmDelete = async () => {
    if (deletingTask) {
      try {
        await deleteMutation.mutateAsync(deletingTask.id)
        showToast.success('Tarefa excluída com sucesso!')
        setDeletingTask(null)
      } catch {
        showToast.error('Erro ao excluir tarefa', {
          description: 'Tente novamente mais tarde.',
        })
      }
    }
  }

  const totalTasks = tasks?.length || 0
  const doneTasks = tasks?.filter((t) => t.status === 'done').length || 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Tarefas</h1>
            <p className={styles.subtitle}>Gerencie suas atividades com o Kanban</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.taskCount}>
            {doneTasks}/{totalTasks} concluídas
          </span>
          <Button
            variant="secondary"
            leftIcon={<Download size={18} />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Importar Tarefas
          </Button>
          <Button leftIcon={<Plus size={18} />} onClick={() => handleAddTask('to_do')}>
            Nova tarefa
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar tarefas..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar tarefas: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : tasks?.length === 0 && !search ? (
        <EmptyState
          icon={<CheckSquare size={48} />}
          title="Nenhuma tarefa encontrada"
          description="Crie sua primeira tarefa ou importe de um template"
          action={
            <div className={styles.emptyActions}>
              <Button leftIcon={<Plus size={18} />} onClick={() => handleAddTask('to_do')}>
                Criar tarefa
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Download size={18} />}
                onClick={() => setIsImportModalOpen(true)}
              >
                Importar Tarefas
              </Button>
            </div>
          }
        />
      ) : (
        <KanbanBoard
          tasks={tasks || []}
          onTaskMove={handleTaskMove}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onEditTask={handleEditTask}
        />
      )}

      {/* Create/Edit Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSubmit={handleSubmit}
        task={editingTask}
        defaultStatus={defaultStatus}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title="Excluir tarefa"
        size="sm"
      >
        <p className={styles.deleteMessage}>
          Tem certeza que deseja excluir a tarefa <strong>{deletingTask?.name}</strong>?
        </p>
        <div className={styles.deleteActions}>
          <Button variant="outline" onClick={() => setDeletingTask(null)}>
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

      {/* Import Tasks Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
