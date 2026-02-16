import { useState, useCallback } from 'react'

/**
 * Hook for column reorder functionality with drag and drop
 *
 * @param initialOrder - Initial column order (array of column keys)
 */
export function useColumnReorder(initialOrder: string[]) {
  const [columnOrder, setColumnOrder] = useState<string[]>(initialOrder)
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const handleDragStart = useCallback((key: string, e: React.DragEvent) => {
    setDraggedColumn(key)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', key)
    // Add drag image styling
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '0.5'
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDraggedColumn(null)
    setDragOverColumn(null)
  }, [])

  const handleDragOver = useCallback(
    (key: string, e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (draggedColumn && key !== draggedColumn) {
        setDragOverColumn(key)
      }
    },
    [draggedColumn]
  )

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback((targetKey: string, e: React.DragEvent) => {
    e.preventDefault()
    const sourceKey = e.dataTransfer.getData('text/plain')

    if (sourceKey && sourceKey !== targetKey) {
      setColumnOrder((prev) => {
        const newOrder = [...prev]
        const sourceIndex = newOrder.indexOf(sourceKey)
        const targetIndex = newOrder.indexOf(targetKey)

        if (sourceIndex !== -1 && targetIndex !== -1) {
          // Remove from source and insert at target
          newOrder.splice(sourceIndex, 1)
          newOrder.splice(targetIndex, 0, sourceKey)
        }

        return newOrder
      })
    }

    setDraggedColumn(null)
    setDragOverColumn(null)
  }, [])

  return {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}
