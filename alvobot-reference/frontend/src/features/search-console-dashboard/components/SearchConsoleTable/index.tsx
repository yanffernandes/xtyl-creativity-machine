import { useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Download,
  Columns,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/shared/components';
import { useColumnResize, useColumnReorder } from '@/shared/hooks'
import styles from './SearchConsoleTable.module.css';
import { GROUP_BY_LABELS,
  type SearchConsoleRow,
  type SearchConsolePrimaryGroupBy,
  type SearchConsoleSubGroupBy,
  type ColumnVisibility } from '../../types';
import { exportToCSV, exportToXLSX } from '../../utils/exportTable';
import { GroupBySelector } from '../GroupBySelector';

interface SearchConsoleTableProps {
  data: SearchConsoleRow[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  searchTerm: string;
  onSearch: (term: string) => void;
  groupBy: SearchConsolePrimaryGroupBy;
  onGroupByChange: (value: SearchConsolePrimaryGroupBy) => void;
  subGroupBy: SearchConsoleSubGroupBy;
  onSubGroupByChange: (value: SearchConsoleSubGroupBy) => void;
  expandedItems: Set<string>;
  onToggleItem: (key: string, row: SearchConsoleRow) => void;
  loadingExpand: string | null;
  hierarchicalData: Map<string, SearchConsoleRow[]>;
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
  isLoading?: boolean;
}

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  key: 'Chave',
  property: 'Propriedade',
  clicks: 'Cliques',
  impressions: 'Impressões',
  ctr: 'CTR',
  position: 'Posição',
};

const COLUMN_CONFIG = [
  { key: 'key', sortable: true, align: 'left', minWidth: 220, width: 260 },
  { key: 'property', sortable: false, align: 'left', minWidth: 200, width: 220 },
  { key: 'clicks', sortable: true, align: 'right', minWidth: 100, width: 110 },
  { key: 'impressions', sortable: true, align: 'right', minWidth: 120, width: 130 },
  { key: 'ctr', sortable: true, align: 'right', minWidth: 90, width: 100 },
  { key: 'position', sortable: true, align: 'right', minWidth: 90, width: 100 },
] as const;

type ColumnKey = typeof COLUMN_CONFIG[number]['key'];
type ColumnConfig = typeof COLUMN_CONFIG[number];

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

function formatCTR(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatPosition(value: number): string {
  return value.toFixed(1);
}

export function SearchConsoleTable({
  data,
  sortBy,
  sortOrder,
  onSort,
  searchTerm,
  onSearch,
  groupBy,
  onGroupByChange,
  subGroupBy,
  onSubGroupByChange,
  expandedItems,
  onToggleItem,
  loadingExpand,
  hierarchicalData,
  columnVisibility,
  onColumnVisibilityChange,
  isLoading,
}: SearchConsoleTableProps) {
  const tableRef = useRef<HTMLTableElement>(null)

  const getSortIcon = useCallback(
    (column: string) => {
      if (sortBy !== column) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />;
      }
      return sortOrder === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      );
    },
    [sortBy, sortOrder]
  );

  const handleExport = useCallback(
    (format: 'csv' | 'xlsx') => {
      const exportData = prepareExportData(data, hierarchicalData, expandedItems);
      if (format === 'csv') {
        exportToCSV(exportData, `search-console-${groupBy}`);
      } else {
        exportToXLSX(exportData, `search-console-${groupBy}`);
      }
    },
    [data, hierarchicalData, expandedItems, groupBy]
  );

  const visibleColumnCount = useMemo(
    () => Object.values(columnVisibility).filter(Boolean).length,
    [columnVisibility]
  );

  // Get key column header based on groupBy
  const keyColumnHeader = GROUP_BY_LABELS[groupBy];

  const columns = useMemo(() => {
    return COLUMN_CONFIG.map((column) => ({
      ...column,
      label: column.key === 'key' ? keyColumnHeader : COLUMN_LABELS[column.key as ColumnKey],
    }));
  }, [keyColumnHeader]);

  const columnMap = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns]
  );

  const { columnOrder, setColumnOrder, draggedColumn, dragOverColumn, handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop } =
    useColumnReorder(columns.map((column) => column.key));

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.key));
  }, [columns, setColumnOrder]);

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key as ColumnKey))
        .filter((column): column is ColumnConfig & { label: string } => Boolean(column)),
    [columnMap, columnOrder]
  );

  const visibleColumns = useMemo(
    () => orderedColumns.filter((column) => columnVisibility[column.key as ColumnKey]),
    [orderedColumns, columnVisibility]
  );

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    columns.forEach((column) => {
      widths[column.key] = column.width;
    });
    return widths;
  }, [columns]);

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map((column) => ({ key: column.key, minWidth: column.minWidth }))
  );

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <Input
            placeholder={`Buscar ${keyColumnHeader.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className={styles.searchInput}
            leftIcon={<Search size={16} />}
            size="md"
          />

          {/* Group By Selectors */}
          <GroupBySelector
            groupBy={groupBy}
            onGroupByChange={onGroupByChange}
            subGroupBy={subGroupBy}
            onSubGroupByChange={onSubGroupByChange}
          />
        </div>

        <div className={styles.toolbarRight}>
          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={styles.toolbarButton}
              >
                <Columns size={14} />
                <span>Colunas</span>
                <span className={styles.columnCount}>{visibleColumnCount}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map((column) => {
                const key = column.key as ColumnKey
                return (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={columnVisibility[key]}
                    onCheckedChange={() =>
                      onColumnVisibilityChange({
                        ...columnVisibility,
                        [key]: !columnVisibility[key],
                      })
                    }
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={styles.toolbarButton}>
                <Download size={14} />
                <span>Exportar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table} ref={tableRef}>
          <thead>
            <tr>
              {/* Expand button column */}
              <th className={styles.thExpand} />

              {visibleColumns.map((column) => {
                const isSortable = column.sortable
                const columnKey = column.key
                const columnWidth = columnWidths[columnKey]
                const isNumeric = column.align === 'right'

                return (
                  <th
                    key={column.key}
                    data-column-key={column.key}
                    className={`${styles.th} ${isNumeric ? styles.thNumeric : ''} ${styles.draggableHeader} ${
                      draggedColumn === column.key ? styles.draggingHeader : ''
                    } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                    style={{ width: columnWidth || undefined }}
                    draggable
                    onDragStart={(e) => handleDragStart(column.key, e)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(column.key, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(column.key, e)}
                  >
                    <div className={styles.thContent}>
                      {isSortable ? (
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => onSort(column.key)}
                        >
                          {column.label}
                          {getSortIcon(column.key)}
                        </button>
                      ) : (
                        <span>{column.label}</span>
                      )}
                    </div>
                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                    <div
                      className={styles.resizeHandle}
                      onMouseDown={(e) => handleMouseDown(column.key, e)}
                      onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className={styles.row}>
                  <td className={styles.td} />
                  {visibleColumns.map((column) => {
                    const columnWidth = columnWidths[column.key]
                    const isNumeric = column.align === 'right'
                    const skeletonWidth =
                      column.key === 'key'
                        ? '200px'
                        : column.key === 'property'
                          ? '120px'
                          : column.key === 'impressions'
                            ? '80px'
                            : column.key === 'clicks'
                              ? '60px'
                              : column.key === 'ctr'
                                ? '50px'
                                : '40px'

                    return (
                      <td
                        key={`skeleton-${column.key}`}
                        className={`${styles.td} ${isNumeric ? styles.tdNumeric : ''}`}
                        style={{ width: columnWidth || undefined }}
                      >
                        <div className={styles.skeleton} style={{ width: skeletonWidth }} />
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={Object.values(columnVisibility).filter(Boolean).length + 1}
                  className={styles.emptyState}
                >
                  <p>Nenhum dado encontrado</p>
                  <p className={styles.emptyHint}>
                    Tente ajustar os filtros ou selecionar outras propriedades
                  </p>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.key}
                  row={row}
                  level={0}
                  visibleColumns={visibleColumns}
                  columnWidths={columnWidths}
                  expandedItems={expandedItems}
                  onToggleItem={onToggleItem}
                  loadingExpand={loadingExpand}
                  hierarchicalData={hierarchicalData}
                  groupBy={groupBy}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TableRowProps {
  row: SearchConsoleRow;
  level: number;
  visibleColumns: Array<ColumnConfig & { label: string }>;
  columnWidths: Record<string, number>;
  expandedItems: Set<string>;
  onToggleItem: (key: string, row: SearchConsoleRow) => void;
  loadingExpand: string | null;
  hierarchicalData: Map<string, SearchConsoleRow[]>;
  groupBy: SearchConsolePrimaryGroupBy;
}

function TableRow({
  row,
  level,
  visibleColumns,
  columnWidths,
  expandedItems,
  onToggleItem,
  loadingExpand,
  hierarchicalData,
  groupBy,
}: TableRowProps) {
  const isExpanded = expandedItems.has(row.key);
  const isLoading = loadingExpand === row.key;
  const children = hierarchicalData.get(row.key);

  const rowClasses = [styles.row, styles[`rowLevel${level}`]].join(' ');

  // Render key based on groupBy type
  const renderKey = () => {
    if (groupBy === 'page') {
      // Show as link for pages
      try {
        const url = new URL(row.key);
        return (
          <a
            href={row.key}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.pageLink}
          >
            <span className={styles.pagePath}>{url.pathname}</span>
            <ExternalLink size={12} />
          </a>
        );
      } catch {
        return row.key;
      }
    }

    // For countries and devices, show displayName if available
    if (row.displayName) {
      return (
        <span className={styles.keyWithLabel}>
          <span className={styles.keyValue}>{row.displayName}</span>
          <span className={styles.keyCode}>{row.key}</span>
        </span>
      );
    }

    return row.key;
  };

  return (
    <>
      <tr className={rowClasses} data-row-level={level}>
        {/* Expand button */}
        <td className={styles.tdExpand}>
          {level === 0 && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => onToggleItem(row.key, row)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 size={14} className={styles.spinner} />
              ) : isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}
        </td>

        {visibleColumns.map((column) => {
          const columnKey = column.key
          const columnWidth = columnWidths[columnKey]
          const isNumeric = column.align === 'right'

          if (columnKey === 'key') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={styles.td}
                style={{
                  width: columnWidth || undefined,
                  paddingLeft: level > 0 ? `${level * 24 + 16}px` : undefined,
                }}
              >
                {renderKey()}
              </td>
            )
          }

          if (columnKey === 'property') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={styles.td}
                style={{ width: columnWidth || undefined }}
              >
                <span className={styles.propertyBadge} title={row.siteUrl}>
                  {row.siteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}
                </span>
              </td>
            )
          }

          if (columnKey === 'clicks') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={`${styles.td} ${isNumeric ? styles.tdNumeric : ''}`}
                style={{ width: columnWidth || undefined }}
              >
                {formatNumber(row.clicks)}
              </td>
            )
          }

          if (columnKey === 'impressions') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={`${styles.td} ${isNumeric ? styles.tdNumeric : ''}`}
                style={{ width: columnWidth || undefined }}
              >
                {formatNumber(row.impressions)}
              </td>
            )
          }

          if (columnKey === 'ctr') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={`${styles.td} ${isNumeric ? styles.tdNumeric : ''}`}
                style={{ width: columnWidth || undefined }}
              >
                {formatCTR(row.ctr)}
              </td>
            )
          }

          if (columnKey === 'position') {
            return (
              <td
                key={columnKey}
                data-column-key={columnKey}
                className={`${styles.td} ${isNumeric ? styles.tdNumeric : ''}`}
                style={{ width: columnWidth || undefined }}
              >
                {formatPosition(row.position)}
              </td>
            )
          }

          return null
        })}
      </tr>

      {/* Render children if expanded */}
      {isExpanded && children && children.map((child) => (
        <TableRow
          key={`${row.key}-${child.key}`}
          row={child}
          level={level + 1}
          visibleColumns={visibleColumns}
          columnWidths={columnWidths}
          expandedItems={expandedItems}
          onToggleItem={onToggleItem}
          loadingExpand={loadingExpand}
          hierarchicalData={hierarchicalData}
          groupBy={groupBy}
        />
      ))}
    </>
  );
}

function prepareExportData(
  data: SearchConsoleRow[],
  hierarchicalData: Map<string, SearchConsoleRow[]>,
  expandedItems: Set<string>
): Array<Record<string, string | number>> {
  const exportRows: Array<Record<string, string | number>> = [];

  for (const row of data) {
    exportRows.push({
      Chave: row.key,
      Propriedade: row.siteUrl,
      Cliques: row.clicks,
      Impressões: row.impressions,
      CTR: `${(row.ctr * 100).toFixed(2)}%`,
      Posição: row.position.toFixed(1),
    });

    // Include children if expanded
    if (expandedItems.has(row.key)) {
      const children = hierarchicalData.get(row.key);
      if (children) {
        for (const child of children) {
          exportRows.push({
            Chave: `  ${child.key}`,
            Propriedade: child.siteUrl,
            Cliques: child.clicks,
            Impressões: child.impressions,
            CTR: `${(child.ctr * 100).toFixed(2)}%`,
            Posição: child.position.toFixed(1),
          });
        }
      }
    }
  }

  return exportRows;
}
