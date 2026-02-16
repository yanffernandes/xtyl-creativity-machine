import { useMemo, useCallback } from 'react'
import { Filter } from 'lucide-react'
import { DropdownSelect, type DropdownSelectGroup } from '@/shared/components'
import type { ActiveNetwork, ActiveAccount } from '../../api/useActiveNetworksAndAccounts'

interface NetworkAccountFilterProps {
  activeNetworks: ActiveNetwork[]
  activeAccounts: ActiveAccount[]
  selectedNetworkIds: string[]
  selectedAccountIds: string[]
  onNetworkSelectionChange: (networkIds: string[]) => void
  onAccountSelectionChange: (accountIds: string[]) => void
  isLoading?: boolean
}

export function NetworkAccountFilter({
  activeNetworks,
  activeAccounts,
  selectedNetworkIds,
  selectedAccountIds,
  onNetworkSelectionChange,
  onAccountSelectionChange,
  isLoading = false,
}: NetworkAccountFilterProps) {
  const totalItems = activeNetworks.length + activeAccounts.length
  const selectedCount = selectedNetworkIds.length + selectedAccountIds.length

  // Build groups for the dropdown
  const groups: DropdownSelectGroup[] = useMemo(() => {
    const result: DropdownSelectGroup[] = []
    
    if (activeNetworks.length > 0) {
      result.push({
        id: 'admanager',
        label: 'Ad Manager',
        options: activeNetworks.map(n => ({
          value: `network:${n.id}`,
          label: `${n.name} (${n.currencyCode})`,
        })),
      })
    }
    
    if (activeAccounts.length > 0) {
      result.push({
        id: 'adsense',
        label: 'AdSense',
        options: activeAccounts.map(a => ({
          value: `account:${a.id}`,
          label: `${a.name} (${a.currencyCode})`,
        })),
      })
    }
    
    return result
  }, [activeNetworks, activeAccounts])

  // Combine selected values with prefixes
  const selectedValues = useMemo(() => [
    ...selectedNetworkIds.map(id => `network:${id}`),
    ...selectedAccountIds.map(id => `account:${id}`),
  ], [selectedNetworkIds, selectedAccountIds])

  // Handle changes by splitting prefixes
  const handleChange = useCallback((values: string[]) => {
    const networkIds: string[] = []
    const accountIds: string[] = []
    
    values.forEach(v => {
      if (v.startsWith('network:')) {
        networkIds.push(v.replace('network:', ''))
      } else if (v.startsWith('account:')) {
        accountIds.push(v.replace('account:', ''))
      }
    })
    
    onNetworkSelectionChange(networkIds)
    onAccountSelectionChange(accountIds)
  }, [onNetworkSelectionChange, onAccountSelectionChange])

  if (totalItems === 0 && !isLoading) {
    return null
  }

  return (
    <DropdownSelect
      trigger={
        <>
          <Filter size={16} />
          <span>{isLoading ? 'Carregando...' : `Contas Selecionadas: ${selectedCount}/${totalItems}`}</span>
        </>
      }
      title="Selecione as contas"
      groups={groups}
      value={selectedValues}
      onChange={handleChange}
      showSelectAllActions
      selectAllLabel="Todas"
      deselectAllLabel="Nenhuma"
      disabled={isLoading}
      isLoading={isLoading}
      minWidth={300}
      maxHeight={400}
    />
  )
}
