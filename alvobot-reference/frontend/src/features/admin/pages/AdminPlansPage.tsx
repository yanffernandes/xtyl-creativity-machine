import { useId, useState } from 'react'
import { CreditCard, Plus, Edit2, Trash2 } from 'lucide-react'
import { Button, Spinner, Modal, Input } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { supabase } from '@/shared/utils/supabase'
import styles from './AdminPlansPage.module.css'
import { useCreatePlan, useUpdatePlan, useLogAdminAction } from '../api/mutations'
import { useAdminPlans } from '../api/queries'
import { useAdminStore } from '../stores/adminStore'
import type { Plan, CreatePlanDto } from '../types'

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const emptyPlan: CreatePlanDto = {
  name: '',
  description: '',
  price: 0,
  monthly_credits: 0,
  project_limit: 1,
}

export function AdminPlansPage() {
  useDocumentTitle('Admin - Planos')
  const descriptionId = useId()
  const { hasPermission } = useAdminStore()
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<CreatePlanDto>(emptyPlan)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: plans, isLoading, refetch } = useAdminPlans()
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const logAction = useLogAdminAction()

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan)
      setFormData({
        name: plan.name ?? '',
        description: plan.description ?? '',
        price: plan.price ?? 0,
        monthly_credits: plan.monthly_credits ?? 0,
        project_limit: plan.project_limit ?? 1,
      })
    } else {
      setEditingPlan(null)
      setFormData(emptyPlan)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPlan(null)
    setFormData(emptyPlan)
  }

  const handleSubmit = async () => {
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({
          id: editingPlan.id,
          data: formData,
        })
        await logAction.mutateAsync({
          action: 'plan_update',
          resource_type: 'plan',
          resource_id: editingPlan.id.toString(),
          details: { plan_name: formData.name, changes: formData },
        })
      } else {
        await createPlan.mutateAsync(formData)
        await logAction.mutateAsync({
          action: 'plan_create',
          resource_type: 'plan',
          details: { plan_name: formData.name },
        })
      }
      handleCloseModal()
      refetch()
    } catch (error) {
      console.error('Error saving plan:', error)
    }
  }

  const handleDeletePlan = async () => {
    if (!planToDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.from('plans').delete().eq('id', planToDelete.id)

      if (error) throw error

      await logAction.mutateAsync({
        action: 'plan_delete',
        resource_type: 'plan',
        resource_id: planToDelete.id.toString(),
        details: { plan_name: planToDelete.name },
      })

      setShowDeleteModal(false)
      setPlanToDelete(null)
      refetch()
    } catch (error) {
      console.error('Error deleting plan:', error)
    }
    setIsDeleting(false)
  }

  const canEdit = hasPermission('settings', 'edit')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Planos</h1>
          <p className={styles.subtitle}>Gerencie os planos de assinatura do sistema</p>
        </div>
        {canEdit && (
          <Button leftIcon={<Plus size={18} />} onClick={() => handleOpenModal()}>
            Novo Plano
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !plans || plans.length === 0 ? (
        <div className={styles.emptyState}>
          <CreditCard size={48} />
          <h3>Nenhum plano cadastrado</h3>
          <p>Crie o primeiro plano para comecar</p>
          {canEdit && (
            <Button leftIcon={<Plus size={18} />} onClick={() => handleOpenModal()}>
              Criar Plano
            </Button>
          )}
        </div>
      ) : (
        <div className={styles.plansGrid}>
          {plans.map((plan) => (
            <div key={plan.id} className={styles.planCard}>
              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                {canEdit && (
                  <div className={styles.planActions}>
                    <button
                      className={styles.iconButton}
                      onClick={() => handleOpenModal(plan)}
                      title="Editar plano"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className={`${styles.iconButton} ${styles.danger}`}
                      onClick={() => {
                        setPlanToDelete(plan)
                        setShowDeleteModal(true)
                      }}
                      title="Excluir plano"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <p className={styles.planDescription}>
                {plan.description || 'Sem descricao'}
              </p>

              <div className={styles.planPrice}>
                <span className={styles.priceValue}>{formatCurrency(plan.price)}</span>
                <span className={styles.priceLabel}>/mes</span>
              </div>

              <ul className={styles.planFeatures}>
                <li>
                  <span className={styles.featureLabel}>Creditos mensais:</span>
                  <span className={styles.featureValue}>{plan.monthly_credits}</span>
                </li>
                <li>
                  <span className={styles.featureLabel}>Limite de projetos:</span>
                  <span className={styles.featureValue}>{plan.project_limit}</span>
                </li>
              </ul>

              <div className={styles.planId}>ID: {plan.id}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Plan Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingPlan ? 'Editar Plano' : 'Novo Plano'}
      >
        <div className={styles.modalContent}>
          <Input
            label="Nome do plano"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Pro, Business, Enterprise"
          />

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={descriptionId}>Descricao</label>
            <textarea
              id={descriptionId}
              value={formData.description ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value || null }))
              }
              placeholder="Descricao do plano..."
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formRow}>
            <Input
              label="Preco (R$)"
              type="number"
              value={formData.price.toString()}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
              }
              placeholder="0.00"
            />

            <Input
              label="Creditos mensais"
              type="number"
              value={formData.monthly_credits.toString()}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  monthly_credits: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="100"
            />
          </div>

          <Input
            label="Limite de projetos"
            type="number"
            value={formData.project_limit.toString()}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                project_limit: parseInt(e.target.value) || 1,
              }))
            }
            placeholder="1"
          />

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={createPlan.isPending || updatePlan.isPending}
              disabled={!formData.name}
            >
              {editingPlan ? 'Salvar' : 'Criar Plano'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setPlanToDelete(null)
        }}
        title="Excluir Plano"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Tem certeza que deseja excluir o plano <strong>{planToDelete?.name}</strong>?
          </p>
          <p className={styles.modalWarning}>
            Esta acao pode afetar usuarios que estao utilizando este plano.
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setPlanToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeletePlan} isLoading={isDeleting}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
