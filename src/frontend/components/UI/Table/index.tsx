import { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import classNames from 'classnames'
import Skeleton from '../Skeleton'
import './index.css'

export type TableAlign = 'start' | 'center' | 'end'

export interface TableColumn<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  align?: TableAlign
  width?: string
  collapseOnNarrow?: boolean
  className?: string
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  caption?: string
  density?: 'comfortable' | 'compact'
  stickyHeader?: boolean
  loading?: boolean
  loadingRows?: number
  empty?: ReactNode
  rowClassName?: (row: T) => string | undefined
  rowStyle?: (row: T) => CSSProperties | undefined
  onRowClick?: (row: T) => void
  className?: string
}

export default function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
  density = 'comfortable',
  stickyHeader = true,
  loading = false,
  loadingRows = 6,
  empty,
  rowClassName,
  rowStyle,
  onRowClick,
  className
}: TableProps<T>) {
  const cellClassName = (column: TableColumn<T>) =>
    classNames(
      'Table__cell',
      `Table__cell--${column.align ?? 'start'}`,
      column.className,
      { 'Table__cell--collapse': column.collapseOnNarrow }
    )

  const activateRow =
    (row: T) => (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onRowClick?.(row)
    }

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: loadingRows }, (_, index) => (
        <tr className="Table__row" key={`skeleton-${index}`}>
          {columns.map((column) => (
            <td className={cellClassName(column)} key={column.key}>
              <div className="Table__cellInner">
                <Skeleton height="14px" width="60%" />
              </div>
            </td>
          ))}
        </tr>
      ))
    }

    if (!rows.length) {
      return (
        <tr className="Table__row Table__row--empty">
          <td className="Table__emptyCell" colSpan={columns.length}>
            {empty}
          </td>
        </tr>
      )
    }

    return rows.map((row) => (
      <tr
        key={rowKey(row)}
        className={classNames('Table__row', rowClassName?.(row), {
          'Table__row--clickable': !!onRowClick
        })}
        style={rowStyle?.(row)}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        onKeyDown={onRowClick ? activateRow(row) : undefined}
        tabIndex={onRowClick ? 0 : undefined}
      >
        {columns.map((column) => (
          <td className={cellClassName(column)} key={column.key}>
            <div className="Table__cellInner">{column.render(row)}</div>
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div
      className={classNames('Table', `Table--${density}`, className, {
        'Table--stickyHeader': stickyHeader
      })}
    >
      <table className="Table__table">
        {caption && <caption className="Table__caption">{caption}</caption>}
        <thead className="Table__head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={classNames(
                  'Table__headCell',
                  `Table__cell--${column.align ?? 'start'}`,
                  column.className,
                  { 'Table__cell--collapse': column.collapseOnNarrow }
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="Table__body">{renderBody()}</tbody>
      </table>
    </div>
  )
}
