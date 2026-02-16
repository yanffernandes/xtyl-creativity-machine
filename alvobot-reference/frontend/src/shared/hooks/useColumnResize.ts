import { useState, useRef, useCallback, useEffect } from 'react'

interface ColumnConfig {
  key: string
  minWidth?: number
}

interface UseColumnResizeOptions {
  /** Maximum number of rows to measure for auto-fit. Default: 100 */
  maxRowsToMeasure?: number
}

/**
 * Hook for column resize functionality with auto-fit on double-click (like Excel)
 *
 * @param initialWidths - Initial column widths keyed by column key
 * @param tableRef - Ref to the table element for measuring content
 * @param columns - Array of column configs with key and optional minWidth
 * @param options - Additional options for customizing behavior
 */
export function useColumnResize(
  initialWidths: Record<string, number>,
  tableRef: React.RefObject<HTMLTableElement | null>,
  columns: ColumnConfig[] = [],
  options: UseColumnResizeOptions = {}
) {
  const { maxRowsToMeasure = 100 } = options
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths)
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  const handleMouseDown = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      resizingRef.current = {
        key,
        startX: e.clientX,
        startWidth: columnWidths[key] || initialWidths[key],
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [columnWidths, initialWidths]
  )

  // Measure optimal width for a single column
  const measureColumnWidth = useCallback(
    (key: string): number | null => {
      if (!tableRef.current) return null

      const table = tableRef.current
      const headers = Array.from(table.querySelectorAll('thead th'))

      // Find column by data-column-key attribute (more reliable than text matching)
      const colIndex = headers.findIndex(
        (th) => th.getAttribute('data-column-key') === key
      )

      if (colIndex === -1) return null

      // Create a temporary span to measure text width
      const measureSpan = document.createElement('span')
      measureSpan.style.visibility = 'hidden'
      measureSpan.style.position = 'absolute'
      measureSpan.style.whiteSpace = 'nowrap'
      measureSpan.style.font = '14px system-ui, -apple-system, sans-serif'
      document.body.appendChild(measureSpan)

      let maxWidth = 0

      // Measure header
      const headerCell = headers[colIndex]
      if (headerCell) {
        const headerText = headerCell.textContent || ''
        measureSpan.textContent = headerText
        maxWidth = Math.max(maxWidth, measureSpan.offsetWidth + 60) // Extra padding for icons
      }

      // Measure all body cells (includes parent and expanded child rows)
      // Limit to maxRowsToMeasure for performance, but measure ALL currently visible rows
      const allRows = Array.from(table.querySelectorAll('tbody tr')) as HTMLElement[]
      const rows = allRows.slice(0, maxRowsToMeasure)
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        // Use data-column-key on cells if available, otherwise use colIndex
        let cell: Element | null = null
        for (const cellElement of cells) {
          if (cellElement.getAttribute('data-column-key') === key) {
            cell = cellElement
            break
          }
        }
        // Fallback to colIndex if no data-column-key found on cells
        if (!cell && cells[colIndex]) {
          cell = cells[colIndex]
        }

        if (cell) {
          // Check if this is an indented/child row
          // Works with CSS Modules (e.g., SiteAnalysisTable_rowLevel1_xxx)
          // Also check data attribute for more reliable detection
          const isChildRow = row.className.includes('Level1') ||
                            row.className.includes('level1') ||
                            row.dataset.level === '1' ||
                            row.getAttribute('data-row-level') === '1'
          const indentPadding = isChildRow ? 24 : 0 // Account for expand button space in parent

          const cellText = cell.textContent || ''
          measureSpan.textContent = cellText
          maxWidth = Math.max(maxWidth, measureSpan.offsetWidth + 32 + indentPadding) // Padding + indent
        }
      })

      document.body.removeChild(measureSpan)

      // Apply the new width with min/max constraints
      const col = columns.find((c) => c.key === key)
      const minWidth = col?.minWidth || 50
      return Math.max(minWidth, Math.min(maxWidth, 500)) // Max 500px for longer campaign names
    },
    [tableRef, columns, maxRowsToMeasure]
  )

  // Auto-fit column width on double-click (like Excel)
  const handleDoubleClick = useCallback(
    (key: string, e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      const newWidth = measureColumnWidth(key)
      if (newWidth !== null) {
        setColumnWidths((prev) => ({
          ...prev,
          [key]: newWidth,
        }))
      }
    },
    [measureColumnWidth]
  )

  // Auto-fit all columns at once
  const autoFitAllColumns = useCallback(() => {
    if (!tableRef.current) return

    const newWidths: Record<string, number> = {}
    columns.forEach((col) => {
      const width = measureColumnWidth(col.key)
      if (width !== null) {
        newWidths[col.key] = width
      }
    })

    if (Object.keys(newWidths).length > 0) {
      setColumnWidths((prev) => ({
        ...prev,
        ...newWidths,
      }))
    }
  }, [columns, measureColumnWidth, tableRef])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return

      const { key, startX, startWidth } = resizingRef.current
      const diff = e.clientX - startX
      const col = columns.find((c) => c.key === key)
      const newWidth = Math.max(col?.minWidth || 50, startWidth + diff)

      setColumnWidths((prev) => ({
        ...prev,
        [key]: newWidth,
      }))
    }

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [columns])

  return { columnWidths, setColumnWidths, handleMouseDown, handleDoubleClick, autoFitAllColumns }
}
