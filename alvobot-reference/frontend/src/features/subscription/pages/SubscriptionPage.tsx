import { useState } from 'react'
import {
  CreditCard,
  Wallet,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  FileText,
  FolderOpen,
  Calendar,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import { Button, Spinner } from '@/shared/components'
import {
  useSubscriptionSummary,
  useTransactions,
  useCreditsSummary,
  useCreditsByType,
  useRecentActivities,
} from '../api/useSubscription'
import {
  getTransactionStatusLabel,
  getTransactionStatusVariant,
  getResourceTypeLabel, type ActivityLog 
} from '../types'
import styles from './SubscriptionPage.module.css'

type TabType = 'overview' | 'transactions' | 'activities'

const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Visao Geral', icon: <Wallet size={18} /> },
  { id: 'transactions', label: 'Historico', icon: <Receipt size={18} /> },
  { id: 'activities', label: 'Atividades', icon: <Activity size={18} /> },
]

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getActivityIcon(resourceType: ActivityLog['resource_type']) {
  switch (resourceType) {
    case 'article':
      return <FileText size={20} />
    case 'keyword':
      return <Zap size={20} />
    case 'project':
      return <FolderOpen size={20} />
    default:
      return <Activity size={20} />
  }
}

function getDaysRemaining(expirationDate: string | null): number | null {
  if (!expirationDate) return null
  const expDate = new Date(expirationDate)
  const today = new Date()
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function SubscriptionPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const { data: subscription, isLoading: isLoadingSub } = useSubscriptionSummary()
  const { data: transactions, isLoading: isLoadingTx } = useTransactions()
  const { data: creditsSummary, isLoading: isLoadingCreditsSummary } = useCreditsSummary()
  const { data: creditsByType } = useCreditsByType()
  const { data: activities, isLoading: isLoadingActivities } = useRecentActivities(30)

  const isLoading = isLoadingSub || isLoadingTx || isLoadingCreditsSummary

  // Use credits from new view (user_credits_summary) if available, fallback to subscription
  const creditsLimit = creditsSummary?.plan_monthly_credits ?? subscription?.active_plan_monthly_credits ?? 0
  const creditsUsed = creditsSummary?.credits_used ?? subscription?.current_cycle_articles_count ?? 0
  const creditsRemaining = creditsSummary?.credits_remaining ?? Math.max(0, creditsLimit - creditsUsed)
  const creditsPercentage = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0

  // Use cycle dates from credits summary if available
  const cycleStart = creditsSummary?.cycle_start ?? subscription?.current_cycle_start
  const cycleEnd = creditsSummary?.cycle_end ?? subscription?.current_cycle_end
  const hasActivePlan = creditsSummary?.has_active_plan ?? subscription?.has_active_plan ?? false

  // Days remaining in plan
  const daysRemaining = getDaysRemaining(subscription?.plan_expiration_date || null)

  // Get progress bar color
  const getProgressClass = () => {
    if (creditsPercentage >= 90) return styles.danger
    if (creditsPercentage >= 75) return styles.warning
    return ''
  }

  const renderOverview = () => (
    <>
      {/* Plan Card */}
      {hasActivePlan && subscription ? (
        <div className={styles.planCard}>
          <div className={styles.planInfo}>
            <h3>{subscription.active_plan_name || 'Plano Ativo'}</h3>
            <span className={`${styles.planBadge} ${styles.active}`}>
              <CheckCircle size={10} />
              Ativo
            </span>
          </div>
          <div className={styles.planDetails}>
            <div className={styles.planDetail}>
              <div className={styles.planDetailLabel}>Creditos</div>
              <div className={styles.planDetailValue}>{creditsLimit}/mes</div>
            </div>
            <div className={styles.planDetail}>
              <div className={styles.planDetailLabel}>Projetos</div>
              <div className={styles.planDetailValue}>
                {subscription.active_projects_count}/{subscription.active_plan_project_limit || '∞'}
              </div>
            </div>
            <div className={styles.planDetail}>
              <div className={styles.planDetailLabel}>Expira</div>
              <div className={styles.planDetailValue}>
                {daysRemaining !== null ? `${daysRemaining}d` : '-'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.noPlanCard}>
          <h3>Nenhum plano ativo</h3>
          <p>Assine um plano para desbloquear todos os recursos</p>
          <Button leftIcon={<CreditCard size={18} />}>Ver Planos</Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Zap size={16} />
            Creditos Usados
          </div>
          <div className={styles.statValue}>
            {creditsUsed}/{creditsLimit}
          </div>
          <div className={styles.statSubtext}>{creditsRemaining} restantes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <FolderOpen size={16} />
            Projetos Ativos
          </div>
          <div className={styles.statValue}>{subscription?.active_projects_count || 0}</div>
          <div className={styles.statSubtext}>
            de {subscription?.active_plan_project_limit || 0} permitidos
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Calendar size={16} />
            Ciclo Atual
          </div>
          <div className={styles.statValue}>{formatDate(cycleStart)}</div>
          <div className={styles.statSubtext}>ate {formatDate(cycleEnd)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            <Clock size={16} />
            Validade do Plano
          </div>
          <div className={styles.statValue}>{formatDate(subscription?.plan_expiration_date)}</div>
          <div className={styles.statSubtext}>
            {daysRemaining !== null && daysRemaining > 0
              ? `${daysRemaining} dias restantes`
              : daysRemaining === 0
                ? 'Expira hoje'
                : 'Expirado'}
          </div>
        </div>
      </div>

      {/* Credits Progress */}
      <div className={styles.creditsSection}>
        <h3 className={styles.sectionTitle}>
          <TrendingUp size={20} />
          Uso de Creditos
        </h3>
        <div className={styles.creditsProgress}>
          <div className={styles.creditsHeader}>
            <div className={styles.creditsUsed}>
              {creditsUsed} <span>/ {creditsLimit} creditos</span>
            </div>
            <div className={styles.creditsRemaining}>{creditsRemaining} restantes</div>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${getProgressClass()}`}
              style={{ width: `${Math.min(creditsPercentage, 100)}%` }}
            />
          </div>
          <div className={styles.cycleInfo}>
            Periodo: {formatDate(cycleStart)} -{' '}
            {formatDate(cycleEnd)}
          </div>

          {/* Credits Breakdown */}
          {creditsByType && creditsByType.length > 0 && (
            <div className={styles.creditsBreakdown}>
              {creditsByType.map((item) => (
                <div key={item.operation_type} className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>
                    {getResourceTypeLabel(item.operation_type as ActivityLog['resource_type'])}
                  </span>
                  <span className={styles.breakdownValue}>{item.credits_used}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )

  const renderTransactions = () => (
    <div className={styles.transactionsSection}>
      <h3 className={styles.sectionTitle}>
        <Receipt size={20} />
        Historico de Pagamentos
      </h3>
      {isLoadingTx ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !transactions || transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <Receipt size={48} />
          <h4>Nenhuma transacao encontrada</h4>
          <p>Seu historico de pagamentos aparecera aqui</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Plano</th>
                <th>Valor</th>
                <th>Metodo</th>
                <th>Status</th>
                <th>Validade</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const statusVariant = getTransactionStatusVariant(tx.status)
                return (
                  <tr key={tx.id}>
                    <td>{formatDate(tx.timestamp_approved || tx.created_at)}</td>
                    <td>{tx.plan_name || '-'}</td>
                    <td>{formatCurrency(tx.buyer_paid)}</td>
                    <td>{tx.payment_method || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[statusVariant]}`}>
                        {statusVariant === 'success' && <CheckCircle size={12} />}
                        {statusVariant === 'warning' && <AlertCircle size={12} />}
                        {statusVariant === 'error' && <XCircle size={12} />}
                        {getTransactionStatusLabel(tx.status)}
                      </span>
                    </td>
                    <td>
                      {tx.duration ? `${tx.duration} ${tx.duration === 1 ? 'mes' : 'meses'}` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderActivities = () => (
    <div className={styles.transactionsSection}>
      <h3 className={styles.sectionTitle}>
        <Activity size={20} />
        Atividades Recentes
      </h3>
      {isLoadingActivities ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !activities || activities.length === 0 ? (
        <div className={styles.emptyState}>
          <Activity size={48} />
          <h4>Nenhuma atividade registrada</h4>
          <p>Suas acoes no sistema aparecerão aqui</p>
        </div>
      ) : (
        <div className={styles.activityList}>
          {activities.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={`${styles.activityIcon} ${styles[activity.resource_type] || ''}`}>
                {getActivityIcon(activity.resource_type)}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityTitle}>{activity.title}</div>
                {activity.description && (
                  <div className={styles.activityDescription}>{activity.description}</div>
                )}
                <div className={styles.activityMeta}>
                  <span className={styles.activityTime}>{formatDateTime(activity.created_at)}</span>
                  {activity.credits_consumed > 0 && (
                    <span className={styles.activityCredits}>
                      <Zap size={12} />
                      {activity.credits_consumed} credito
                      {activity.credits_consumed !== 1 ? 's' : ''}
                    </span>
                  )}
                  {activity.metadata?.project_name && (
                    <span className={styles.activityProject}>
                      <FolderOpen size={12} /> {activity.metadata.project_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <CreditCard size={24} />
        </div>
        <div>
          <h1 className={styles.title}>Assinatura</h1>
          <p className={styles.subtitle}>Gerencie seu plano, creditos e historico de pagamentos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'transactions' && renderTransactions()}
          {activeTab === 'activities' && renderActivities()}
        </>
      )}
    </div>
  )
}
