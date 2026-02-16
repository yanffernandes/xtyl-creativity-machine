// ExtraCreditsSection - T028, T030, T031, T032, T036
import { useState } from 'react'
import { Coins, ChevronDown, Clock, Calendar, Gift, AlertTriangle, CheckCircle } from 'lucide-react'
import { Spinner } from '@/shared/components'
import styles from './ExtraCreditsSection.module.css'
import { useExtraCreditsPackages, useCreditsSummaryV2 } from '../../api/useSubscription'
import { getExtraCreditStatusLabel, type ExtraCreditPackage, type ExtraCreditPackageStatus  } from '../../types'

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusIcon(status: ExtraCreditPackageStatus) {
  switch (status) {
    case 'active':
      return <CheckCircle size={12} />
    case 'expiring_soon':
      return <AlertTriangle size={12} />
    case 'expired':
      return <Clock size={12} />
    case 'consumed':
      return <CheckCircle size={12} />
    default:
      return null
  }
}

interface CreditPackagesListProps {
  packages: ExtraCreditPackage[]
  isExpanded: boolean
}

function CreditPackagesList({ packages, isExpanded }: CreditPackagesListProps) {
  if (!isExpanded || packages.length === 0) return null

  // Filter to show only active/expiring_soon by default
  const activePackages = packages.filter(
    pkg => pkg.status === 'active' || pkg.status === 'expiring_soon'
  )

  return (
    <div className={styles.packagesList}>
      {activePackages.map((pkg) => (
        <div key={pkg.package_id} className={styles.packageCard}>
          <div className={styles.packageInfo}>
            <div className={styles.packageDescription}>
              {pkg.description || 'Creditos extras'}
            </div>
            <div className={styles.packageMeta}>
              <span>
                <Gift size={12} />
                {formatDate(pkg.created_at)}
              </span>
              {pkg.expires_at ? (
                <span>
                  <Clock size={12} />
                  {pkg.days_until_expiry !== null && pkg.days_until_expiry >= 0
                    ? `Expira em ${pkg.days_until_expiry} dias`
                    : 'Expirado'}
                </span>
              ) : (
                <span>
                  <Calendar size={12} />
                  Sem expiracao
                </span>
              )}
              {pkg.added_by_admin_name && (
                <span>Adicionado por {pkg.added_by_admin_name}</span>
              )}
            </div>
          </div>
          <div className={styles.packageRight}>
            <div className={styles.packageCredits}>
              {pkg.remaining_amount}
              <span> / {pkg.original_amount}</span>
            </div>
            <span className={`${styles.statusBadge} ${styles[pkg.status]}`}>
              {getStatusIcon(pkg.status)}
              {getExtraCreditStatusLabel(pkg.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ExtraCreditsSection() {
  const [isExpanded, setIsExpanded] = useState(false)

  const { data: creditsSummary, isLoading: isLoadingSummary } = useCreditsSummaryV2()
  const { data: packages, isLoading: isLoadingPackages } = useExtraCreditsPackages()

  const isLoading = isLoadingSummary || isLoadingPackages

  // Get extra credits values
  const extraCreditsAvailable = creditsSummary?.extra_credits_available ?? 0
  const extraCreditsExpiringSoon = creditsSummary?.extra_credits_expiring_soon ?? 0
  const extraCreditsExpired = creditsSummary?.extra_credits_expired ?? 0

  // Filter active packages
  const activePackages = packages?.filter(
    pkg => pkg.status === 'active' || pkg.status === 'expiring_soon'
  ) ?? []

  // T036: Empty state when no extra credits
  if (!isLoading && extraCreditsAvailable === 0 && activePackages.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <Coins size={20} />
            Creditos Extras
          </h3>
        </div>
        <div className={styles.emptyState}>
          <Coins size={48} />
          <h4>Voce nao possui creditos extras</h4>
          <p>
            Creditos extras sao adicionados pelo administrador e podem ser usados apos
            o consumo dos creditos mensais do seu plano.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <Coins size={20} />
          Creditos Extras
        </h3>
        {extraCreditsAvailable > 0 && (
          <div className={styles.totalBadge}>
            <Coins size={14} />
            {extraCreditsAvailable} disponiveis
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="md" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className={styles.summaryStats}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Disponiveis</span>
              <span className={`${styles.summaryValue} ${styles.success}`}>
                {extraCreditsAvailable}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Expirando em breve</span>
              <span className={`${styles.summaryValue} ${extraCreditsExpiringSoon > 0 ? styles.warning : ''}`}>
                {extraCreditsExpiringSoon}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Pacotes ativos</span>
              <span className={styles.summaryValue}>
                {activePackages.length}
              </span>
            </div>
          </div>

          {/* T032: Expandable packages list */}
          {activePackages.length > 0 && (
            <>
              <div className={styles.packagesHeader}>
                <span className={styles.packagesTitle}>
                  Detalhes dos pacotes
                </span>
                <button
                  className={`${styles.toggleButton} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                  <ChevronDown size={16} />
                </button>
              </div>

              <CreditPackagesList
                packages={activePackages}
                isExpanded={isExpanded}
              />
            </>
          )}

          {/* Show expired credits info if any */}
          {extraCreditsExpired > 0 && (
            <div className={styles.packagesHeader}>
              <span className={styles.packagesTitle}>
                {extraCreditsExpired} creditos expiraram sem uso
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
