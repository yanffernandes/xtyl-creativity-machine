import { formatInteger, formatPercent, formatDurationMinSec, formatCurrency } from './formatters'
import type { AnalyticsRow, ColumnVisibility, AnalyticsMetrics } from '../types'

interface ExportColumn {
  key: keyof AnalyticsRow | keyof AnalyticsMetrics
  label: string
  format?: (value: unknown) => string
}

const ALL_COLUMNS: ExportColumn[] = [
  { key: 'label', label: 'Dimensão' },
  { key: 'activeUsers', label: 'Usuários Ativos', format: (v) => formatInteger(v as number) },
  { key: 'newUsers', label: 'Novos Usuários', format: (v) => formatInteger(v as number) },
  { key: 'sessions', label: 'Sessões', format: (v) => formatInteger(v as number) },
  { key: 'engagedSessions', label: 'Sessões Engajadas', format: (v) => formatInteger(v as number) },
  { key: 'pageViews', label: 'Visualizações', format: (v) => formatInteger(v as number) },
  { key: 'pagesPerSession', label: 'Páginas/Sessão', format: (v) => (v as number).toFixed(2) },
  { key: 'bounceRate', label: 'Taxa de Rejeição', format: (v) => formatPercent(v as number) },
  { key: 'engagementRate', label: 'Taxa de Engajamento', format: (v) => formatPercent(v as number) },
  { key: 'avgSessionDuration', label: 'Duração Média', format: (v) => formatDurationMinSec(v as number) },
  { key: 'eventCount', label: 'Eventos', format: (v) => formatInteger(v as number) },
  { key: 'conversions', label: 'Conversões', format: (v) => formatInteger(v as number) },
  { key: 'totalRevenue', label: 'Receita', format: (v) => formatCurrency(v as number) },
]

function getVisibleColumns(visibility: ColumnVisibility): ExportColumn[] {
  return ALL_COLUMNS.filter((col) => {
    if (col.key === 'label') return true
    return visibility[col.key as keyof ColumnVisibility]
  })
}

function getValue(row: AnalyticsRow, key: string): unknown {
  if (key === 'label') return row.label
  if (key in row.metrics) {
    return row.metrics[key as keyof AnalyticsMetrics]
  }
  return row[key as keyof AnalyticsRow]
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Download file with given content
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export function exportToCSV(
  rows: AnalyticsRow[],
  visibility: ColumnVisibility,
  filename = 'analytics-export'
): void {
  const columns = getVisibleColumns(visibility)

  // Build header
  const header = columns.map((col) => escapeCSV(col.label)).join(',')

  // Build rows
  const csvRows = rows.map((row) => {
    return columns
      .map((col) => {
        const value = getValue(row, col.key)
        const formatted = col.format ? col.format(value) : String(value ?? '')
        return escapeCSV(formatted)
      })
      .join(',')
  })

  const csv = [header, ...csvRows].join('\n')

  // Download
  downloadFile(`\ufeff${  csv}`, `${filename}.csv`, 'text/csv;charset=utf-8;')
}

/**
 * Generate Excel XML content (simple spreadsheetml format)
 * This creates a basic Excel file without external dependencies
 */
function generateExcelXml(rows: AnalyticsRow[], columns: ExportColumn[]): string {
  const headerCells = columns.map(col =>
    `<Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`
  ).join('')

  const dataRows = rows.map(row => {
    const cells = columns.map(col => {
      const value = getValue(row, col.key)
      if (value === undefined || value === null) {
        return '<Cell><Data ss:Type="String"></Data></Cell>'
      }

      // Determine type and format value
      const isNumber = typeof value === 'number'
      const type = isNumber ? 'Number' : 'String'

      let displayValue: string
      if (col.format) {
        displayValue = col.format(value)
      } else if (isNumber) {
        displayValue = value.toString()
      } else {
        displayValue = String(value)
      }

      return `<Cell><Data ss:Type="${type}">${escapeXml(displayValue)}</Data></Cell>`
    }).join('')

    return `<Row>${cells}</Row>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Analytics">
    <Table>
      <Row ss:StyleID="Header">${headerCells}</Row>
      ${dataRows.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`
}

export function exportToXLSX(
  rows: AnalyticsRow[],
  visibility: ColumnVisibility,
  filename = 'analytics-export'
): void {
  const columns = getVisibleColumns(visibility)
  const content = generateExcelXml(rows, columns)
  downloadFile(content, `${filename}.xls`, 'application/vnd.ms-excel')
}
