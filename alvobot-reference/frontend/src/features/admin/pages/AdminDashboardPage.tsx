import {
  Users,
  CreditCard,
  FileText,
  FolderKanban,
  TrendingUp,
  Activity,
  DollarSign,
  UserCheck,
} from 'lucide-react'
import { Spinner } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminDashboardPage.module.css'
import { useAdminDashboardStats } from '../api/queries'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function AdminDashboardPage() {
  useDocumentTitle('Admin - Dashboard')
  const { data: stats, isLoading, error } = useAdminDashboardStats()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Erro ao carregar estatisticas</p>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total de Usuarios',
      value: formatNumber(stats?.total_users || 0),
      icon: Users,
      color: 'blue',
      subtitle: `+${formatNumber(stats?.new_users_30d || 0)} novos (30 dias)`,
    },
    {
      title: 'Usuarios Ativos',
      value: formatNumber(stats?.active_users_7d || 0),
      icon: UserCheck,
      color: 'green',
      subtitle: 'Ultimos 7 dias',
    },
    {
      title: 'Assinaturas Ativas',
      value: formatNumber(stats?.active_subscriptions || 0),
      icon: CreditCard,
      color: 'purple',
      subtitle: 'Planos pagos',
    },
    {
      title: 'Receita (30 dias)',
      value: formatCurrency(stats?.revenue_30d || 0),
      icon: DollarSign,
      color: 'yellow',
      subtitle: 'Faturamento mensal',
    },
    {
      title: 'Total de Projetos',
      value: formatNumber(stats?.total_projects || 0),
      icon: FolderKanban,
      color: 'cyan',
      subtitle: 'Blogs cadastrados',
    },
    {
      title: 'Total de Artigos',
      value: formatNumber(stats?.total_articles || 0),
      icon: FileText,
      color: 'pink',
      subtitle: `+${formatNumber(stats?.articles_30d || 0)} (30 dias)`,
    },
    {
      title: 'Atividades (24h)',
      value: formatNumber(stats?.activities_24h || 0),
      icon: Activity,
      color: 'orange',
      subtitle: 'Acoes no sistema',
    },
    {
      title: 'Crescimento',
      value: stats?.new_users_30d && stats?.total_users
        ? `${((stats.new_users_30d / stats.total_users) * 100).toFixed(1)}%`
        : '0%',
      icon: TrendingUp,
      color: 'green',
      subtitle: 'Taxa de crescimento mensal',
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard Administrativo</h1>
        <p className={styles.subtitle}>Visao geral do sistema AlvoBot</p>
      </div>

      <div className={styles.statsGrid}>
        {statCards.map((card) => (
          <div key={card.title} className={`${styles.statCard} ${styles[card.color]}`}>
            <div className={styles.statHeader}>
              <div className={`${styles.statIcon} ${styles[card.color]}`}>
                <card.icon size={20} />
              </div>
              <span className={styles.statTitle}>{card.title}</span>
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statSubtitle}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Acoes Rapidas</h2>
        <div className={styles.quickActions}>
          <a href="/admin/users" className={styles.quickAction}>
            <Users size={24} />
            <span>Gerenciar Usuarios</span>
          </a>
          <a href="/admin/subscriptions" className={styles.quickAction}>
            <CreditCard size={24} />
            <span>Ver Assinaturas</span>
          </a>
          <a href="/admin/audit" className={styles.quickAction}>
            <Activity size={24} />
            <span>Auditoria</span>
          </a>
          <a href="/admin/settings" className={styles.quickAction}>
            <TrendingUp size={24} />
            <span>Configuracoes</span>
          </a>
        </div>
      </div>

      {/* Recent Activity Preview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumo do Sistema</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Usuarios</h3>
            <ul className={styles.summaryList}>
              <li>
                <span>Total cadastrados</span>
                <strong>{formatNumber(stats?.total_users || 0)}</strong>
              </li>
              <li>
                <span>Novos (30 dias)</span>
                <strong>{formatNumber(stats?.new_users_30d || 0)}</strong>
              </li>
              <li>
                <span>Ativos (7 dias)</span>
                <strong>{formatNumber(stats?.active_users_7d || 0)}</strong>
              </li>
            </ul>
          </div>
          <div className={styles.summaryCard}>
            <h3>Conteudo</h3>
            <ul className={styles.summaryList}>
              <li>
                <span>Total de projetos</span>
                <strong>{formatNumber(stats?.total_projects || 0)}</strong>
              </li>
              <li>
                <span>Total de artigos</span>
                <strong>{formatNumber(stats?.total_articles || 0)}</strong>
              </li>
              <li>
                <span>Artigos (30 dias)</span>
                <strong>{formatNumber(stats?.articles_30d || 0)}</strong>
              </li>
            </ul>
          </div>
          <div className={styles.summaryCard}>
            <h3>Financeiro</h3>
            <ul className={styles.summaryList}>
              <li>
                <span>Assinaturas ativas</span>
                <strong>{formatNumber(stats?.active_subscriptions || 0)}</strong>
              </li>
              <li>
                <span>Receita (30 dias)</span>
                <strong>{formatCurrency(stats?.revenue_30d || 0)}</strong>
              </li>
              <li>
                <span>Ticket medio</span>
                <strong>
                  {stats?.active_subscriptions
                    ? formatCurrency((stats.revenue_30d || 0) / stats.active_subscriptions)
                    : formatCurrency(0)}
                </strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
