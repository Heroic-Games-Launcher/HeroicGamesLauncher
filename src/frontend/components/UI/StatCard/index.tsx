import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import Panel from '../Panel'
import './index.css'

interface StatCardProps {
  label: string
  value: ReactNode
  glyph?: LucideIcon
  className?: string
  onClick?: () => void
  title?: string
}

export default function StatCard({
  label,
  value,
  glyph,
  className,
  onClick,
  title
}: StatCardProps) {
  return (
    <Panel
      tone="glass"
      padding="sm"
      className={classNames('StatCard', className, {
        'StatCard--clickable': !!onClick
      })}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      <span className="StatCard__label">
        {glyph && <Icon glyph={glyph} size="sm" />}
        {label}
      </span>
      <span className="StatCard__value">{value}</span>
    </Panel>
  )
}
