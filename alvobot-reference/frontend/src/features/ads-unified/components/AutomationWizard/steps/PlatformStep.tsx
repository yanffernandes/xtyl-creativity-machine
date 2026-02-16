/**
 * PlatformStep — Step 1 of AutomationWizard
 *
 * Collects: name, description, platform, ad accounts, campaign type (Google), level.
 * Ad accounts are fetched from Supabase with RLS (workspace-scoped).
 * Includes search bar and connection filter for better UX.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input, Textarea, Select } from '@/shared/components'
import { supabase } from '@/shared/utils/supabase'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import type { UseAutomationFormReturn } from '../../../hooks/useAutomationForm'
import type { Platform, EntityLevel, GoogleCampaignType } from '../../../types/automation'
import {
  PLATFORM_OPTIONS,
  ENTITY_LEVEL_OPTIONS,
  LEVELS_BY_PLATFORM,
  GOOGLE_CAMPAIGN_TYPE_OPTIONS,
} from '../../../constants/enums'
import styles from '../AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface PlatformStepProps {
  form: UseAutomationFormReturn
}

/** Normalized ad account shape used within this component */
interface AdAccount {
  /** Unique ID: account_id for Meta, customer_id for Google */
  id: string
  /** Display name */
  name: string
  /** Primary connection UUID (first found) */
  connectionId: string
  /** Primary connection display name */
  connectionName: string
  /** All connection IDs this account belongs to (for backend resolution) */
  allConnectionIds: string[]
  /** Currency code (e.g. BRL, USD) */
  currency: string
  /** Meta-only: business name */
  businessName?: string
}

// ============================================================================
// DATA HOOKS
// ============================================================================

/**
 * Deduplicates accounts by ID. When the same account exists in multiple
 * connections, keeps the first entry and merges all connection IDs.
 */
function deduplicateAccounts(accounts: AdAccount[]): AdAccount[] {
  const seen = new Map<string, AdAccount>()
  for (const acc of accounts) {
    const existing = seen.get(acc.id)
    if (existing) {
      // Merge connection IDs
      if (!existing.allConnectionIds.includes(acc.connectionId)) {
        existing.allConnectionIds.push(acc.connectionId)
      }
    } else {
      seen.set(acc.id, { ...acc })
    }
  }
  return Array.from(seen.values())
}

/**
 * Fetches active ad accounts for the selected platform,
 * filtered by the current workspace and joined with connection name.
 * Also applies RLS as an extra safety layer.
 */
