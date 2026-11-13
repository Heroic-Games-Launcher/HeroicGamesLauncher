import { ReactNode } from 'react'
import classNames from 'classnames'
import Panel from '../Panel'
import './index.css'

interface FeatureCardProps {
  title: string
  icon?: ReactNode
  description?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  className?: string
}

export default function FeatureCard({
  title,
  icon,
  description,
  meta,
  action,
  className
}: FeatureCardProps) {
  return (
    <Panel padding="lg" className={classNames('FeatureCard', className)}>
      {(icon || meta) && (
        <div className="FeatureCard__header">
          {icon && <div className="FeatureCard__icon">{icon}</div>}
          {meta && <div className="FeatureCard__meta">{meta}</div>}
        </div>
      )}
      <div className="FeatureCard__body">
        <h3 className="FeatureCard__title">{title}</h3>
        {description && (
          <p className="FeatureCard__description">{description}</p>
        )}
      </div>
      {action && <div className="FeatureCard__footer">{action}</div>}
    </Panel>
  )
}
