import { useCallback, useState } from 'react'

export function useUrlSelection() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
  }
}
