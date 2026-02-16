import { useMemo, useCallback } from 'react'
import { Filter } from 'lucide-react'
import { DropdownSelect, type DropdownSelectGroup } from '@/shared/components'

export interface GoogleAdsAccount {
  id: string
  name: string
  connectionId: string
}

export interface MetaAdsAccount {
  id: string
  name: string
  connectionId: string
  adAccountId: string
}

interface AdsAccountFilterProps {
  googleAccounts: GoogleAdsAccount[]
  metaAccounts: MetaAdsAccount[]
  selectedGoogleAccountIds: string[]
  selectedMetaAccountIds: string[]
  onGoogleAccountSelectionChange: (accountIds: string[]) => void
  onMetaAccountSelectionChange: (accountIds: string[]) => void
  isLoading?: boolean
}

export function AdsAccountFilter({
  googleAccounts,
  metaAccounts,
  selectedGoogleAccountIds,
  selectedMetaAccountIds,
  onGoogleAccountSelectionChange,
  onMetaAccountSelectionChange,
  isLoading = false,
}: AdsAccountFilterProps) {
  const totalItems = googleAccounts.length + metaAccounts.length
  const selectedCount = selectedGoogleAccountIds.length + selectedMetaAccountIds.length

  // Build groups for the dropdown
  const groups: DropdownSelectGroup[] = useMemo(() => {
    const result: DropdownSelectGroup[] = []
    
    if (googleAccounts.length > 0) {
      result.push({
        id: 'google',
        label: 'Google Ads',
        options: googleAccounts.map(a => ({
          value: `google:${a.id}`,
          label: a.name,
        })),
      })
    }
    
    if (metaAccounts.length > 0) {
      result.push({
        id: 'meta',
        label: 'Meta Ads',
        options: metaAccounts.map(a => ({
          value: `meta:${a.id}`,
          label: a.name,
        })),
      })
    }
    
    return result
  }, [googleAccounts, metaAccounts])

  // Combine selected values with prefixes
  const selectedValues = useMemo(() => [
    ...selectedGoogleAccountIds.map(id => `google:${id}`),
    ...selectedMetaAccountIds.map(id => `meta:${id}`),
  ], [selectedGoogleAccountIds, selectedMetaAccountIds])

  // Handle changes by splitting prefixes
  const handleChange = useCallback((values: string[]) => {
    const googleIds: string[] = []
    const metaIds: string[] = []
    
    values.forEach(v => {
      if (v.startsWith('google:')) {
        googleIds.push(v.replace('google:', ''))
      } else if (v.startsWith('meta:')) {
        metaIds.push(v.replace('meta:', ''))
      }
    })
    
    onGoogleAccountSelectionChange(googleIds)
    onMetaAccountSelectionChange(metaIds)
  }, [onGoogleAccountSelectionChange, onMetaAccountSelectionChange])

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
