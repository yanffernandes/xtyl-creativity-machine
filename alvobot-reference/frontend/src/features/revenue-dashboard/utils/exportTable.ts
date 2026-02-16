import type { SiteData, HierarchicalItem, HierarchicalMetrics, MetricsData, RevenueSource } from '../types'

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'xlsx'

/**
 * Row data for export (flattened structure)
 */
interface ExportRow {
  level: number
  domain: string
  site: string
  country: string
  countryCode: string
  source: string
  revenue: number
  ecpm: number
  cpc: number
  ctr: number
  clicks: number
  impressions: number
  originalCurrency?: string
  originalRevenue?: number
}

/**
 * Column configuration for export
 */
interface ExportColumn {
  key: keyof ExportRow
  label: string
  format?: (value: number | string | undefined, row: ExportRow) => string
}

const EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'domain', label: 'Domínio' },
  { key: 'site', label: 'Página/Agrupamento' },
  { key: 'country', label: 'País' },
  { key: 'source', label: 'Fonte' },
  {
    key: 'revenue',
    label: 'Receita (USD)',
    format: (value) => Number(value ?? 0).toFixed(2),
  },
  {
    key: 'ecpm',
    label: 'eCPM',
    format: (value) => Number(value ?? 0).toFixed(2),
  },
  {
    key: 'cpc',
    label: 'CPC',
    format: (value) => Number(value ?? 0).toFixed(4),
  },
  {
    key: 'ctr',
    label: 'CTR (%)',
    format: (value) => Number(value ?? 0).toFixed(2),
  },
  {
    key: 'clicks',
    label: 'Cliques',
    format: (value) => Math.round(Number(value ?? 0)).toString(),
  },
  {
    key: 'impressions',
    label: 'Impressões',
    format: (value) => Math.round(Number(value ?? 0)).toString(),
  },
  {
    key: 'originalCurrency',
    label: 'Moeda Original',
  },
  {
    key: 'originalRevenue',
    label: 'Receita Original',
    format: (value) =>
      value === undefined || value === null || value === ''
        ? ''
        : Number(value).toFixed(2),
  },
]

const getEcpmValue = (metrics: MetricsData | HierarchicalMetrics): number => {
  // HierarchicalMetrics uses 'rpm', MetricsData uses 'ecpm'
  if ('rpm' in metrics && metrics.rpm !== undefined) {
    return metrics.rpm
  }
  if ('ecpm' in metrics && metrics.ecpm !== undefined) {
    return metrics.ecpm
  }
  return 0
}

/**
 * Flatten table data including expanded hierarchical items
 */
function flattenTableData(
  data: SiteData[],
  expandedItems: Set<string>,
  hierarchicalData: Map<string, HierarchicalItem[]>,
  sourceMap: Map<string, RevenueSource> | undefined,
  getItemKey: (site: SiteData) => string
): ExportRow[] {
  const rows: ExportRow[] = []

  for (const site of data) {
    const itemKey = getItemKey(site)
    const source = sourceMap?.get(site.site) || sourceMap?.get(itemKey)

    // Parent row
    rows.push({
      level: 0,
      domain: site.domain || '',
      site: site.site,
      country: site.country || '',
      countryCode: site.countryCode || '',
      source: source === 'ad_manager' ? 'Ad Manager' : source === 'adsense' ? 'AdSense' : '',
      revenue: site.metrics.revenue,
      ecpm: site.metrics.ecpm,
      cpc: site.metrics.cpc,
      ctr: site.metrics.ctr,
      clicks: site.metrics.clicks,
      impressions: site.metrics.impressions,
      originalCurrency: site.originalCurrencyCode,
      originalRevenue: site.originalRevenue,
    })

    // Expanded children
    if (expandedItems.has(itemKey)) {
      const children = hierarchicalData.get(itemKey) || []
      for (const child of children) {
        // Determine domain for child based on groupType
        let childDomain = site.domain || ''
        if (child.groupType === 'domain') {
          childDomain = child.label
        }

        rows.push({
          level: 1,
          domain: childDomain,
          site: child.label,
          country: child.country || site.country || '',
          countryCode: child.countryCode || site.countryCode || '',
          source: '', // Children inherit from parent
          revenue: child.metrics.revenue,
          ecpm: getEcpmValue(child.metrics),
          cpc: child.metrics.cpc,
          ctr: child.metrics.ctr,
          clicks: child.metrics.clicks,
          impressions: child.metrics.impressions,
          originalCurrency: child.originalCurrencyCode || site.originalCurrencyCode,
          originalRevenue: child.originalRevenue,
        })
      }
    }
  }

  return rows
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Generate CSV content from export rows
 */
function generateCsv(rows: ExportRow[], includeLevel = true): string {
  const columns = includeLevel
    ? [{ key: 'level' as keyof ExportRow, label: 'Nível' }, ...EXPORT_COLUMNS]
    : EXPORT_COLUMNS

  // Header row
  const header = columns.map(col => escapeCsvValue(col.label)).join(',')

  // Data rows
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const value = row[col.key]
      if (value === undefined || value === null) return ''

      if (col.format) {
        return escapeCsvValue(col.format(value, row))
      }

      return escapeCsvValue(String(value))
    }).join(',')
  })

  return [header, ...dataRows].join('\n')
}

