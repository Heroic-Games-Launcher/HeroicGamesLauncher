import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

export interface TabItem<T extends string> {
  value: T
  label: string
  glyph?: LucideIcon
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  'aria-label'?: string
}

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  'aria-label': ariaLabel
}: TabsProps<T>) {
  return (
    <div
      className={classNames('Tabs', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`tab-${item.value}`}
          aria-selected={item.value === value}
          aria-controls={`tabpanel-${item.value}`}
          className={classNames('Tabs__tab', {
            'Tabs__tab--active': item.value === value
          })}
          onClick={() => onChange(item.value)}
        >
          {item.glyph && <Icon glyph={item.glyph} size="sm" />}
          {item.label}
        </button>
      ))}
    </div>
  )
}
