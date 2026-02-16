import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { useUpdateMenuVisibilityConfig, useLogAdminAction } from '@/features/admin/api/mutations'
import type { Plan } from '@/features/admin/types'
import type { MenuVisibilityConfig, UpdateMenuVisibilityDto } from '@/shared/types/menu'
import styles from './MenuVisibilityEditModal.module.css'

interface MenuVisibilityEditModalProps {
  config: MenuVisibilityConfig
  plans: Plan[]
  onClose: () => void
}

export function MenuVisibilityEditModal({
  config,
  plans,
  onClose,
}: MenuVisibilityEditModalProps) {
  const idBase = useId()
  const accessPublicId = `${idBase}-access-public`
  const accessPlanId = `${idBase}-access-plan`
  const hiddenComingSoonId = `${idBase}-hidden-coming-soon`
  const hiddenHiddenId = `${idBase}-hidden-hidden`
  const tooltipId = `${idBase}-tooltip`
  const redirectId = `${idBase}-redirect`
  const updateConfig = useUpdateMenuVisibilityConfig()
  const logAction = useLogAdminAction()

  // Form state
  const [accessType, setAccessType] = useState<'public' | 'by_plan'>(
    config.is_public ? 'public' : 'by_plan'
  )
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>(config.plan_ids)
  const [hiddenBehavior, setHiddenBehavior] = useState<'hidden' | 'coming_soon'>(
    config.show_as_coming_soon ? 'coming_soon' : 'hidden'
  )
  const [comingSoonText, setComingSoonText] = useState(
    config.coming_soon_text || 'Disponível em breve'
  )
  const [redirectUrl, setRedirectUrl] = useState(config.redirect_url || '/subscription')
  const [error, setError] = useState<string | null>(null)

  const handlePlanToggle = (planId: number) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId]
    )
  }

  const handleSave = async () => {
    setError(null)

    const data: UpdateMenuVisibilityDto = {
      is_public: accessType === 'public',
      plan_ids: accessType === 'public' ? [] : selectedPlanIds,
      show_as_coming_soon: accessType === 'by_plan' && hiddenBehavior === 'coming_soon',
      coming_soon_text: comingSoonText,
      redirect_url: redirectUrl || null,
    }

    try {
      await updateConfig.mutateAsync({
        menuItemKey: config.menu_item_key,
        data,
      })

      // Log the admin action for audit
      await logAction.mutateAsync({
        action: 'update_menu_visibility',
        resource_type: 'menu_visibility_config',
        resource_id: config.menu_item_key,
        details: {
          menu_item_key: config.menu_item_key,
          previous: {
            is_public: config.is_public,
            plan_ids: config.plan_ids,
            show_as_coming_soon: config.show_as_coming_soon,
          },
          updated: {
            is_public: data.is_public,
            plan_ids: data.plan_ids,
            show_as_coming_soon: data.show_as_coming_soon,
          },
        },
      })

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    }
  }

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={`${idBase}-title`}>
        <div className={styles.header}>
          <h3 className={styles.title} id={`${idBase}-title`}>Editar Visibilidade</h3>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {config.is_essential && (
            <div className={styles.essentialWarning}>
              Este é um item essencial e não pode ser completamente oculto.
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          {/* Access Type */}
          <div className={styles.field}>
            <span className={styles.label}>Tipo de Acesso</span>
            <div className={styles.radioGroup}>
              <div className={styles.radioOption}>
                <input
                  id={accessPublicId}
                  type="radio"
                  name="accessType"
                  checked={accessType === 'public'}
                  onChange={() => setAccessType('public')}
                />
                <label htmlFor={accessPublicId} className={styles.radioContent}>
                  <span className={styles.radioLabel}>Público</span>
                  <span className={styles.radioDescription}>
                    Visível para todos os usuários autenticados
                  </span>
                </label>
              </div>
              <div className={styles.radioOption}>
                <input
                  id={accessPlanId}
                  type="radio"
                  name="accessType"
                  checked={accessType === 'by_plan'}
                  onChange={() => setAccessType('by_plan')}
                  disabled={config.is_essential}
                />
                <label htmlFor={accessPlanId} className={styles.radioContent}>
                  <span className={styles.radioLabel}>Por Plano</span>
                  <span className={styles.radioDescription}>
                    Visível apenas para usuários com planos específicos
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          {accessType === 'by_plan' && (
            <div className={styles.field}>
              <span className={styles.label}>Planos com Acesso</span>
              <div className={styles.plansSelector}>
                {plans.map((plan) => (
                  <label key={plan.id} className={styles.planCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedPlanIds.includes(plan.id)}
                      onChange={() => handlePlanToggle(plan.id)}
                    />
                    {plan.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Hidden Behavior */}
          {accessType === 'by_plan' && (
            <div className={styles.field}>
              <span className={styles.label}>Comportamento para Usuários sem Acesso</span>
              <div className={styles.radioGroup}>
                <div className={styles.radioOption}>
                  <input
                    id={hiddenComingSoonId}
                    type="radio"
                    name="hiddenBehavior"
                    checked={hiddenBehavior === 'coming_soon'}
                    onChange={() => setHiddenBehavior('coming_soon')}
                  />
                  <label htmlFor={hiddenComingSoonId} className={styles.radioContent}>
                    <span className={styles.radioLabel}>Mostrar como "Em Breve"</span>
                    <span className={styles.radioDescription}>
                      Item aparece desabilitado com badge "Em Breve"
                    </span>
                  </label>
                </div>
                <div className={styles.radioOption}>
                  <input
                    id={hiddenHiddenId}
                    type="radio"
                    name="hiddenBehavior"
                    checked={hiddenBehavior === 'hidden'}
                    onChange={() => setHiddenBehavior('hidden')}
                    disabled={config.is_essential}
                  />
                  <label htmlFor={hiddenHiddenId} className={styles.radioContent}>
                    <span className={styles.radioLabel}>Ocultar Completamente</span>
                    <span className={styles.radioDescription}>
                      Item não aparece no menu
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Coming Soon Text */}
          {accessType === 'by_plan' && hiddenBehavior === 'coming_soon' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor={tooltipId}>Texto do Tooltip</label>
              <input
                id={tooltipId}
                type="text"
                className={styles.input}
                value={comingSoonText}
                onChange={(e) => setComingSoonText(e.target.value)}
                placeholder="Disponível em breve"
              />
            </div>
          )}

          {/* Redirect URL */}
          {accessType === 'by_plan' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor={redirectId}>URL de Redirecionamento</label>
              <input
                id={redirectId}
                type="text"
                className={styles.input}
                value={redirectUrl}
                onChange={(e) => setRedirectUrl(e.target.value)}
                placeholder="/subscription"
              />
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
