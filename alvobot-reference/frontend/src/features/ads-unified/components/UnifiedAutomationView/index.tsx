/**
 * UnifiedAutomationView Component
 * T046: Displays automation rules from connected ad platforms
 *
 * Shows Google Ads automation rules in the unified dashboard.
 * Meta Ads automations will be added in a future phase.
 */

import { useMemo } from 'react'
import { Settings, Plus, Clock, Play, Pause, AlertCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Spinner, EmptyState } from '@/shared/components'
import { PlatformBadge } from '../PlatformBadge'
import styles from './UnifiedAutomationView.module.css'
import type { AdsPlatform, UnifiedAutomationRule } from '../../types'

// ============================================
// Types
// ============================================

interface UnifiedAutomationViewProps {
  automations: UnifiedAutomationRule[]
  isLoading: boolean
  error?: Error | null
  selectedPlatforms: AdsPlatform[]
  onCreateAutomation?: () => void
}

// ============================================
// Utility Functions
// ============================================

function formatDate(dateString?: string): string {
  if (!dateString) return 'Nunca executada'
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    pause: 'Pausar campanha',
    enable: 'Ativar campanha',
    increase_budget: 'Aumentar orçamento',
    decrease_budget: 'Diminuir orçamento',
    increase_bid: 'Aumentar lance',
    decrease_bid: 'Diminuir lance',
    notification: 'Enviar notificação',
  }
  return labels[actionType] || actionType
}

// ============================================
// Component
// ============================================

export function UnifiedAutomationView({
  automations,
  isLoading,
  error,
  selectedPlatforms,
  onCreateAutomation,
}: UnifiedAutomationViewProps) {
  const navigate = useNavigate()

  // Check if any selected platform supports automations
  const hasAutomationSupport = useMemo(() => {
    // Currently only Google Ads supports automations
    return selectedPlatforms.includes('google')
  }, [selectedPlatforms])

  // Handle navigation to Google Ads automation page
  const handleCreateAutomation = () => {
    if (onCreateAutomation) {
      onCreateAutomation()
    } else {
      navigate('/alvoads-google?tab=automations')
    }
  }

  // Handle viewing an automation
  const handleViewAutomation = (automation: UnifiedAutomationRule) => {
    if (automation.platform === 'google') {
      navigate(`/alvoads-google?tab=automations&edit=${automation.id}`)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Carregando automações...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h3>Erro ao carregar automações</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  // No automation support (Meta only selected)
  if (!hasAutomationSupport) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Automações</h2>
        </div>
        <div className={styles.comingSoonState}>
          <div className={styles.comingSoonIcon}>
            <Clock size={48} />
          </div>
          <h3>Em breve para Meta Ads</h3>
          <p>
            Automações estão disponíveis apenas para Google Ads no momento.
            Selecione Google Ads no seletor de plataformas para acessar as automações.
          </p>
        </div>
      </div>
    )
  }

  // Empty state
  if (automations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Automações</h2>
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={handleCreateAutomation}
          >
            Nova Automação
          </Button>
        </div>
        <EmptyState
          icon={<Settings size={48} />}
          title="Nenhuma automação configurada"
          description="Crie regras automáticas para gerenciar suas campanhas com base em métricas de performance."
          action={
            <Button
              variant="secondary"
              onClick={handleCreateAutomation}
            >
              Criar primeira automação
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Automações</h2>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={handleCreateAutomation}
        >
          Nova Automação
        </Button>
      </div>

      {/* Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{automations.length}</span>
          <span className={styles.summaryLabel}>Total</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${styles.active}`}>
            {automations.filter((a) => a.isActive).length}
          </span>
          <span className={styles.summaryLabel}>Ativas</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryValue} ${styles.paused}`}>
            {automations.filter((a) => !a.isActive).length}
          </span>
          <span className={styles.summaryLabel}>Pausadas</span>
        </div>
      </div>

      {/* Automations List */}
      <div className={styles.automationsList}>
        {automations.map((automation) => (
          <button
            type="button"
            key={automation.id}
            className={`${styles.automationCard} ${!automation.isActive ? styles.inactive : ''}`}
            onClick={() => handleViewAutomation(automation)}
          >
            <div className={styles.automationHeader}>
              <div className={styles.automationInfo}>
                <PlatformBadge platform={automation.platform} size="sm" />
                <div className={styles.statusIndicator}>
                  {automation.isActive ? (
                    <Play size={14} className={styles.activeIcon} />
                  ) : (
                    <Pause size={14} className={styles.pausedIcon} />
                  )}
                </div>
              </div>
              <ExternalLink size={16} className={styles.externalIcon} />
            </div>

            <h3 className={styles.automationName}>{automation.name}</h3>

            {automation.description && (
              <p className={styles.automationDescription}>{automation.description}</p>
            )}

            <div className={styles.automationMeta}>
              <span className={styles.actionType}>
                {getActionLabel(automation.actionType)}
              </span>
              <span className={styles.lastRun}>
                <Clock size={12} />
                {formatDate(automation.lastRunAt)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Platform-specific note */}
      {selectedPlatforms.includes('meta') && (
        <div className={styles.platformNote}>
          <AlertCircle size={16} />
          <span>Automações para Meta Ads estarão disponíveis em breve.</span>
        </div>
      )}
    </div>
  )
}

export default UnifiedAutomationView
