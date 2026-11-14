import type { LucideIcon } from 'lucide-react'
import classnames from 'classnames'
import Icon from '../Icon'
import './index.css'

export interface SegmentedControlItem<T extends string> {
  value: T
  label: string
  glyph?: LucideIcon
}

interface SegmentedControlProps<T extends string> {
  items: SegmentedControlItem<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
  className?: string
}

export default function SegmentedControl<T extends string>({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  className
}: SegmentedControlProps<T>) {
  return (
    <div
      className={classnames('SegmentedControl', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={classnames('SegmentedControl__item', {
              'SegmentedControl__item--active': active
            })}
            onClick={() => onChange(item.value)}
          >
            {item.glyph && <Icon glyph={item.glyph} size="sm" />}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
