import { Lock, ArrowLeft, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useHasActivePlan } from '@/shared/hooks/useEffectivePlanId'
import styles from './FeatureAccessDeniedPage.module.css'

interface FeatureAccessDeniedPageProps {
  featureName?: string
  redirectUrl?: string
}

/**
 * Page shown when a user tries to access a feature they don't have access to.
 * Provides upgrade CTA and navigation options.
 */
export function FeatureAccessDeniedPage({
  featureName,
  redirectUrl = '/subscription',
}: FeatureAccessDeniedPageProps) {
  const navigate = useNavigate()
  const hasActivePlan = useHasActivePlan()

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        <Lock size={40} />
      </div>

      <h1 className={styles.title}>Acesso Restrito</h1>

      <p className={styles.description}>
        {hasActivePlan
          ? 'Este recurso não está disponível no seu plano atual. Faça upgrade para desbloquear mais funcionalidades.'
          : 'Você precisa de um plano ativo para acessar este recurso. Assine agora e desbloqueie todo o potencial do AlvoBot.'}
      </p>

      <div className={styles.actions}>
        <Link to={redirectUrl} className={styles.upgradeButton}>
          <Sparkles size={18} />
          {hasActivePlan ? 'Fazer Upgrade' : 'Ver Planos'}
        </Link>

        <button onClick={handleGoBack} className={styles.backButton}>
          <ArrowLeft size={18} />
          Voltar
        </button>
      </div>

      {featureName && (
        <div className={styles.featureInfo}>
          <div className={styles.featureLabel}>Recurso solicitado</div>
          <div className={styles.featureName}>{featureName}</div>
        </div>
      )}
    </div>
  )
}
