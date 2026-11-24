import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import classNames from 'classnames'
import { NavLink } from 'react-router-dom'
import Icon from '../Icon'
import './index.css'

interface PageHeaderProps {
  title?: string
  description?: string
  backTo?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export default function PageHeader({
  title,
  description,
  backTo,
  backLabel,
  actions,
  className
}: PageHeaderProps) {
  return (
    <header className={classNames('PageHeader', className)}>
      <div className="PageHeader__text">
        <div className="PageHeader__titleLine">
          {backTo && (
            <NavLink
              to={backTo}
              title={backLabel}
              aria-label={backLabel}
              className="PageHeader__back"
            >
              <Icon glyph={ArrowLeft} size="lg" />
            </NavLink>
          )}
          {title && <h1 className="PageHeader__title">{title}</h1>}
        </div>
        {description && (
          <p className="PageHeader__description">{description}</p>
        )}
      </div>
      {actions && <div className="PageHeader__actions">{actions}</div>}
    </header>
  )
}