/**
 * Generate Excel XML content (simple spreadsheetml format)
 * This creates a basic Excel file without external dependencies
 */
function generateExcelXml(rows: ExportRow[], includeLevel = true): string {
  const columns = includeLevel
    ? [{ key: 'level' as keyof ExportRow, label: 'Nível' }, ...EXPORT_COLUMNS]
    : EXPORT_COLUMNS

  const escapeXml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const headerCells = columns.map(col =>
    `<Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>`
  ).join('')

  const dataRows = rows.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key]
      if (value === undefined || value === null) {
        return '<Cell><Data ss:Type="String"></Data></Cell>'
      }

      // Determine type and format value
      const isNumber = typeof value === 'number'
      const type = isNumber ? 'Number' : 'String'

      let displayValue: string
      if (col.format) {
        displayValue = col.format(value, row)
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
    <Style ss:ID="Level0">
      <Font ss:Bold="1"/>
    </Style>
    <Style ss:ID="Level1">
      <Interior ss:Color="#FAFAFA" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Receita">
    <Table>
      <Row ss:StyleID="Header">${headerCells}</Row>
      ${dataRows.map((row, idx) => {
        const level = rows[idx].level
        const styleId = level === 0 ? 'Level0' : 'Level1'
        return row.replace('<Row>', `<Row ss:StyleID="${styleId}">`)
      }).join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`
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

/**
 * Generate filename with current date
 */
function generateFilename(format: ExportFormat, startDate?: string, endDate?: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '')

  let periodStr = ''
  if (startDate && endDate) {
    periodStr = `_${startDate}_${endDate}`
  }

  const extension = format === 'xlsx' ? 'xls' : format
  return `receita${periodStr}_${dateStr}_${timeStr}.${extension}`
}

export interface ExportTableOptions {
  data: SiteData[]
  expandedItems: Set<string>
  hierarchicalData: Map<string, HierarchicalItem[]>
  sourceMap?: Map<string, RevenueSource>
  getItemKey: (site: SiteData) => string
  format: ExportFormat
  startDate?: string
  endDate?: string
  includeLevel?: boolean
}

/**
 * Export table data to CSV or Excel
 */
export function exportTable(options: ExportTableOptions): void {
  const {
    data,
    expandedItems,
    hierarchicalData,
    sourceMap,
    getItemKey,
    format,
    startDate,
    endDate,
    includeLevel = true,
  } = options

  // Flatten data
  const rows = flattenTableData(
    data,
    expandedItems,
    hierarchicalData,
    sourceMap,
    getItemKey
  )

  if (rows.length === 0) {
    console.warn('No data to export')
    return
  }

  // Generate content based on format
  const filename = generateFilename(format, startDate, endDate)

  if (format === 'csv') {
    const content = generateCsv(rows, includeLevel)
    downloadFile(content, filename, 'text/csv;charset=utf-8;')
  } else {
    const content = generateExcelXml(rows, includeLevel)
    downloadFile(content, filename, 'application/vnd.ms-excel')
  }
}

/**
 * Export only visible (non-expanded) data
 */
export function exportTableSimple(
  data: SiteData[],
  sourceMap: Map<string, RevenueSource> | undefined,
  format: ExportFormat,
  startDate?: string,
  endDate?: string
): void {
  const rows: ExportRow[] = data.map(site => ({
    level: 0,
    domain: site.domain || '',
    site: site.site,
    country: site.country || '',
    countryCode: site.countryCode || '',
    source: sourceMap?.get(site.site) === 'ad_manager' ? 'Ad Manager' :
            sourceMap?.get(site.site) === 'adsense' ? 'AdSense' : '',
    revenue: site.metrics.revenue,
    ecpm: site.metrics.ecpm,
    cpc: site.metrics.cpc,
    ctr: site.metrics.ctr,
    clicks: site.metrics.clicks,
    impressions: site.metrics.impressions,
    originalCurrency: site.originalCurrencyCode,
    originalRevenue: site.originalRevenue,
  }))

  const filename = generateFilename(format, startDate, endDate)

  if (format === 'csv') {
    const content = generateCsv(rows, false)
    downloadFile(content, filename, 'text/csv;charset=utf-8;')
  } else {
    const content = generateExcelXml(rows, false)
    downloadFile(content, filename, 'application/vnd.ms-excel')
  }
}
