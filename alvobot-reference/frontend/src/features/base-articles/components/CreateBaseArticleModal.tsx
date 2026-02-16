import { useState, useEffect } from 'react'
import { Plus, Calendar, AlertCircle } from 'lucide-react'
import { useUserCredits } from '@/features/auth/api/useUserPlan'
import { useProjects } from '@/features/projects/api/useProjects'
import { Modal, Button, Input, SearchableSelect, Textarea, Alert } from '@/shared/components'
import styles from './CreateBaseArticleModal.module.css'
import { useCreateBaseArticle } from '../api/mutations'

interface CreateBaseArticleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (articleId: number) => void
}

export function CreateBaseArticleModal({ isOpen, onClose, onSuccess }: CreateBaseArticleModalProps) {
  const [projectId, setProjectId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const createMutation = useCreateBaseArticle()
  const { data: credits, isLoading: creditsLoading } = useUserCredits()

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setProjectId('')
      setScheduledDate('')
      setTitle('')
      setDescription('')
      setError(null)
    }
  }, [isOpen])

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))

  const handleClose = () => {
    setProjectId('')
    setScheduledDate('')
    setTitle('')
    setDescription('')
    setError(null)
    onClose()
  }

  // Check if user has reached credit limit
  const hasReachedLimit = credits ? credits.remaining <= 0 : false
  const hasNoPlan = credits ? !credits.hasActivePlan : true

  const handleSubmit = async () => {
    if (!projectId) {
      setError('Selecione um projeto')
      return
    }
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

    setError(null)

    try {
      const result = await createMutation.mutateAsync({
        title: title.trim(),
        project_id: Number(projectId),
        excerpt: description.trim() || undefined,
        date: scheduledDate || undefined,
      })

      handleClose()
      onSuccess?.(result.id)
    } catch {
      setError('Erro ao criar artigo. Tente novamente.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            Siga os passos abaixo para gerar seu artigo <span className={styles.arrow}>↓</span>
          </h2>
        </div>

        {error && (
          <Alert variant="error" className={styles.alert}>
            {error}
          </Alert>
        )}

        <div className={styles.step}>
          <p className={styles.stepLabel}>Passo 1: Selecione o projeto e escolha a data de publicação:</p>
          <div className={styles.stepRow}>
            <div className={styles.projectSelectWrapper}>
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
                placeholder="Seleciona a data"
                className={styles.dateInput}
                rightIcon={<Calendar size={18} />}
              />
            </div>
          </div>
        </div>

        <div className={styles.step}>
          <p className={styles.stepLabel}>Passo 2: Defina o título e descrição:</p>
          <div className={styles.inputWrapper}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do artigo"
              maxLength={65}
              className={styles.titleInput}
            />
            <span className={styles.charCount}>{title.length}/65</span>
          </div>
          <div className={styles.textareaWrapper}>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do artigo (Opcional)"
              maxLength={160}
              rows={3}
              className={styles.descriptionInput}
            />
            <span className={styles.charCount}>{description.length}/160</span>
          </div>
          <p className={styles.hint}>A IA usará todos os campos preenchidos para criar o artigo.</p>
        </div>

        {/* Credit limit warning */}
        {hasReachedLimit && (
          <Alert variant="warning" className={styles.alert}>
            <AlertCircle size={16} />
            <span>Você atingiu o limite de artigos deste ciclo. Aguarde o próximo ciclo ou faça upgrade do plano.</span>
          </Alert>
        )}

        {hasNoPlan && !creditsLoading && (
          <Alert variant="warning" className={styles.alert}>
            <AlertCircle size={16} />
            <span>Você não possui um plano ativo. Assine um plano para criar artigos.</span>
          </Alert>
        )}

        <div className={styles.footer}>
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
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={createMutation.isPending}
            leftIcon={<Plus size={18} />}
            disabled={hasReachedLimit || hasNoPlan}
          >
            Gerar Novo Artigo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
