import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

interface EmptyStateProps {
  title: ReactNode
  glyph?: LucideIcon
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  title,
  glyph,
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
      <p className="EmptyState__title">{title}</p>
      {description && <p className="EmptyState__description">{description}</p>}
      {action && <div className="EmptyState__action">{action}</div>}
    </div>
  )
}