function useAdAccountsForPlatform(platform: Platform, workspaceId: string | undefined) {
  return useQuery<AdAccount[]>({
    queryKey: ['automation-wizard', 'ad-accounts', platform, workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (platform === 'meta') {
        const { data, error } = await supabase
          .from('meta_ad_accounts')
          .select('account_id, account_name, connection_id, is_active, business_name, currency, connections!inner(connection_name, is_active, deleted_at)')
          .eq('is_active', true)
          .eq('workspace_id', workspaceId!)
          .eq('connections.is_active', true)
          .is('connections.deleted_at', null)

        if (error) throw error

        return deduplicateAccounts(
          (data ?? []).map((row: Record<string, unknown>) => {
            const conn = row.connections as { connection_name: string } | null
            return {
              id: row.account_id as string,
              name: (row.account_name as string) || `Conta ${(row.account_id as string).slice(0, 8)}`,
              connectionId: row.connection_id as string,
              connectionName: conn?.connection_name || 'Conexão sem nome',
              allConnectionIds: [row.connection_id as string],
              currency: (row.currency as string) || 'BRL',
              businessName: (row.business_name as string) || undefined,
            }
          }),
        )
      }

      // Google
      const { data, error } = await supabase
        .from('google_ads_accounts')
        .select('customer_id, name, connection_id, is_active, currency, connections!inner(connection_name, is_active, deleted_at)')
        .eq('is_active', true)
        .eq('workspace_id', workspaceId!)
        .eq('connections.is_active', true)
        .is('connections.deleted_at', null)

      if (error) throw error

      return deduplicateAccounts(
        (data ?? []).map((row: Record<string, unknown>) => {
          const conn = row.connections as { connection_name: string } | null
          return {
            id: row.customer_id as string,
            name: (row.name as string) || `Conta ${(row.customer_id as string).slice(0, 8)}`,
            connectionId: row.connection_id as string,
            connectionName: conn?.connection_name || 'Conexão sem nome',
            allConnectionIds: [row.connection_id as string],
            currency: (row.currency as string) || 'BRL',
          }
        }),
      )
    },
    staleTime: 5 * 60 * 1000, // 5 min
  })
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PlatformStep({ form }: PlatformStepProps) {
  const { state, updateField } = form
  const workspaceId = useWorkspaceId()

  // ── Local UI state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionFilterIds, setConnectionFilterIds] = useState<string[]>([])
  const [showConnectionFilter, setShowConnectionFilter] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setShowConnectionFilter(false)
      }
    }
    if (showConnectionFilter) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showConnectionFilter])

  // Fetch ad accounts for the selected platform (workspace-scoped)
  const { data: adAccounts = [], isLoading: accountsLoading } =
    useAdAccountsForPlatform(state.platform, workspaceId)

  // Unique connections (for the filter dropdown)
  const availableConnections = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    for (const acc of adAccounts) {
      if (map.has(acc.connectionId)) {
        map.get(acc.connectionId)!.count++
      } else {
        map.set(acc.connectionId, {
          id: acc.connectionId,
          name: acc.connectionName,
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [adAccounts])

  // Apply search + connection filter to accounts
  const filteredAccounts = useMemo(() => {
    let result = adAccounts

    // Connection filter
    if (connectionFilterIds.length > 0) {
      result = result.filter((a) => connectionFilterIds.includes(a.connectionId))
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.businessName && a.businessName.toLowerCase().includes(q)) ||
          a.connectionName.toLowerCase().includes(q),
      )
    }

    return result
  }, [adAccounts, connectionFilterIds, searchQuery])

  // Group filtered accounts by connection for display
  const groupedAccounts = useMemo(() => {
    const groups = new Map<string, { connectionName: string; accounts: AdAccount[] }>()
    for (const account of filteredAccounts) {
      const key = account.connectionId
      if (!groups.has(key)) {
        groups.set(key, { connectionName: account.connectionName, accounts: [] })
      }
      groups.get(key)!.accounts.push(account)
    }
    return Array.from(groups.values())
  }, [filteredAccounts])

  // Available levels for the selected platform + campaign type
  const availableLevels = useMemo(() => {
    const platformLevels = LEVELS_BY_PLATFORM[state.platform] ?? []

    // For Google + Performance Max, only campaign and ad_account
    if (
      state.platform === 'google' &&
      state.googleCampaignType === 'performance_max'
    ) {
      return ENTITY_LEVEL_OPTIONS.filter(
        (o) =>
          (o.value === 'campaign' || o.value === 'ad_account') &&
          platformLevels.includes(o.value),
      )
    }

    return ENTITY_LEVEL_OPTIONS.filter((o) => platformLevels.includes(o.value))
  }, [state.platform, state.googleCampaignType])

  // When platform changes, reset platform-specific fields
  const handlePlatformChange = (platform: Platform) => {
    updateField('platform', platform)
    updateField('connectionIds', [])
    updateField('adAccountIds', [])
    updateField('googleCampaignType', '')
    setSearchQuery('')
    setConnectionFilterIds([])

    // Default level for the platform
    const levels = LEVELS_BY_PLATFORM[platform] ?? []
    if (levels.length > 0 && !levels.includes(state.level)) {
      updateField('level', levels[0] as EntityLevel)
    }
  }

  // When campaign type changes, validate level
  const handleCampaignTypeChange = (type: string) => {
    updateField('googleCampaignType', type as GoogleCampaignType)

    if (type === 'performance_max' && state.level !== 'campaign' && state.level !== 'ad_account') {
      updateField('level', 'campaign')
    }
  }

  // Derive unique connectionIds from the selected ad accounts (includes all connections per account)
  const deriveConnectionIds = useCallback(
    (selectedAccountIds: string[]) => {
      const connIds = new Set<string>()
      for (const account of adAccounts) {
        if (selectedAccountIds.includes(account.id)) {
          for (const cid of account.allConnectionIds) {
            connIds.add(cid)
          }
        }
      }
      return Array.from(connIds)
    },
    [adAccounts],
  )

  // Toggle a single ad account
  const handleAccountToggle = (accountId: string) => {
    const isSelected = state.adAccountIds.includes(accountId)
    const next = isSelected
      ? state.adAccountIds.filter((id) => id !== accountId)
      : [...state.adAccountIds, accountId]

    updateField('adAccountIds', next)
    updateField('connectionIds', deriveConnectionIds(next))
  }

  // Select all / clear visible (respects current filters)
  const visibleIds = filteredAccounts.map((a) => a.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => state.adAccountIds.includes(id))

  const handleToggleAll = () => {
    if (allVisibleSelected) {
      // Deselect only visible ones
      const next = state.adAccountIds.filter((id) => !visibleIds.includes(id))
      updateField('adAccountIds', next)
      updateField('connectionIds', deriveConnectionIds(next))
    } else {
      // Select all visible (merge with already selected)
      const next = Array.from(new Set([...state.adAccountIds, ...visibleIds]))
      updateField('adAccountIds', next)
      updateField('connectionIds', deriveConnectionIds(next))
    }
  }

  // Connection filter toggle
  const handleConnectionFilterToggle = (connId: string) => {
    setConnectionFilterIds((prev) =>
      prev.includes(connId) ? prev.filter((id) => id !== connId) : [...prev, connId],
    )
  }

  // Clear all filters (H3: user control and freedom)
  const handleClearFilters = () => {
    setSearchQuery('')
    setConnectionFilterIds([])
  }

  // Detect if filters are hiding some selected accounts (H1: visibility)
  const hasFiltersActive = searchQuery.trim().length > 0 || connectionFilterIds.length > 0
  const hiddenSelectedCount = hasFiltersActive
    ? state.adAccountIds.filter((id) => !visibleIds.includes(id)).length
    : 0

  const validation = form.validateStep(0)

  return (
    <div>
      {/* ── Name & Description ── */}
      <div className={styles.formSection}>
        <div className={styles.formField}>
          <Input
            label="Nome da regra *"
            placeholder="Ex: Pausar campanhas com CPA alto"
            value={state.name}
            onChange={(e) => updateField('name', e.target.value)}
            fullWidth
            error={
              !state.name.trim() && validation.errors.length > 0
                ? 'Nome é obrigatório'
                : undefined
            }
          />
        </div>

        <div className={styles.formField}>
          <Textarea
            label="Descrição (opcional)"
            placeholder="Descreva o objetivo desta regra de automação..."
            value={state.description}
            onChange={(e) => updateField('description', e.target.value)}
            fullWidth
            rows={2}
          />
        </div>
      </div>

      {/* ── Platform Selection ── */}
      <div className={styles.formSection}>
        <span className={styles.formSectionTitle}>Plataforma</span>
        <div className={styles.platformToggle}>
          {PLATFORM_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={clsx(
                styles.platformCard,
                state.platform === opt.value && styles.platformActive,
              )}
              onClick={() => handlePlatformChange(opt.value as Platform)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handlePlatformChange(opt.value as Platform)
                }
              }}
            >
              <div
                className={clsx(
                  styles.platformIcon,
                  opt.value === 'meta' ? styles.platformMeta : styles.platformGoogle,
                )}
              >
                {opt.value === 'meta' ? 'M' : 'G'}
              </div>
              <div>
                <div className={styles.platformName}>{opt.label}</div>
                <div className={styles.platformDesc}>
                  {opt.value === 'meta'
                    ? 'Facebook e Instagram Ads'
                    : 'Google Ads (Search, Display, PMax)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ad Accounts ── */}
      <div className={styles.formSection}>
        {/* Section header: title + count + toggle all */}
        <div className={styles.accountSectionHeader}>
          <span className={styles.accountSectionTitle}>
            Contas de Anúncio
            {state.adAccountIds.length > 0 && (
              <span className={styles.accountSelectedCount}>
                ({state.adAccountIds.length} selecionada{state.adAccountIds.length !== 1 ? 's' : ''})
              </span>
            )}
          </span>
          {filteredAccounts.length > 0 && (
            <button
              type="button"
              className={styles.accountToggleAllBtn}
              onClick={handleToggleAll}
            >
              {allVisibleSelected ? 'Limpar seleção' : 'Selecionar todas'}
            </button>
          )}
        </div>

        {/* Toolbar: Search + Connection Filter */}
        {!accountsLoading && adAccounts.length > 0 && (
          <div className={styles.accountToolbar}>
            <div className={styles.accountSearch}>
              <div className={styles.accountSearchIcon}>
                <Search size={14} />
              </div>
              <input
                type="text"
                className={styles.accountSearchInput}
                placeholder="Buscar conta por nome ou ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {availableConnections.length > 1 && (
              <div className={styles.connectionFilter} ref={filterDropdownRef}>
                <button
                  type="button"
                  className={clsx(
                    styles.connectionFilterBtn,
                    connectionFilterIds.length > 0 && styles.connectionFilterActive,
                  )}
                  onClick={() => setShowConnectionFilter((v) => !v)}
                >
                  <Filter size={14} />
                  <span>Conexão</span>
                  {connectionFilterIds.length > 0 && (
                    <span className={styles.connectionFilterBadge}>
                      {connectionFilterIds.length}
                    </span>
                  )}
                  <ChevronDown size={14} />
                </button>

                {showConnectionFilter && (
                  <div className={styles.connectionFilterDropdown}>
                    {availableConnections.map((conn) => {
                      const isChecked = connectionFilterIds.includes(conn.id)
                      return (
                        <div
                          key={conn.id}
                          className={styles.connectionFilterItem}
                          onClick={() => handleConnectionFilterToggle(conn.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleConnectionFilterToggle(conn.id)
                            }
                          }}
                        >
                          <div
                            className={clsx(
                              styles.connectionFilterCheck,
                              isChecked && styles.connectionFilterChecked,
                            )}
                          >
                            {isChecked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span>{conn.name}</span>
                          <span className={styles.accountCount}>{conn.count}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filter info banner: shows when filters hide selected accounts */}
        {hasFiltersActive && hiddenSelectedCount > 0 && (
          <div className={styles.filterInfoBanner}>
            <span>
              {hiddenSelectedCount} conta{hiddenSelectedCount !== 1 ? 's' : ''} selecionada{hiddenSelectedCount !== 1 ? 's' : ''} não visíve{hiddenSelectedCount !== 1 ? 'is' : 'l'} (oculta{hiddenSelectedCount !== 1 ? 's' : ''} pelo filtro)
            </span>
            <button
              type="button"
              className={styles.filterClearBtn}
              onClick={handleClearFilters}
            >
              Limpar filtros
            </button>
          </div>
        )}

        <div className={styles.connectionList}>
          {/* Loading skeletons (H1: visibility of system status) */}
          {accountsLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.accountSkeleton}>
                  <div className={styles.accountSkeletonCheck} />
                  <div className={styles.accountSkeletonLines}>
                    <div className={styles.accountSkeletonLine} />
                    <div className={styles.accountSkeletonLine} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* No accounts at all */}
          {!accountsLoading && adAccounts.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateText}>
                Nenhuma conta de anúncio ativa encontrada.
                {' '}Conecte uma conta {state.platform === 'meta' ? 'Meta Ads' : 'Google Ads'} em Configurações.
              </span>
            </div>
          )}

          {/* Filters active but no results (H9: help recover from errors) */}
          {!accountsLoading && adAccounts.length > 0 && filteredAccounts.length === 0 && (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateText}>
                Nenhuma conta encontrada com os filtros atuais.
              </span>
              <button
                type="button"
                className={styles.filterClearBtn}
                onClick={handleClearFilters}
              >
                Limpar filtros
              </button>
            </div>
          )}

          {/* Account list */}
          {!accountsLoading &&
            groupedAccounts.map((group) => (
              <div key={group.connectionName} className={styles.connectionGroup}>
                {groupedAccounts.length > 1 && (
                  <div className={styles.connectionGroupHeader}>
                    {group.connectionName}
                  </div>
                )}
                {group.accounts.map((account) => {
                  const isSelected = state.adAccountIds.includes(account.id)
                  return (
                    <div
                      key={account.id}
                      className={clsx(
                        styles.connectionItem,
                        isSelected && styles.connectionSelected,
                      )}
                      onClick={() => handleAccountToggle(account.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleAccountToggle(account.id)
                        }
                      }}
                    >
                      <div
                        className={styles.connectionCheckbox}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: isSelected ? 'var(--color-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-text-on-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className={styles.connectionInfo}>
                        <div className={styles.connectionName}>
                          {account.name}
                        </div>
                        <div className={styles.connectionDetail}>
                          {account.businessName
                            ? `${account.businessName} · `
                            : ''}
                          ID: {account.id}
                          {account.currency ? ` · ${account.currency}` : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
        </div>
      </div>

      {/* ── Google Campaign Type ── */}
      {state.platform === 'google' && (
        <div className={styles.formSection}>
          <span className={styles.formSectionTitle}>Tipo de campanha</span>
          <div className={styles.formField}>
            <Select
              placeholder="Selecione o tipo de campanha"
              value={state.googleCampaignType}
              onValueChange={handleCampaignTypeChange}
              options={GOOGLE_CAMPAIGN_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              fullWidth
            />
          </div>
        </div>
      )}

      {/* ── Entity Level ── */}
      <div className={styles.formSection}>
        <span className={styles.formSectionTitle}>Nível de entidade</span>
        <div className={styles.toggleGroup}>
          {availableLevels.map((opt) => {
            const isDisabled =
              state.platform === 'google' &&
              state.googleCampaignType === 'performance_max' &&
              opt.value !== 'campaign' &&
              opt.value !== 'ad_account'

            return (
              <button
                key={opt.value}
                type="button"
                className={clsx(
                  styles.toggleButton,
                  state.level === opt.value && styles.toggleActive,
                  isDisabled && styles.toggleDisabled,
                )}
                onClick={() => {
                  if (!isDisabled) {
                    updateField('level', opt.value as EntityLevel)
                  }
                }}
                disabled={isDisabled}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        <span className={styles.fieldHint}>
          {state.platform === 'meta' && state.level === 'adset'
            ? 'A regra será aplicada a conjuntos de anúncios (Ad Sets)'
            : state.platform === 'google' && state.level === 'ad_group'
              ? 'A regra será aplicada a grupos de anúncios (Ad Groups)'
              : `A regra será aplicada no nível de ${availableLevels.find((o) => o.value === state.level)?.label.toLowerCase() ?? state.level}`}
        </span>
      </div>
    </div>
  )
}
