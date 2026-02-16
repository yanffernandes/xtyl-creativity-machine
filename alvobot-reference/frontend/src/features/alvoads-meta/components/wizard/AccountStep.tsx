import { useState, useCallback, useMemo } from 'react'
import { Plus, AlertCircle, Loader2, Building2, Check, X, Layers, Search, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { serviceIcons } from '@/assets/icons/services'
import { useConnections } from '@/features/connections/api/useConnections'
import { Button, Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useMetaAdAccounts } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { MetaAdAccount } from '../../types/campaign'

interface MetaConnection {
  id: string
  connection_name: string
  plataform_name: string
  is_active: boolean
  metadata?: {
    type?: string
    user_name?: string
    user_email?: string
  }
}

export function AccountStep() {
  const {
    accounts,
    connectionId,
    setConnectionId,
    toggleAccount,
    isAccountSelected,
    clearAccounts,
    removeAccount,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  // Local state for connection selection
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | undefined>(
    connectionId || (accounts.length > 0 ? accounts[0].connectionId : undefined)
  )

  // Fetch Meta connections from current workspace
  const { data: allConnections, isLoading: loadingConnections, error: connectionsError } = useConnections({
    platform: 'meta',
    status: 'active',
  })
  // Filter to ads connections only
  const connections = (allConnections as MetaConnection[] | undefined)?.filter(c => c.metadata?.type === 'ads')

  // Fetch ad accounts for selected connection
  const {
    data: adAccountsData,
    isLoading: loadingAccounts,
    error: accountsError,
  } = useMetaAdAccounts(selectedConnectionId)

  const [accountSearch, setAccountSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const handleConnectionSelect = (connection: MetaConnection) => {
    setSelectedConnectionId(connection.id)
  }

  const handleAccountSelect = useCallback((account: MetaAdAccount) => {
    if (!selectedConnectionId) return

    const accountToToggle = {
      id: account.id,
      name: account.name,
      accountId: account.accountId,
      connectionId: selectedConnectionId,
      currency: account.currency,
      timezone: account.timezone,
      status: account.status,
      businessName: account.businessName,
    }

    // Toggle account selection
    toggleAccount(accountToToggle)

    // Also update the connection ID in the store
    setConnectionId(selectedConnectionId)

    // Mark step completed if at least one account is selected
    setTimeout(() => {
      const newState = useMetaAdsWizardStore.getState()
      if (newState.accounts.length > 0) {
        markStepCompleted('account')
      } else {
        markStepIncomplete('account')
      }
    }, 0)
  }, [selectedConnectionId, toggleAccount, setConnectionId, markStepCompleted, markStepIncomplete])

  const hasConnections = connections && connections.length > 0
  // adAccountsData is directly the array of accounts from useMetaAdAccounts
  const adAccounts = useMemo(() => adAccountsData || [], [adAccountsData])
  const hasAccounts = adAccounts.length > 0

  // Separate active and inactive accounts
  const { activeAccounts, inactiveAccounts } = useMemo(() => {
    const filtered = adAccounts.filter((account) => {
      if (!accountSearch.trim()) return true
      const term = accountSearch.toLowerCase()
      const name = (account.name || '').toLowerCase()
      const accountId = (account.accountId || '').toLowerCase()
      const businessName = (account.businessName || '').toLowerCase()
      return name.includes(term) || accountId.includes(term) || businessName.includes(term)
    })

    return {
      activeAccounts: filtered.filter(account => account.status === 'ACTIVE'),
      inactiveAccounts: filtered.filter(account => account.status !== 'ACTIVE'),
    }
  }, [adAccounts, accountSearch])

  const selectedConnection = connections?.find(c => c.id === selectedConnectionId)
  const selectedAccountsCount = accounts.length

  return (
    <div className={styles.stepContent}>
      {/* Step 1: Select Connection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>1. Selecione a Conexão Meta</h3>
        <p className={styles.sectionDescription}>
          Escolha qual conta Meta será usada para criar os anúncios
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
            <h4>Nenhuma conexão Meta Ads encontrada</h4>
            <p>Você precisa conectar uma conta Meta com permissões de anúncios para criar campanhas.</p>
            <Link to="/connections">
              <Button variant="primary" leftIcon={<Plus size={16} />}>
                Conectar conta Meta
              </Button>
            </Link>
          </div>
        ) : (
          <div className={styles.optionsGrid}>
            {connections.map((conn) => (
              <button
                key={conn.id}
                type="button"
                className={`${styles.optionCard} ${styles.connectionCard} ${selectedConnectionId === conn.id ? styles.selected : ''}`}
                onClick={() => handleConnectionSelect(conn)}
              >
                <div className={styles.connectionCardContent}>
                  <div className={styles.connectionIcon}>
                    <img src={serviceIcons.meta_ads} alt="Meta Ads" width={24} height={24} />
                  </div>
                  <div className={styles.connectionInfo}>
                    <span className={styles.optionLabel}>{conn.connection_name}</span>
                    <span className={styles.optionDescription}>
                      {conn.metadata?.user_email || conn.metadata?.user_name || 'Meta Ads'}
                    </span>
                  </div>
                  {selectedConnectionId === conn.id && (
                    <Check size={20} className={styles.checkIcon} />
                  )}
                </div>
              </button>
            ))}
            <Link to="/connections" className={styles.addNewCard}>
              <Plus size={24} />
              <span>Adicionar nova conexão</span>
            </Link>
          </div>
        )}
      </section>

      {/* Step 2: Select Ad Accounts */}
      {selectedConnectionId && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>2. Selecione a Conta de Anúncios</h3>
          <p className={styles.sectionDescription}>
            Escolha em quais contas de anúncios a campanha será criada.
            Você pode selecionar múltiplas contas.
            {selectedConnection && (
              <span style={{ display: 'block', marginTop: 'var(--space-1)', color: 'var(--color-text-tertiary)' }}>
                Conexão: {selectedConnection.connection_name}
              </span>
            )}
          </p>

          {loadingAccounts ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <span>Buscando contas de anúncios...</span>
            </div>
          ) : accountsError ? (
            <div className={styles.errorState}>
              <AlertCircle size={24} />
              <span>Erro ao carregar contas. Verifique se a conexão tem acesso ao Meta Ads.</span>
            </div>
          ) : !hasAccounts ? (
            <div className={styles.emptyState}>
              <Building2 size={32} className={styles.emptyIcon} />
              <h4>Nenhuma conta de anúncios encontrada</h4>
              <p>
                Esta conexão não tem acesso a nenhuma conta de anúncios Meta.
                Verifique se você tem permissão em alguma conta Business Manager.
              </p>
            </div>
          ) : (
            <>
              <Input
                className={styles.searchInput}
                placeholder="Buscar por nome, ID ou negocio..."
                value={accountSearch}
                onChange={(event) => setAccountSearch(event.target.value)}
                leftIcon={<Search size={16} />}
                size="md"
              />

              {activeAccounts.length === 0 && inactiveAccounts.length === 0 ? (
                <div className={styles.emptyState}>
                  <Building2 size={32} className={styles.emptyIcon} />
                  <h4>Nenhuma conta encontrada</h4>
                  <p>Refine sua busca ou limpe o filtro.</p>
                </div>
              ) : (
                <>
                  {activeAccounts.length > 0 ? (
                    <div className={styles.optionsGrid}>
                      {activeAccounts.map((account) => {
                        const isSelected = isAccountSelected(account.id)

                        return (
                          <button
                            key={account.id}
                            type="button"
                            className={`${styles.optionCard} ${styles.accountCard} ${isSelected ? styles.selected : ''}`}
                            onClick={() => handleAccountSelect(account)}
                          >
                            <div className={styles.accountCardContent}>
                              <div className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}>
                                {isSelected && <Check size={14} />}
                              </div>
                              <div className={styles.accountInfo}>
                                <span className={styles.accountName}>
                                  {account.name || `Conta ${account.accountId}`}
                                </span>
                                <div className={styles.accountMeta}>
                                  <span className={styles.accountId}>ID: {account.accountId}</span>
                                  {account.businessName && (
                                    <span className={styles.accountBusiness}>{account.businessName}</span>
                                  )}
                                </div>
                                <div className={styles.accountDetails}>
                                  <span>{account.currency}</span>
                                  <span className={styles.separator}>•</span>
                                  <span>{account.timezone}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      <Building2 size={32} className={styles.emptyIcon} />
                      <h4>Nenhuma conta ativa encontrada</h4>
                      <p>Todas as contas estão inativas ou desabilitadas.</p>
                    </div>
                  )}

                  {/* Inactive accounts collapsible section */}
                  {inactiveAccounts.length > 0 && (
                    <div className={styles.inactiveSection}>
                      <button
                        type="button"
                        className={styles.inactiveToggle}
                        onClick={() => setShowInactive(!showInactive)}
                      >
                        <ChevronDown
                          size={16}
                          className={`${styles.inactiveToggleIcon} ${showInactive ? styles.expanded : ''}`}
                        />
                        <span className={styles.inactiveToggleText}>
                          Contas inativas
                        </span>
                        <span className={styles.inactiveToggleCount}>
                          {inactiveAccounts.length}
                        </span>
                      </button>

                      <div className={`${styles.inactiveContent} ${showInactive ? styles.expanded : ''}`}>
                        <p className={styles.inactiveLabel}>
                          Estas contas não estão disponíveis para criação de campanhas
                        </p>
                        <div className={styles.inactiveGrid}>
                          {inactiveAccounts.map((account) => (
                            <div
                              key={account.id}
                              className={`${styles.optionCard} ${styles.accountCard} ${styles.inactive}`}
                            >
                              <div className={styles.accountCardContent}>
                                <div className={styles.checkboxIndicator} />
                                <div className={styles.accountInfo}>
                                  <span className={styles.accountName}>
                                    {account.name || `Conta ${account.accountId}`}
                                  </span>
                                  <div className={styles.accountMeta}>
                                    <span className={styles.accountId}>ID: {account.accountId}</span>
                                    {account.businessName && (
                                      <span className={styles.accountBusiness}>{account.businessName}</span>
                                    )}
                                  </div>
                                  <div className={styles.accountDetails}>
                                    <span>{account.currency}</span>
                                    <span className={styles.separator}>•</span>
                                    <span>{account.timezone}</span>
                                    <span className={styles.inactiveBadge}>Inativa</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
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
              <div key={acc.id} className={styles.selectedItemChip}>
                <span>{acc.name || acc.accountId}</span>
                <button
                  type="button"
                  className={styles.selectedItemChipRemove}
                  onClick={() => {
                    removeAccount(acc.id)
                    setTimeout(() => {
                      if (useMetaAdsWizardStore.getState().accounts.length === 0) {
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
    </div>
  )
}
