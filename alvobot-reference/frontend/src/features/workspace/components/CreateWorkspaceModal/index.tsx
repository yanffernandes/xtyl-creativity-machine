import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { Alert } from '@/shared/components/Alert'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Textarea } from '@/shared/components/Textarea'
import styles from './CreateWorkspaceModal.module.css'
import { useCreateWorkspace } from '../../api/mutations'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createWorkspace = useCreateWorkspace()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('O nome do workspace é obrigatório')
      return
    }

    if (name.trim().length < 2) {
      setError('O nome deve ter pelo menos 2 caracteres')
      return
    }

    try {
      await createWorkspace.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      handleClose()
      onSuccess?.()
    } catch (err) {
      console.error('Failed to create workspace:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar workspace. Tente novamente.')
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setError(null)
    createWorkspace.reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Building2 size={32} />
          </div>
          <h2 className={styles.title}>Criar novo workspace</h2>
          <p className={styles.subtitle}>
            Workspaces permitem organizar projetos e colaborar com sua equipe
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <Alert variant="error" className={styles.alert}>
              {error}
            </Alert>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="workspace-name" className={styles.label}>
              Nome do workspace <span className={styles.required}>*</span>
            </label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Minha Empresa, Projeto X, Time de Marketing..."
              autoFocus
              maxLength={100}
            />
            <span className={styles.hint}>
              {name.length}/100 caracteres
            </span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="workspace-description" className={styles.label}>
              Descrição <span className={styles.optional}>(opcional)</span>
            </label>
            <Textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste workspace..."
              rows={3}
              maxLength={500}
            />
            <span className={styles.hint}>
              {description.length}/500 caracteres
            </span>
          </div>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={createWorkspace.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createWorkspace.isPending}
              isLoading={createWorkspace.isPending}
            >
              Criar workspace
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
