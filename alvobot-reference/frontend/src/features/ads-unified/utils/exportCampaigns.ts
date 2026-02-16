/**
 * Campaign Export Utilities
 *
 * Provides functions to export campaign data to CSV and Excel formats.
 */

// ============================================
// Types
// ============================================

export type ExportFormat = 'csv' | 'xlsx'

export interface ExportRow {
  platform: string
  name: string
  accountName: string
  status: string
  budget: number
  budgetType: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cost: number
  conversions: number
  cpa: number
  roas: number
  reach: number
  frequency: number
  landingPageViews: number
}

// ============================================
// Helper Functions
// ============================================

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ============================================
// Export Generators
// ============================================

const EXPORT_HEADERS = [
  'Fonte',
  'Campanha',
  'Conta',
  'Status',
  'Orçamento',
  'Tipo',
  'Impressões',
  'Cliques',
  'CTR (%)',
  'CPC',
  'Gasto',
  'Conversões',
  'CPA',
  'ROAS',
  'Alcance',
  'Frequência',
  'Vis. Página',
]

export function generateCsv(rows: ExportRow[]): string {
  const csvRows = rows.map(row => [
    escapeCsvValue(row.platform),
    escapeCsvValue(row.name),
    escapeCsvValue(row.accountName),
    escapeCsvValue(row.status),
    row.budget.toFixed(2),
    escapeCsvValue(row.budgetType),
    row.impressions.toString(),
    row.clicks.toString(),
    row.ctr.toFixed(2),
    row.cpc.toFixed(2),
    row.cost.toFixed(2),
    row.conversions.toString(),
    row.cpa.toFixed(2),
    row.roas.toFixed(2),
    row.reach.toString(),
    row.frequency.toFixed(2),
    row.landingPageViews.toString(),
  ].join(','))

  return [EXPORT_HEADERS.join(','), ...csvRows].join('\n')
}

export function generateExcelXml(rows: ExportRow[]): string {
  const headerCells = EXPORT_HEADERS.map(h =>
    `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
  ).join('')

  const dataRows = rows.map(row => {
    const cells = [
      `<Cell><Data ss:Type="String">${escapeXml(row.platform)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(row.name)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(row.accountName)}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(row.status)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.budget}</Data></Cell>`,
      `<Cell><Data ss:Type="String">${escapeXml(row.budgetType)}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.impressions}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.clicks}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.ctr}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.cpc}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.cost}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.conversions}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.cpa}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.roas}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.reach}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.frequency}</Data></Cell>`,
      `<Cell><Data ss:Type="Number">${row.landingPageViews}</Data></Cell>`,
    ].join('')
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
  <Worksheet ss:Name="Campanhas">
    <Table>
      <Row ss:StyleID="Header">${headerCells}</Row>
      ${dataRows.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`
}

// ============================================
// Download Utilities
// ============================================

export function downloadFile(content: string, filename: string, mimeType: string): void {
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

export function exportCampaigns(rows: ExportRow[], format: ExportFormat): void {
  const timestamp = new Date().toISOString().split('T')[0]

  if (format === 'csv') {
    const content = generateCsv(rows)
    downloadFile(content, `campanhas-${timestamp}.csv`, 'text/csv;charset=utf-8')
  } else {
    const content = generateExcelXml(rows)
    downloadFile(content, `campanhas-${timestamp}.xls`, 'application/vnd.ms-excel')
  }
}
