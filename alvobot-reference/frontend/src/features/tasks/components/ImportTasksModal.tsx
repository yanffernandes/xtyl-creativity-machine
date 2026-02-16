import { useState, useEffect } from 'react'
import { Download, CheckCircle, AlertCircle } from 'lucide-react'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, SearchableSelect, Modal } from '@/shared/components'
import { useImportTasks } from '../api/useImportTasks'
import { IMPORT_PHASES } from '../constants'
import styles from './ImportTasksModal.module.css'
import type { ImportPhase } from '../types'

interface ImportTasksModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (count: number) => void
}

export function ImportTasksModal({ isOpen, onClose, onSuccess }: ImportTasksModalProps) {
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedPhase, setSelectedPhase] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: projects, isLoading: projectsLoading } = useProjects()
  const importMutation = useImportTasks()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedProject('')
      setSelectedPhase('')
      setSuccessMessage(null)
      setErrorMessage(null)
    }
  }, [isOpen])

  const projectOptions = projects?.map((p) => ({ value: String(p.id), label: p.name })) || []

  const phaseOptions = IMPORT_PHASES.map((p) => ({ value: p.value, label: p.label }))

  const canSubmit = selectedProject && selectedPhase && !importMutation.isPending

  const handleSubmit = async () => {
    if (!selectedProject || !selectedPhase) return

    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const result = await importMutation.mutateAsync({
        project_id: Number(selectedProject),
        phase: selectedPhase as ImportPhase,
      })

      if (result.success) {
        setSuccessMessage(result.message)
        onSuccess?.(result.count)
        // Close modal after a short delay to show success message
        setTimeout(() => {
          handleClose()
        }, 1500)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao importar tarefas'
      setErrorMessage(errorMsg)
    }
  }

  const handleClose = () => {
    setSelectedProject('')
    setSelectedPhase('')
    setSuccessMessage(null)
    setErrorMessage(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="md"
    >
      <div className={styles.form}>
        <div className={styles.title}>
          Selecione o projeto e o estágio que deseja importar
          <span className={styles.titleIcon}>↓</span>
        </div>

        <div className={styles.field}>
          <SearchableSelect
            label="Projeto"
            options={projectOptions}
            value={selectedProject}
            onChange={setSelectedProject}
            placeholder="Selecione um projeto"
            searchPlaceholder="Buscar projeto..."
            isLoading={projectsLoading}
            emptyMessage="Nenhum projeto encontrado"
            noResultsMessage="Nenhum projeto encontrado para esta busca"
            fullWidth
          />
        </div>

        <div className={styles.field}>
          <SearchableSelect
            label="Escolha a fase"
            options={phaseOptions}
            value={selectedPhase}
            onChange={setSelectedPhase}
            placeholder="Selecione uma fase"
            searchPlaceholder="Buscar fase..."
            emptyMessage="Nenhuma fase disponível"
            noResultsMessage="Nenhuma fase encontrada para esta busca"
            fullWidth
          />
        </div>

        {successMessage && (
          <div className={styles.successMessage}>
            <CheckCircle size={18} />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className={styles.errorMessage}>
            <AlertCircle size={18} />
            {errorMessage}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            className={styles.importButton}
            leftIcon={<Download size={18} />}
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={importMutation.isPending}
          >
            + Importar Tarefas
          </Button>
        </div>
      </div>
    </Modal>
  )
}
