import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

export interface DetailItem {
  label: string
  value: ReactNode
  glyph?: LucideIcon
  onClick?: () => void
  title?: string
}

interface DetailListProps {
  items: DetailItem[]
  columns?: 1 | 2
  className?: string
}

export default function DetailList({
  items,
  columns = 1,
  className
}: DetailListProps) {
  if (!items.length) {
    return null
  }

  const hasIcons = items.some((item) => item.glyph)

  return (
    <dl
      className={classNames(
        'DetailList',
        `DetailList--cols-${columns}`,
        className,
        {
          'DetailList--withIcons': hasIcons
        }
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={classNames('DetailList__row', {
            'DetailList__row--clickable': !!item.onClick
          })}
          onClick={item.onClick}
          title={item.title}
        >
          {hasIcons && (
            <span className="DetailList__icon">
              {item.glyph && <Icon glyph={item.glyph} size="sm" />}
            </span>
          )}
          <dt className="DetailList__label">{item.label}</dt>
          <dd className="DetailList__value">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
