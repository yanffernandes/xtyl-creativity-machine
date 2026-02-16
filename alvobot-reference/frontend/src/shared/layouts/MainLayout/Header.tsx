import { useState } from 'react'
import { ChevronDown, CreditCard, LogOut, Menu, Settings, Shield, User, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '@/features/admin/stores/adminStore'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useCreditsSummary } from '@/features/subscription/api/useSubscription'
import { WorkspaceSwitcher } from '@/features/workspace/components/WorkspaceSwitcher'
import { NotificationBell } from '@/shared/components'
import { useLayoutStore } from '@/shared/stores/layoutStore'
import styles from './Header.module.css'

export function Header() {
  const { user, logout } = useAuthStore()
  const { isAdmin } = useAdminStore()
  const navigate = useNavigate()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { data: credits } = useCreditsSummary()
  const { toggleMobileMenu } = useLayoutStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'

  // Credits display
  const creditsUsed = credits?.credits_used ?? 0
  const creditsLimit = credits?.plan_monthly_credits ?? 0
  const creditsRemaining = credits?.credits_remaining ?? 0
  const hasActivePlan = credits?.has_active_plan ?? false
  const creditsPercentage = creditsLimit > 0 ? (creditsUsed / creditsLimit) * 100 : 0

  const getCreditsColorClass = () => {
    if (!hasActivePlan) return styles.creditsInactive
    if (creditsPercentage >= 90) return styles.creditsDanger
    if (creditsPercentage >= 75) return styles.creditsWarning
    return styles.creditsOk
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Mobile menu button (hamburger) */}
        <button
          className={styles.mobileMenuButton}
          onClick={toggleMobileMenu}
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className={styles.right}>
        {/* Credits Indicator */}
        <button
          className={`${styles.creditsButton} ${getCreditsColorClass()}`}
          onClick={() => navigate('/subscription')}
          title={hasActivePlan ? `${creditsRemaining} creditos restantes de ${creditsLimit}` : 'Nenhum plano ativo'}
        >
          <Zap size={16} />
          <span className={styles.creditsText}>
            {hasActivePlan ? `${creditsRemaining}/${creditsLimit}` : 'Sem plano'}
          </span>
        </button>

        <div className={styles.separator} />

        <NotificationBell />

        <div className={styles.separator} />

        <WorkspaceSwitcher />

        <div className={styles.separator} />

        <div className={styles.userMenu}>
          <button
            className={styles.userButton}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className={styles.avatar}>
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="" />
              ) : (
                <User size={18} />
              )}
            </div>
            <span className={styles.userName}>{displayName}</span>
            <ChevronDown size={16} className={styles.chevron} />
          </button>

          {isDropdownOpen && (
            <>
              <button
                type="button"
                className={styles.dropdownOverlay}
                onClick={() => setIsDropdownOpen(false)}
                aria-label="Fechar menu"
              />
              <div className={styles.dropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsDropdownOpen(false)
                    navigate('/subscription')
                  }}
                >
                  <CreditCard size={16} />
                  Assinatura
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsDropdownOpen(false)
                    navigate('/settings')
                  }}
                >
                  <Settings size={16} />
                  Configurações
                </button>
                {isAdmin && (
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setIsDropdownOpen(false)
                      navigate('/admin')
                    }}
                  >
                    <Shield size={16} />
                    Admin
                  </button>
                )}
                <div className={styles.dropdownDivider} />
                <button className={styles.dropdownItem} onClick={handleLogout}>
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
