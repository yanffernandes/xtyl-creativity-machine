import { useState } from 'react'
import { Globe, Lock, Users, Crown, ChevronDown, X } from 'lucide-react'
import type { VisibilityType } from '@/features/courses/types'
import { Button, Modal } from '@/shared/components'
import styles from './ModuleVisibilityToggle.module.css'

interface ModuleVisibilityToggleProps {
  currentOverride: VisibilityType | null
  planIdsOverride: number[] | null
  userIdsOverride: string[] | null
  courseVisibility: VisibilityType
  onSave: (data: {
    visibility_override: VisibilityType | null
    plan_ids_override: number[] | null
    user_ids_override: string[] | null
  }) => void
  isLoading?: boolean
  availablePlans?: Array<{ id: number; name: string }>
}

const visibilityOptions: Array<{
  value: VisibilityType | 'inherit'
  label: string
  description: string
  icon: React.ComponentType<{ size?: number }>
}> = [
  {
    value: 'inherit',
    label: 'Herdar do Curso',
    description: 'Usar a mesma visibilidade definida no curso',
    icon: Crown,
  },
  {
    value: 'public',
    label: 'Público',
    description: 'Qualquer usuário pode acessar este módulo',
    icon: Globe,
  },
  {
    value: 'by_plan',
    label: 'Por Plano',
    description: 'Apenas usuários com planos específicos',
    icon: Lock,
  },
  {
    value: 'by_user',
    label: 'Por Usuário',
    description: 'Apenas usuários específicos selecionados',
    icon: Users,
  },
]

export function ModuleVisibilityToggle({
  currentOverride,
  planIdsOverride,
  userIdsOverride,
  courseVisibility,
  onSave,
  isLoading = false,
  availablePlans = [],
}: ModuleVisibilityToggleProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedVisibility, setSelectedVisibility] = useState<VisibilityType | 'inherit'>(
    currentOverride || 'inherit'
  )
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>(
    planIdsOverride || []
  )

  const handleSave = () => {
    onSave({
      visibility_override: selectedVisibility === 'inherit' ? null : selectedVisibility,
      plan_ids_override: selectedVisibility === 'by_plan' ? selectedPlanIds : null,
      user_ids_override: selectedVisibility === 'by_user' ? userIdsOverride : null,
    })
    setShowModal(false)
  }

  const handleOpenModal = () => {
    setSelectedVisibility(currentOverride || 'inherit')
    setSelectedPlanIds(planIdsOverride || [])
    setShowModal(true)
  }

  const handleClearOverride = () => {
    onSave({
      visibility_override: null,
      plan_ids_override: null,
      user_ids_override: null,
    })
  }

  const getVisibilityLabel = () => {
    if (!currentOverride) {
      return null
    }
    const option = visibilityOptions.find((o) => o.value === currentOverride)
    return option?.label || currentOverride
  }

  const getVisibilityIcon = () => {
    if (!currentOverride) return null
    const option = visibilityOptions.find((o) => o.value === currentOverride)
    if (!option) return null
    const Icon = option.icon
    return <Icon size={12} />
  }

  const togglePlan = (planId: number) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    )
  }

  const hasOverride = currentOverride !== null

  return (
    <>
      {hasOverride ? (
        <div className={styles.badge}>
          {getVisibilityIcon()}
          <span>{getVisibilityLabel()}</span>
          <button
            className={styles.clearButton}
            onClick={handleClearOverride}
            title="Remover override"
            disabled={isLoading}
          >
            <X size={12} />
          </button>
          <button
            className={styles.editButton}
            onClick={handleOpenModal}
            title="Editar visibilidade"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      ) : (
        <button
          className={styles.toggleButton}
          onClick={handleOpenModal}
          title="Configurar visibilidade deste módulo"
        >
          <Crown size={14} />
          <span>Visibilidade</span>
          <ChevronDown size={12} />
        </button>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="sm"
        title="Visibilidade do Módulo"
      >
        <div className={styles.modalContent}>
          <p className={styles.description}>
            Por padrão, este módulo usa a visibilidade do curso (
            <strong>{courseVisibility === 'public' ? 'Público' :
              courseVisibility === 'by_plan' ? 'Por Plano' :
              courseVisibility === 'by_user' ? 'Por Usuário' : 'Privado'}</strong>
            ). Você pode sobrescrever essa configuração apenas para este módulo.
          </p>

          <div className={styles.options}>
            {visibilityOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedVisibility === option.value

              return (
                <button
                  key={option.value}
                  className={`${styles.option} ${isSelected ? styles.selected : ''}`}
                  onClick={() => setSelectedVisibility(option.value)}
                >
                  <div className={styles.optionIcon}>
                    <Icon size={20} />
                  </div>
                  <div className={styles.optionContent}>
                    <span className={styles.optionLabel}>{option.label}</span>
                    <span className={styles.optionDescription}>{option.description}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedVisibility === 'by_plan' && availablePlans.length > 0 && (
            <div className={styles.planSelector}>
              <span className={styles.planLabel}>Selecione os planos:</span>
              <div className={styles.planList}>
                {availablePlans.map((plan) => (
                  <label key={plan.id} className={styles.planItem}>
                    <input
                      type="checkbox"
                      checked={selectedPlanIds.includes(plan.id)}
                      onChange={() => togglePlan(plan.id)}
                    />
                    <span>{plan.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedVisibility === 'by_plan' && availablePlans.length === 0 && (
            <div className={styles.noPlanWarning}>
              Nenhum plano disponível. Configure os planos no sistema primeiro.
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isLoading}
            disabled={selectedVisibility === 'by_plan' && selectedPlanIds.length === 0}
          >
            Salvar
          </Button>
        </div>
      </Modal>
    </>
  )
}
