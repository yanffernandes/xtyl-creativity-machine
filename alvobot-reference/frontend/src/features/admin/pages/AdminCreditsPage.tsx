// AdminCreditsPage - T052-T055
import { useState } from 'react'
import {
  Coins,
  Search,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Gift,
  Plus,
  CheckCircle,
} from 'lucide-react'
import { Button, Spinner } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import {
  useCreditsDashboard,
  useRecentCreditTransactions,
  useAdminUserCredits,
} from '../api/queries'
import { AddCreditsModal } from '../components'
import styles from './AdminCreditsPage.module.css'
import type { AdminUserCreditsInfo } from '../types'

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminCreditsPage() {
  useDocumentTitle('Admin - Creditos Extras')
  const [search, setSearch] = useState('')
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUserCreditsInfo | null>(null)

  const { data: metrics, isLoading: isLoadingMetrics, refetch: refetchMetrics } = useCreditsDashboard()
  const { data: transactions, isLoading: isLoadingTransactions, refetch: refetchTransactions } = useRecentCreditTransactions(15)
  const { data: userCredits, isLoading: isLoadingUsers, refetch: refetchUsers } = useAdminUserCredits({
    search: search || undefined
  })

  const isLoading = isLoadingMetrics || isLoadingTransactions

  const handleAddCreditsSuccess = () => {
    refetchMetrics()
    refetchTransactions()
    refetchUsers()
    setShowAddCreditsModal(false)
    setSelectedUser(null)
  }

  const handleAddCreditsToUser = (user: AdminUserCreditsInfo) => {
    setSelectedUser(user)
    setShowAddCreditsModal(true)
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Creditos Extras</h1>
          <p className={styles.subtitle}>
            Gerencie creditos extras para usuarios da plataforma
          </p>
        </div>
        <Button
          leftIcon={<Plus size={18} />}
          onClick={() => {
            setSelectedUser(null)
            setShowAddCreditsModal(true)
          }}
        >
          Adicionar Creditos
        </Button>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.blue}`}>
              <Gift size={20} />
            </div>
            <span className={styles.statTitle}>Total Distribuido</span>
          </div>
          <div className={styles.statValue}>{metrics?.total_distributed || 0}</div>
          <div className={styles.statSubtitle}>creditos</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <TrendingUp size={20} />
            </div>
            <span className={styles.statTitle}>Disponiveis</span>
          </div>
          <div className={styles.statValue}>{metrics?.total_available || 0}</div>
          <div className={styles.statSubtitle}>creditos ativos</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.purple}`}>
              <TrendingDown size={20} />
            </div>
            <span className={styles.statTitle}>Consumidos</span>
          </div>
          <div className={styles.statValue}>{metrics?.total_consumed || 0}</div>
          <div className={styles.statSubtitle}>creditos usados</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.red}`}>
              <Clock size={20} />
            </div>
            <span className={styles.statTitle}>Expirados</span>
          </div>
          <div className={styles.statValue}>{metrics?.total_expired || 0}</div>
          <div className={styles.statSubtitle}>creditos perdidos</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.statIcon} ${styles.yellow}`}>
              <Users size={20} />
            </div>
            <span className={styles.statTitle}>Usuarios</span>
          </div>
          <div className={styles.statValue}>{metrics?.users_with_credits || 0}</div>
          <div className={styles.statSubtitle}>com creditos extras</div>
        </div>
      </div>

      {/* Grid Layout: Recent Transactions + Top Users */}
      <div className={styles.gridLayout}>
        {/* Recent Transactions */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Coins size={20} />
              Transacoes Recentes
            </h3>
          </div>

          {isLoadingTransactions ? (
            <div className={styles.loading}>
              <Spinner size="md" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className={styles.emptyState}>
              <Coins size={48} />
              <h4>Nenhuma transacao</h4>
              <p>Adicione creditos extras para ver o historico aqui</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Descricao</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.userAvatar}>
                            {tx.user_email?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className={styles.userInfo}>
                            <span className={styles.userName}>
                              {tx.user_name || tx.user_email?.split('@')[0] || 'Usuario'}
                            </span>
                            <span className={styles.userEmail}>{tx.user_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${tx.transaction_type === 'credit' ? styles.success : styles.info}`}>
                          {tx.transaction_type === 'credit' ? (
                            <>
                              <CheckCircle size={12} />
                              Credito
                            </>
                          ) : (
                            <>
                              <TrendingDown size={12} />
                              Debito
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <strong>{tx.transaction_type === 'credit' ? '+' : '-'}{tx.amount}</strong>
                      </td>
                      <td>{tx.description || '-'}</td>
                      <td>{formatDateTime(tx.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Users with Credits */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Users size={20} />
              Usuarios com Creditos
            </h3>
          </div>

          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por email ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoadingUsers ? (
            <div className={styles.loading}>
              <Spinner size="md" />
            </div>
          ) : !userCredits || userCredits.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={48} />
              <h4>Nenhum usuario encontrado</h4>
              <p>Adicione creditos extras para ver usuarios aqui</p>
            </div>
          ) : (
            <div className={styles.topUsersList}>
              {userCredits.slice(0, 10).map((user, index) => (
                <div key={user.user_id} className={styles.topUserItem}>
                  <span className={styles.topUserRank}>{index + 1}</span>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>
                      {user.user_email?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>
                        {user.user_name || user.user_email?.split('@')[0] || 'Usuario'}
                      </span>
                      <span className={styles.userEmail}>{user.user_email}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={styles.topUserCredits}>
                      {user.extra_credits_available} creditos
                    </span>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleAddCreditsToUser(user)}
                      title="Adicionar creditos"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Credits Modal */}
      {showAddCreditsModal && (
        <AddCreditsModal
          isOpen={showAddCreditsModal}
          onClose={() => {
            setShowAddCreditsModal(false)
            setSelectedUser(null)
          }}
          onSuccess={handleAddCreditsSuccess}
          preselectedUserId={selectedUser?.user_id}
          preselectedUserEmail={selectedUser?.user_email}
        />
      )}
    </div>
  )
}
