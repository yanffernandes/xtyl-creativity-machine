import { useState } from 'react'
import { Layers, Send, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Select, Spinner, EmptyState, Alert, Modal } from '@/shared/components'
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateAuthor,
  useUpdateAuthor,
  useDeleteAuthor,
  useSubmitForApproval,
} from '../api/mutations'
import { useBaseStructure } from '../api/useBaseStructure'
import {
  LayerSection,
  CategoryModal,
  AuthorModal,
  ValidationChecklist,
  canSubmitForApproval,
} from '../components'
import styles from './BaseStructurePage.module.css'
import type {
  BaseStructureCategory,
  BaseStructureAuthor,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateAuthorInput,
  UpdateAuthorInput,
} from '../types'

type ModalType = 'category' | 'author' | 'deleteCategory' | 'deleteAuthor' | 'submitApproval' | null

export function BaseStructurePage() {
  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null)
  const [editingCategory, setEditingCategory] = useState<BaseStructureCategory | null>(null)
  const [editingAuthor, setEditingAuthor] = useState<BaseStructureAuthor | null>(null)
  const [deletingItem, setDeletingItem] = useState<BaseStructureCategory | BaseStructureAuthor | null>(null)
  const [currentLayer, setCurrentLayer] = useState<1 | 2 | 3>(1)

  // Queries
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects()
  const { data: structure, isLoading: structureLoading, error: structureError } = useBaseStructure(selectedProjectId)

  // Mutations
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const createAuthor = useCreateAuthor()
  const updateAuthor = useUpdateAuthor()
  const deleteAuthor = useDeleteAuthor()
  const submitForApproval = useSubmitForApproval()

  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  // Handlers for categories
  const handleAddCategory = (layer: 1 | 2 | 3) => {
    setCurrentLayer(layer)
    setEditingCategory(null)
    setModalType('category')
  }

  const handleEditCategory = (category: BaseStructureCategory | BaseStructureAuthor) => {
    if ('layer' in category) {
      setCurrentLayer(category.layer)
      setEditingCategory(category)
      setModalType('category')
    }
  }

  const handleDeleteCategory = (category: BaseStructureCategory | BaseStructureAuthor) => {
    setDeletingItem(category)
    setModalType('layer' in category ? 'deleteCategory' : 'deleteAuthor')
  }

  const handleSaveCategory = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (!selectedProjectId) return

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          projectId: selectedProjectId,
          ...data,
        })
      } else {
        await createCategory.mutateAsync(data as CreateCategoryInput)
      }
      setModalType(null)
      setEditingCategory(null)
    } catch (error) {
      console.error('Error saving category:', error)
    }
  }

  const handleConfirmDeleteCategory = async () => {
    if (!selectedProjectId || !deletingItem || !('layer' in deletingItem)) return

    try {
      await deleteCategory.mutateAsync({
        id: deletingItem.id,
        projectId: selectedProjectId,
      })
      setModalType(null)
      setDeletingItem(null)
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  // Handlers for authors
  const handleAddAuthor = () => {
    setEditingAuthor(null)
    setModalType('author')
  }

  const handleEditAuthor = (author: BaseStructureCategory | BaseStructureAuthor) => {
    if ('display_name' in author) {
      setEditingAuthor(author)
      setModalType('author')
    }
  }

  const handleSaveAuthor = async (data: CreateAuthorInput | UpdateAuthorInput) => {
    if (!selectedProjectId) return

    try {
      if (editingAuthor) {
        await updateAuthor.mutateAsync({
          id: editingAuthor.id,
          projectId: selectedProjectId,
          ...data,
        })
      } else {
        await createAuthor.mutateAsync(data as CreateAuthorInput)
      }
      setModalType(null)
      setEditingAuthor(null)
    } catch (error) {
      console.error('Error saving author:', error)
    }
  }

  const handleConfirmDeleteAuthor = async () => {
    if (!selectedProjectId || !deletingItem || 'layer' in deletingItem) return

    try {
      await deleteAuthor.mutateAsync({
        id: deletingItem.id,
        projectId: selectedProjectId,
      })
      setModalType(null)
      setDeletingItem(null)
    } catch (error) {
      console.error('Error deleting author:', error)
    }
  }

  // Handler for approval submission
  const handleSubmitApproval = async () => {
    if (!selectedProjectId) return

    try {
      await submitForApproval.mutateAsync(selectedProjectId)
      setModalType(null)
    } catch (error) {
      console.error('Error submitting for approval:', error)
    }
  }

  // Approval status badge
  const getApprovalStatusBadge = () => {
    if (!structure) return null

    switch (structure.approval_status) {
      case 'approved':
        return (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle size={14} />
            Aprovado
          </span>
        )
      case 'pending':
        return (
          <span className={`${styles.statusBadge} ${styles.statusPending}`}>
            <Clock size={14} />
            Aguardando Aprovação
          </span>
        )
      case 'rejected':
        return (
          <span className={`${styles.statusBadge} ${styles.statusRejected}`}>
            <XCircle size={14} />
            Rejeitado
          </span>
        )
      default:
        return (
          <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
            <AlertTriangle size={14} />
            Rascunho
          </span>
        )
    }
  }

  const projectOptions = projects?.map((p) => ({
    value: String(p.id),
    label: p.name,
  })) || []

  const canSubmit = structure && canSubmitForApproval(structure) && structure.approval_status === 'draft'
  const isApproved = structure?.approval_status === 'approved'
  const isPending = structure?.approval_status === 'pending'

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Estrutura de Base</h1>
          <p className={styles.subtitle}>Configure as 4 camadas da estrutura do seu blog</p>
        </div>
        {selectedProjectId && structure && (
          <div className={styles.headerActions}>
            {getApprovalStatusBadge()}
            <Button
              variant="primary"
              onClick={() => setModalType('submitApproval')}
              disabled={!canSubmit || isPending}
            >
              <Send size={16} />
              Enviar para Aprovação
            </Button>
          </div>
        )}
      </div>

      {/* Project Selector */}
      <div className={styles.projectSelector}>
        {projectsLoading ? (
          <Spinner size="sm" />
        ) : projectsError ? (
          <Alert variant="error">Erro ao carregar projetos</Alert>
        ) : (
          <Select
            label="Selecione um projeto"
            options={projectOptions}
            placeholder="Escolha um projeto para configurar"
            value={selectedProjectId ? String(selectedProjectId) : ''}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
            fullWidth
          />
        )}
      </div>

      {structureError && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar estrutura: {structureError.message}
        </Alert>
      )}

      {structure?.rejection_reason && structure.approval_status === 'rejected' && (
        <Alert variant="warning" className={styles.alert}>
          <strong>Motivo da rejeição:</strong> {structure.rejection_reason}
        </Alert>
      )}

      {/* Content */}
      {!selectedProjectId ? (
        <EmptyState
          icon={<Layers size={48} />}
          title="Selecione um projeto"
          description="Escolha um projeto acima para configurar sua estrutura de 4 camadas"
        />
      ) : structureLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : structure ? (
        <div className={styles.content}>
          <div className={styles.layers}>
            {/* Layer 1: Categories */}
            <LayerSection
              title="Categorias Principais"
              description="As grandes áreas temáticas do seu blog"
              layerNumber={1}
              items={structure.categories}
              onAdd={() => handleAddCategory(1)}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              disabled={isApproved || isPending}
            />

            {/* Layer 2: Subcategories */}
            <LayerSection
              title="Subcategorias"
              description="Subdivisões das categorias principais"
              layerNumber={2}
              items={structure.subcategories}
              onAdd={() => handleAddCategory(2)}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              disabled={isApproved || isPending}
            />

            {/* Layer 3: Tags */}
            <LayerSection
              title="Tags / Tópicos"
              description="Temas específicos para organização de conteúdo"
              layerNumber={3}
              items={structure.tags}
              onAdd={() => handleAddCategory(3)}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              disabled={isApproved || isPending}
            />

            {/* Layer 4: Authors */}
            <LayerSection
              title="Autores"
              description="Perfis de autores para os artigos do blog"
              layerNumber={4}
              items={structure.authors}
              onAdd={handleAddAuthor}
              onEdit={handleEditAuthor}
              onDelete={handleDeleteCategory}
              disabled={isApproved || isPending}
            />
          </div>

          <div className={styles.sidebar}>
            <ValidationChecklist structure={structure} />
          </div>
        </div>
      ) : null}

      {/* Category Modal */}
      <CategoryModal
        isOpen={modalType === 'category'}
        onClose={() => {
          setModalType(null)
          setEditingCategory(null)
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        layer={currentLayer}
        projectId={selectedProjectId || 0}
        parentCategories={structure?.categories || []}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />

      {/* Author Modal */}
      <AuthorModal
        isOpen={modalType === 'author'}
        onClose={() => {
          setModalType(null)
          setEditingAuthor(null)
        }}
        onSave={handleSaveAuthor}
        author={editingAuthor}
        projectId={selectedProjectId || 0}
        isLoading={createAuthor.isPending || updateAuthor.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={modalType === 'deleteCategory' || modalType === 'deleteAuthor'}
        onClose={() => {
          setModalType(null)
          setDeletingItem(null)
        }}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir{' '}
            <strong>
              {deletingItem && 'name' in deletingItem
                ? deletingItem.name
                : deletingItem && 'display_name' in deletingItem
                ? (deletingItem as BaseStructureAuthor).display_name
                : ''}
            </strong>
            ?
          </p>
          <p className={styles.deleteWarning}>Esta ação não pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="ghost"
              onClick={() => {
                setModalType(null)
                setDeletingItem(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={modalType === 'deleteCategory' ? handleConfirmDeleteCategory : handleConfirmDeleteAuthor}
              disabled={deleteCategory.isPending || deleteAuthor.isPending}
            >
              {deleteCategory.isPending || deleteAuthor.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Approval Modal */}
      <Modal
        isOpen={modalType === 'submitApproval'}
        onClose={() => setModalType(null)}
        title="Enviar para Aprovação"
        size="lg"
      >
        <div className={styles.approvalModal}>
          <p>
            Você está prestes a enviar a estrutura de base do projeto{' '}
            <strong>{selectedProject?.name}</strong> para aprovação.
          </p>
          <p>
            Após enviado, você não poderá fazer alterações até que a estrutura seja aprovada ou
            rejeitada.
          </p>
          {structure && <ValidationChecklist structure={structure} />}
          <div className={styles.approvalActions}>
            <Button variant="ghost" onClick={() => setModalType(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitApproval}
              disabled={submitForApproval.isPending}
            >
              {submitForApproval.isPending ? 'Enviando...' : 'Confirmar Envio'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
