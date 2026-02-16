import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminMenuVisibilityPage.module.css'
import { useMenuVisibilityConfigs, useAdminPlans } from '../api/queries'
import { MenuVisibilityPreview } from '../components/menu-visibility/MenuVisibilityPreview'
import { MenuVisibilityTable } from '../components/menu-visibility/MenuVisibilityTable'
import { useAdminStore } from '../stores/adminStore'

export function AdminMenuVisibilityPage() {
  useDocumentTitle('Visibilidade de Menu - Admin')

  const { hasPermission } = useAdminStore()
  const { data: configs = [] } = useMenuVisibilityConfigs()
  const { data: plans = [] } = useAdminPlans()

  const canEdit = hasPermission('settings', 'edit')

  const [showPreview, setShowPreview] = useState(false)
  const [previewPlanId, setPreviewPlanId] = useState<number | null>(null)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Visibilidade de Menu</h1>
          <p className={styles.subtitle}>
            Configure quais itens do menu são visíveis para cada plano de assinatura.
          </p>
        </div>

        <div className={styles.previewControls}>
          <button
            className={`${styles.previewButton} ${showPreview ? styles.active : ''}`}
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye size={16} />
            {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
          </button>

          {showPreview && (
            <select
              className={styles.planSelect}
              value={previewPlanId ?? 'null'}
              onChange={(e) =>
                setPreviewPlanId(e.target.value === 'null' ? null : parseInt(e.target.value, 10))
              }
            >
              <option value="null">Sem plano</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.mainContent}>
          <MenuVisibilityTable canEdit={canEdit} />
        </div>

        {showPreview && (
          <div className={styles.previewSidebar}>
            <MenuVisibilityPreview configs={configs} selectedPlanId={previewPlanId} />
          </div>
        )}
      </div>
    </div>
  )
}
