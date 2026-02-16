import { FileText, FolderKanban, Layers, Zap, FolderOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Card, Spinner, MaskedValue } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './DashboardPage.module.css'
import {
  useDashboardStats,
  useRecentActivity,
  getGreeting,
  formatRelativeTime,
} from '../api/useDashboardStats'

interface MetricCardProps {
  label: string
  current: number
  total: number
  percentage: number
}

function MetricCard({ label, current, total, percentage }: MetricCardProps) {
  return (
    <Card className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>
        {current}/{total}
      </span>
      <span className={styles.metricPercent}>{percentage.toFixed(2)}%</span>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </Card>
  )
}

interface QuickActionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  to: string
}

function QuickActionCard({ icon, title, description, to }: QuickActionCardProps) {
  return (
    <Link to={to} className={styles.quickActionLink}>
      <Card className={styles.quickActionCard}>
        <div className={styles.quickActionIcon}>{icon}</div>
        <h3 className={styles.quickActionTitle}>{title}</h3>
        <p className={styles.quickActionDescription}>{description}</p>
      </Card>
    </Link>
  )
}

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity()

  const greeting = getGreeting()
  const userName = (user?.user_metadata as { full_name?: string })?.full_name || user?.email?.split('@')[0] || 'Usuário'

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileText size={16} />
      case 'project':
        return <FolderKanban size={16} />
      default:
        return <FileText size={16} />
    }
  }

  return (
    <div className={styles.container}>
      {/* Greeting */}
      <div className={styles.greeting}>
        <span className={styles.greetingText}>{greeting}, </span>
        <span className={styles.greetingName}>{userName}</span>
      </div>

      {/* Metrics Section */}
      <div className={styles.metricsSection}>
        {statsLoading ? (
          <div className={styles.metricsLoading}>
            <Spinner size="md" />
          </div>
        ) : stats ? (
          <div className={styles.metricsGrid}>
            <MetricCard
              label="Projetos"
              current={stats.projects.count}
              total={stats.projects.limit}
              percentage={stats.projects.percentage}
            />
            <MetricCard
              label="Artigos Criados"
              current={stats.articles.count}
              total={stats.articles.goal}
              percentage={stats.articles.percentage}
            />
            <MetricCard
              label="Palavras-Chave"
              current={stats.keywords.count}
              total={stats.keywords.limit}
              percentage={stats.keywords.percentage}
            />
          </div>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActionsSection}>
        <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
        <div className={styles.quickActionsGrid}>
          <QuickActionCard
            icon={<FolderOpen size={32} />}
            title="Gerenciar Projetos"
            description="Adicione, edite ou remova os seus projetos."
            to="/projects"
          />
          <QuickActionCard
            icon={<Layers size={32} />}
            title="Estrutura de Base"
            description="Suba a estrutura de 4 camadas para aprovação."
            to="/base-structure"
          />
          <QuickActionCard
            icon={<Zap size={32} />}
            title="Mineração 10x"
            description="Encontre as melhores palavras chave."
            to="/keywords"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className={styles.activitySection}>
        <h2 className={styles.sectionTitle}>Atividade Recente</h2>
        <Card className={styles.activityCard}>
          {activitiesLoading ? (
            <div className={styles.activityLoading}>
              <Spinner size="sm" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className={styles.activityList}>
              {activities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <div className={styles.activityIcon}>{getActivityIcon(activity.type)}</div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityTitle}>
                      <MaskedValue value={activity.title} type="partial" visibleStart={5} />
                    </p>
                    <p className={styles.activityDescription}>
                      <MaskedValue value={activity.description} type="partial" visibleStart={8} />
                    </p>
                    {activity.projectName && (
                      <span className={styles.activityProject}>
                        em <MaskedValue value={activity.projectName} type="partial" visibleStart={3} />
                      </span>
                    )}
                  </div>
                  <span className={styles.activityTime}>
                    {formatRelativeTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.activityEmpty}>
              <p>Nenhuma atividade recente</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
