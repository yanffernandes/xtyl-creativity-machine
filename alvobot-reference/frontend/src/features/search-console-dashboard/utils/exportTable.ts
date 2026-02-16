type ExportRow = Record<string, string | number>;

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate timestamp for filename
 */
function getTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  return `${date}_${time}`;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: ExportRow[], filenamePrefix: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Add headers
  csvRows.push(headers.map(escapeCSVValue).join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => escapeCSVValue(String(row[header] ?? '')));
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  const filename = `${filenamePrefix}_${getTimestamp()}.csv`;
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
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
    .replace(/'/g, '&apos;');
}

/**
 * Export data to Excel XML format (no external dependencies)
 */
export function exportToXLSX(data: ExportRow[], filenamePrefix: string): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);

  // Generate header cells
  const headerCells = headers
    .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join('');

  // Generate data rows
  const dataRows = data.map((row) => {
    const cells = headers
      .map((header) => {
        const value = row[header];
        if (value === undefined || value === null) {
          return '<Cell><Data ss:Type="String"></Data></Cell>';
        }

        const isNumber = typeof value === 'number';
        const type = isNumber ? 'Number' : 'String';
        const displayValue = isNumber ? value.toString() : String(value);

        return `<Cell><Data ss:Type="${type}">${escapeXml(displayValue)}</Data></Cell>`;
      })
      .join('');

    return `<Row>${cells}</Row>`;
  });

  const excelContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Search Console">
    <Table>
      <Row ss:StyleID="Header">${headerCells}</Row>
      ${dataRows.join('\n      ')}
    </Table>
  </Worksheet>
</Workbook>`;

  const filename = `${filenamePrefix}_${getTimestamp()}.xls`;
  downloadFile(excelContent, filename, 'application/vnd.ms-excel');
}
