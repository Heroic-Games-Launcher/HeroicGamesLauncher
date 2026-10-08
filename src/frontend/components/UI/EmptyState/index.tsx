import { ReactNode } from 'react'
import classNames from 'classnames'
import type { LucideIcon } from 'lucide-react'
import Icon from '../Icon'
import './index.css'

interface EmptyStateProps {
  glyph?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  glyph,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={classNames('EmptyState', className)}>
      {glyph && (
        <span className="EmptyState__icon">
          <Icon glyph={glyph} size="xl" />
        </span>
      )}
      <h2 className="EmptyState__title">{title}</h2>
      {description && <p className="EmptyState__description">{description}</p>}
      {action && <div className="EmptyState__action">{action}</div>}
    </div>
  )
}
