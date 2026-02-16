import { useMemo } from 'react'
import { Building2, ChevronDown, Check } from 'lucide-react'
import { Checkbox, PopoverContent, PopoverRoot, PopoverTrigger, Spinner } from '@/shared/components'
import styles from './PropertyFilter.module.css'
import type { ActiveProperty } from '../../types'

interface PropertyFilterProps {
  properties: ActiveProperty[]
  selectedPropertyIds: string[]
  onSelectionChange: (propertyIds: string[]) => void
  isLoading?: boolean
}

export function PropertyFilter({
  properties,
  selectedPropertyIds,
  onSelectionChange,
  isLoading = false,
}: PropertyFilterProps) {
  // Group properties by account
  const groupedProperties = useMemo(() => {
    const groups = new Map<string, ActiveProperty[]>()

    properties.forEach((prop) => {
      const accountKey = prop.accountName || prop.accountId || 'Sem conta'
      if (!groups.has(accountKey)) {
        groups.set(accountKey, [])
      }
      groups.get(accountKey)!.push(prop)
    })

    return groups
  }, [properties])

  const handleToggleProperty = (propertyId: string) => {
    if (selectedPropertyIds.includes(propertyId)) {
      onSelectionChange(selectedPropertyIds.filter((id) => id !== propertyId))
    } else {
      onSelectionChange([...selectedPropertyIds, propertyId])
    }
  }

  const handleSelectAll = () => {
    const allIds = properties.map((p) => p.propertyId)
    onSelectionChange(allIds)
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const selectedCount = selectedPropertyIds.length
  const totalCount = properties.length

  // Display text
  const displayText = useMemo(() => {
    if (selectedCount === 0) return 'Nenhuma propriedade'
    if (selectedCount === totalCount) return 'Todas propriedades'
    if (selectedCount === 1) {
      const selected = properties.find((p) => p.propertyId === selectedPropertyIds[0])
      return selected?.displayName || '1 propriedade'
    }
    return `${selectedCount} propriedades`
  }, [selectedCount, totalCount, properties, selectedPropertyIds])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <button className={styles.button} disabled>
          <Spinner size="sm" />
          <span>Carregando...</span>
        </button>
      </div>
    )
  }

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          className={styles.button}
          aria-haspopup="true"
        >
          <Building2 size={16} />
          <span className={styles.buttonText}>{displayText}</span>
          <ChevronDown
            size={14}
            className={styles.chevron}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className={styles.dropdown}>
        <div className={styles.dropdownHeader}>
          <span>Propriedades GA4</span>
          <div className={styles.headerActions}>
            <button
              className={styles.headerAction}
              onClick={handleSelectAll}
              disabled={selectedCount === totalCount}
            >
              Todas
            </button>
            <span className={styles.headerDivider}>|</span>
            <button
              className={styles.headerAction}
              onClick={handleDeselectAll}
              disabled={selectedCount === 0}
            >
              Nenhuma
            </button>
          </div>
        </div>

        <div className={styles.dropdownContent}>
          {properties.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Nenhuma propriedade ativa encontrada.</p>
              <p className={styles.emptyHint}>
                Ative propriedades em <a href="/connections">Conexões</a>.
              </p>
            </div>
          ) : (
            Array.from(groupedProperties.entries()).map(([accountName, accountProps]) => (
              <div key={accountName} className={styles.group}>
                {groupedProperties.size > 1 && (
                  <div className={styles.groupHeader}>{accountName}</div>
                )}
                {accountProps.map((property) => {
                  const isSelected = selectedPropertyIds.includes(property.propertyId)
                  return (
                    <label
                      key={property.id}
                      className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProperty(property.propertyId)}
                        size="sm"
                        density="compact"
                      />
                      <div className={styles.optionContent}>
                        <span className={styles.optionName}>{property.displayName}</span>
                        <span className={styles.optionId}>{property.propertyId}</span>
                      </div>
                      {isSelected && (
                        <Check size={14} className={styles.checkIcon} />
                      )}
                    </label>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
