import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, Loader2, Building2, Check, ChevronDown, Users, X, Layers, RefreshCw, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConnections } from '@/features/connections/api/useConnections'
import { Button } from '@/shared/components'
import { getConnectionStatus, type ConnectionStatusType } from '@/shared/utils/connectionStatus'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'
import { useGoogleAdsAccounts, useManagedAccounts, googleCampaignKeys, type GoogleAdsAccount } from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'

interface GoogleConnection {
  id: string
  connection_name: string
  plataform_name: string
  is_active: boolean
  needs_reconnect?: boolean
  last_refresh_error?: string | null
  token_expires_at?: string | null
  metadata?: {
    type?: string
    user_name?: string
    user_email?: string
    customer_id?: string
    customer_name?: string
  }
}

function getStatusBadgeClass(status: ConnectionStatusType): string {
  switch (status) {
    case 'connected': return styles.statusConnected
    case 'disconnected': return styles.statusDisconnected
    case 'expired': return styles.statusExpired
    case 'needs_reconnect': return styles.statusNeedsReconnect
  }
}

// Type for tracking expanded MCCs at any level
// Key is the full path to the MCC (e.g., "123" for root MCC, "123/456" for nested MCC)
type ExpandedMccsMap = Record<string, boolean>

export function StepAccount() {
  const {
    accounts,
    toggleAccount,
    isAccountSelected,
    clearAccounts,
    removeAccount,
    markStepCompleted,
    markStepIncomplete,
    getTotalCampaignsCount,
    sourceArticles,
  } = useGoogleAdsWizardStore()

  const queryClient = useQueryClient()

  // Local state for connection selection flow
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | undefined>(
    accounts.length > 0 ? accounts[0].connectionId : undefined
  )

  // State for expanded MCC accounts - now supports multiple levels
  // Key is the path to the MCC (e.g., "123" for root, "123/456" for MCC 456 inside MCC 123)
  const [expandedMccs, setExpandedMccs] = useState<ExpandedMccsMap>({})

  // Buscar todas as conexões Google do workspace (incluindo inativas para mostrar status)
  const { data: allConnections, isLoading: loadingConnections, error: connectionsError } = useConnections({
    platform: 'google',
  })

  // Filtrar apenas conexões do tipo 'ads' (ou sem tipo para suporte legado)
  const connections = useMemo(() => {
    if (!allConnections) return undefined
    return (allConnections as GoogleConnection[]).filter(c => {
      const type = c.metadata?.type
      return !type || type === 'ads'
    })
  }, [allConnections])

  // Contagem de conexões Google de outros serviços (para mensagem contextual)
  const otherGoogleConnectionsCount = useMemo(() => {
    if (!allConnections) return 0
    return (allConnections as GoogleConnection[]).filter(c => {
      const type = c.metadata?.type
      return type && type !== 'ads'
    }).length
  }, [allConnections])

  // Buscar contas Google Ads da conexão selecionada
  const {
    data: googleAdsAccounts,
    isLoading: loadingAccounts,
    error: accountsError
  } = useGoogleAdsAccounts(selectedConnectionId)

  const handleConnectionSelect = (connection: GoogleConnection) => {
    // Don't allow selecting unhealthy connections
    const status = getConnectionStatus(connection)
    if (status.status !== 'connected') return

    setSelectedConnectionId(connection.id)
    // Keep existing selected accounts - don't clear them when switching connections
    // This allows selecting accounts from multiple connections
  }

  // Toggle expansion of an MCC at any level
  const toggleMccExpansion = useCallback((mccPath: string) => {
    setExpandedMccs(prev => ({
      ...prev,
      [mccPath]: !prev[mccPath]
    }))
  }, [])

  // Check if an MCC path is expanded
  const isMccExpanded = useCallback((mccPath: string) => {
    return !!expandedMccs[mccPath]
  }, [expandedMccs])

  // Handle root-level account selection (not managed by MCC)
  const handleAccountSelect = (adsAccount: GoogleAdsAccount) => {
    if (!selectedConnectionId) return

    // Se é uma conta MCC, não permitir seleção direta - expandir para mostrar contas gerenciadas
    if (adsAccount.isManager) {
      toggleMccExpansion(adsAccount.customerId)
      return
    }

    // Toggle account selection (multi-select)
    toggleAccount({
      connectionId: selectedConnectionId,
      customerId: adsAccount.customerId,
      customerName: adsAccount.name,
      currency: adsAccount.currency,
      timezone: adsAccount.timezone,
      isManager: false,
      loginCustomerId: adsAccount.loginCustomerId,
    })

    // Mark step completed if at least one account is selected
    // We need to check after the toggle, so use a setTimeout to ensure state is updated
    setTimeout(() => {
      if (useGoogleAdsWizardStore.getState().accounts.length > 0) {
        markStepCompleted('account')
      } else {
        markStepIncomplete('account')
      }
    }, 0)
  }

  // Handler for selecting a managed account under an MCC (at any nesting level)
  const handleManagedAccountSelect = useCallback((
    managedAccount: GoogleAdsAccount,
    mccPath: string[], // Full path of MCC IDs from root to parent
    currentMccId: string, // The MCC this account is directly under
  ) => {
    if (!selectedConnectionId) return

    // If it's a sub-MCC, toggle its expansion instead of selecting
    if (managedAccount.isManager) {
      const newPath = [...mccPath, currentMccId, managedAccount.customerId].join('/')
      toggleMccExpansion(newPath)
      return
    }

    // The loginCustomerId should be the root MCC (first in the path)
    // This is required for Google Ads API authentication on nested accounts
    const loginCustomerId = mccPath.length > 0 ? mccPath[0] : currentMccId

    // Toggle account selection (multi-select)
    toggleAccount({
      connectionId: selectedConnectionId,
      customerId: managedAccount.customerId,
      customerName: managedAccount.name,
      currency: managedAccount.currency,
      timezone: managedAccount.timezone,
      isManager: false,
      loginCustomerId,
    })

    // Mark step completed if at least one account is selected
    setTimeout(() => {
      if (useGoogleAdsWizardStore.getState().accounts.length > 0) {
        markStepCompleted('account')
      } else {
        markStepIncomplete('account')
      }
    }, 0)
  }, [selectedConnectionId, toggleAccount, markStepCompleted, markStepIncomplete, toggleMccExpansion])

  const hasConnections = connections && connections.length > 0
  const hasAccounts = googleAdsAccounts && googleAdsAccounts.length > 0
  const selectedConnection = connections?.find(c => c.id === selectedConnectionId)
  const selectedAccountsCount = accounts.length
  const totalCampaigns = getTotalCampaignsCount()
  const articlesCount = sourceArticles.length

  // Recursive component to render managed accounts at any level
  const ManagedAccountsList = ({
    mccCustomerId,
    mccPath,
    depth,
  }: {
    mccCustomerId: string
    mccPath: string[] // Path of MCC IDs from root to parent (not including current MCC)
    depth: number
  }) => {
    // Fetch managed accounts for this MCC
    const {
      data: managedAccounts,
      isLoading: loadingManagedAccounts,
    } = useManagedAccounts(selectedConnectionId, mccCustomerId, mccPath.length > 0 ? mccPath : undefined)

    if (loadingManagedAccounts) {
      return (
        <div className={styles.loadingState} style={{ padding: '12px' }}>
          <Loader2 size={16} className={styles.spinner} />
          <span style={{ fontSize: '13px' }}>Carregando contas gerenciadas...</span>
        </div>
      )
    }

    if (!managedAccounts || managedAccounts.length === 0) {
      return (
        <div style={{ padding: '12px', color: 'var(--color-text-tertiary)', fontSize: '13px' }}>
          Nenhuma conta cliente encontrada nesta MCC.
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {managedAccounts.map((managedAccount) => {
          const isSubMcc = managedAccount.isManager
          const subMccPath = [...mccPath, mccCustomerId, managedAccount.customerId].join('/')
          const isSubMccExpanded = isSubMcc && isMccExpanded(subMccPath)
          const isSelected = !isSubMcc && isAccountSelected(managedAccount.customerId)

          return (
            <div key={managedAccount.customerId}>
              <button
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${isSubMcc ? styles.mccAccount : ''}`}
                onClick={() => handleManagedAccountSelect(managedAccount, mccPath, mccCustomerId)}
                style={{ borderLeft: `3px solid var(--color-primary)` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* Checkbox for non-MCC accounts */}
                    {!isSubMcc && (
                      <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    )}
                    <div>
                      <span className={styles.optionLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSubMcc && <Users size={14} style={{ color: 'var(--color-primary)' }} />}
                        {managedAccount.name || `Conta ${managedAccount.customerId}`}
                      </span>
                      <span className={styles.optionDescription}>
                        ID: {managedAccount.customerId}
                        {isSubMcc && (
                          <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}> (Sub-MCC)</span>
                        )}
                      </span>
                      <span className={styles.optionDescription} style={{ fontSize: '11px' }}>
                        {managedAccount.currency} • {managedAccount.timezone}
                      </span>
                      {isSubMcc && (
                        <span className={styles.optionDescription} style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                          Clique para ver as contas gerenciadas
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isSubMcc && (
                      <ChevronDown
                        size={20}
                        style={{
                          color: 'var(--color-text-secondary)',
                          transform: isSubMccExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    )}
                  </div>
                </div>
              </button>

              {/* Recursively render sub-MCC's managed accounts */}
              {isSubMcc && isSubMccExpanded && (
                <div style={{ marginLeft: '24px', marginTop: '8px', marginBottom: '8px' }}>
                  <ManagedAccountsList
                    mccCustomerId={managedAccount.customerId}
                    mccPath={[...mccPath, mccCustomerId]}
                    depth={depth + 1}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.stepContent}>
      {/* Step 1: Select Connection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>1. Selecione a Conexão Google</h3>
        <p className={styles.sectionDescription}>
          Escolha qual conta Google vai ser usada para acessar o Google Ads
        </p>

        {loadingConnections ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando conexões...</span>
          </div>
        ) : connectionsError ? (
          <div className={styles.errorState}>
            <AlertCircle size={24} />
            <span>Erro ao carregar conexões</span>
          </div>
        ) : !hasConnections ? (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <h4>Nenhuma conexão Google Ads encontrada</h4>
            <p>
              {otherGoogleConnectionsCount > 0
                ? `Você tem ${otherGoogleConnectionsCount} ${otherGoogleConnectionsCount === 1 ? 'conexão Google de outro serviço' : 'conexões Google de outros serviços'} (Ad Manager, AdSense, etc). Para criar campanhas, conecte uma conta com acesso ao Google Ads.`
                : 'Você precisa conectar uma conta Google com acesso ao Google Ads para criar campanhas.'}
            </p>
            <Link to="/connections">
              <Button variant="primary" leftIcon={<Plus size={16} />}>
                Conectar conta Google Ads
              </Button>
            </Link>
          </div>
        ) : (
          <div className={styles.optionsGrid}>
            {connections.map((conn) => {
              const connStatus = getConnectionStatus(conn)
              const isHealthy = connStatus.status === 'connected'
              const isSelected = selectedConnectionId === conn.id

              return (
                <button
                  key={conn.id}
                  type="button"
                  className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${!isHealthy ? styles.connectionDisabled : ''}`}
                  onClick={() => handleConnectionSelect(conn)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.optionLabel}>{conn.connection_name}</span>
                        <span className={`${styles.connectionStatusBadge} ${getStatusBadgeClass(connStatus.status)}`}>
                          {connStatus.label}
                        </span>
                      </div>
                      <span className={styles.optionDescription}>
                        {conn.metadata?.user_email || 'Google Ads'}
                      </span>
                      {!isHealthy && (
                        <Link
                          to="/connections"
                          className={styles.connectionReconnectLink}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={11} />
                          {connStatus.status === 'needs_reconnect' ? 'Reconectar' : 'Gerenciar conexão'}
                        </Link>
                      )}
                    </div>
                    {isSelected && isHealthy && (
                      <Check size={20} style={{ color: 'var(--color-success)' }} />
                    )}
                  </div>
                </button>
              )
            })}
            <Link to="/connections" className={styles.addNewCard}>
              <Plus size={24} />
              <span>Adicionar nova conexão</span>
            </Link>
          </div>
        )}
      </section>

      {/* Step 2: Select Google Ads Account (shown after connection is selected) */}
      {selectedConnectionId && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>2. Selecione a Conta Google Ads</h3>
          <p className={styles.sectionDescription}>
            Escolha em qual conta de anúncios a campanha será criada
            {selectedConnection && (
              <span style={{ display: 'block', marginTop: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
                Conexão: {selectedConnection.connection_name}
              </span>
            )}
          </p>

          {loadingAccounts ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Buscando contas Google Ads...</span>
            </div>
          ) : accountsError ? (
            <div className={styles.errorStateWithRetry}>
              <AlertCircle size={32} style={{ color: 'var(--color-error)' }} />
              <p>
                Não foi possível buscar as contas Google Ads. Verifique se a conexão está funcionando corretamente.
              </p>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw size={14} />}
                onClick={() => {
                  if (selectedConnectionId) {
                    queryClient.invalidateQueries({
                      queryKey: googleCampaignKeys.accounts(selectedConnectionId),
                    })
                  }
                }}
              >
                Tentar novamente
              </Button>
            </div>
          ) : !hasAccounts ? (
            <div className={styles.emptyState}>
              <Building2 size={32} className={styles.emptyIcon} />
              <h4>Nenhuma conta Google Ads encontrada</h4>
              <p>
                {selectedConnection?.metadata?.user_email
                  ? `O email ${selectedConnection.metadata.user_email} não tem acesso a nenhuma conta Google Ads. Verifique se o email tem permissão em alguma conta de anúncios.`
                  : 'Esta conexão Google não tem acesso a nenhuma conta Google Ads. Verifique se o email tem permissão em alguma conta de anúncios.'}
              </p>
            </div>
          ) : (
            <div className={styles.optionsGrid}>
              {googleAdsAccounts.map((adsAccount) => {
                const isRootMccExpanded = adsAccount.isManager && isMccExpanded(adsAccount.customerId)
                const isSelected = !adsAccount.isManager && isAccountSelected(adsAccount.customerId)

                return (
                  <div key={adsAccount.customerId}>
                    <button
                      type="button"
                      className={`${styles.optionCard} ${isSelected ? styles.selected : ''} ${adsAccount.isManager ? styles.mccAccount : ''}`}
                      onClick={() => handleAccountSelect(adsAccount)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          {/* Checkbox for non-MCC accounts */}
                          {!adsAccount.isManager && (
                            <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                              {isSelected && <Check size={14} />}
                            </div>
                          )}
                          <div>
                            <span className={styles.optionLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {adsAccount.isManager && <Users size={14} style={{ color: 'var(--color-primary)' }} />}
                              {adsAccount.name || `Conta ${adsAccount.customerId}`}
                            </span>
                            <span className={styles.optionDescription}>
                              ID: {adsAccount.customerId}
                              {adsAccount.isManager && (
                                <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}> (Conta Gerenciadora - MCC)</span>
                              )}
                            </span>
                            <span className={styles.optionDescription} style={{ fontSize: '11px' }}>
                              {adsAccount.currency} • {adsAccount.timezone}
                            </span>
                            {adsAccount.isManager && (
                              <span className={styles.optionDescription} style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                                Clique para ver as contas gerenciadas
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {adsAccount.isManager && (
                            <ChevronDown
                              size={20}
                              style={{
                                color: 'var(--color-text-secondary)',
                                transform: isRootMccExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease'
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Contas gerenciadas pela MCC (recursivo) */}
                    {adsAccount.isManager && isRootMccExpanded && (
                      <div style={{ marginLeft: '24px', marginTop: '8px', marginBottom: '8px' }}>
                        <ManagedAccountsList
                          mccCustomerId={adsAccount.customerId}
                          mccPath={[]}
                          depth={1}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Selected Accounts Summary */}
      {selectedAccountsCount > 0 && (
        <section className={styles.section}>
          <div className={styles.selectionCounter}>
            <Layers size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>{selectedAccountsCount}</strong> {selectedAccountsCount === 1 ? 'conta selecionada' : 'contas selecionadas'}
              {articlesCount > 0 && (
                <span> • {totalCampaigns} {totalCampaigns === 1 ? 'campanha será criada' : 'campanhas serão criadas'}</span>
              )}
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={() => {
                  clearAccounts()
                  markStepIncomplete('account')
                }}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>

          {/* List of selected accounts as chips */}
          <div className={styles.selectedItemsList}>
            {accounts.map((acc) => (
              <div key={acc.customerId} className={styles.selectedItemChip}>
                <span>{acc.customerName || acc.customerId}</span>
                <button
                  type="button"
                  className={styles.selectedItemChipRemove}
                  onClick={() => {
                    removeAccount(acc.customerId)
                    // Check if we still have accounts
                    setTimeout(() => {
                      if (useGoogleAdsWizardStore.getState().accounts.length === 0) {
                        markStepIncomplete('account')
                      }
                    }, 0)
                  }}
                  title="Remover conta"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Campaign Type */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tipo de Campanha</h3>
        <p className={styles.sectionDescription}>
          Selecione o tipo de rede onde seus anúncios serão exibidos
        </p>

        <div className={styles.optionsGrid}>
          <button
            type="button"
            className={`${styles.optionCard} ${styles.selected}`}
          >
            <span className={styles.optionLabel}>Rede de Pesquisa</span>
            <span className={styles.optionDescription}>
              Anúncios de texto que aparecem nos resultados de busca do Google
            </span>
          </button>
          <button
            type="button"
            className={styles.optionCard}
            disabled
          >
            <span className={styles.optionLabel}>Rede de Display</span>
            <span className={styles.optionDescription}>
              Anúncios visuais em sites parceiros do Google (em breve)
            </span>
          </button>
        </div>
      </section>

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
