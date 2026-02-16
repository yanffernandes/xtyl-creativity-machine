import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import styles from './Table.module.css'

export interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

export function Table({ className, children, ...props }: TableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={clsx(styles.table, className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableHead({ className, children, ...props }: TableHeadProps) {
  return (
    <thead className={clsx(styles.head, className)} {...props}>
      {children}
    </thead>
  )
}

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode
}

export function TableBody({ className, children, ...props }: TableBodyProps) {
  return (
    <tbody className={clsx(styles.body, className)} {...props}>
      {children}
    </tbody>
  )
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode
  isSelected?: boolean
  isClickable?: boolean
}

export function TableRow({ className, children, isSelected, isClickable, ...props }: TableRowProps) {
  return (
    <tr
      className={clsx(styles.row, isSelected && styles.selected, isClickable && styles.clickable, className)}
      {...props}
    >
      {children}
    </tr>
  )
}

export interface TableHeaderProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | null
  onSort?: () => void
}

export function TableHeader({ className, children, sortable, sortDirection, onSort, ...props }: TableHeaderProps) {
  return (
    <th
      className={clsx(styles.header, sortable && styles.sortable, className)}
      onClick={sortable ? onSort : undefined}
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
      {...props}
    >
      <div className={styles.headerContent}>
        {children}
        {sortable && (
          <span className={styles.sortIcon}>
            {sortDirection === 'asc' && '↑'}
            {sortDirection === 'desc' && '↓'}
            {!sortDirection && '↕'}
          </span>
        )}
      </div>
    </th>
  )
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children?: ReactNode
}

export function TableCell({ className, children, ...props }: TableCellProps) {
  return (
    <td className={clsx(styles.cell, className)} {...props}>
      {children}
    </td>
  )
}
