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
  layout?: 'stacked' | 'inline'
  className?: string
}

export default function FeatureCard({
  title,
  icon,
  description,
  meta,
  action,
  layout = 'stacked',
  className
}: FeatureCardProps) {
  const body = (
    <div className="FeatureCard__body">
      <h3 className="FeatureCard__title">{title}</h3>
      {description && <p className="FeatureCard__description">{description}</p>}
    </div>
  )

  return (
    <Panel
      padding="lg"
      className={classNames('FeatureCard', `FeatureCard--${layout}`, className)}
    >
      {layout === 'inline' ? (
        <div className="FeatureCard__header">
          {icon && <div className="FeatureCard__icon">{icon}</div>}
          <div className="FeatureCard__inlineContent">
            {body}
            {meta && <div className="FeatureCard__meta">{meta}</div>}
          </div>
        </div>
      ) : (
        <>
          {(icon || meta) && (
            <div className="FeatureCard__header">
              {icon && <div className="FeatureCard__icon">{icon}</div>}
              {meta && <div className="FeatureCard__meta">{meta}</div>}
            </div>
          )}
          {body}
        </>
      )}
      {action && <div className="FeatureCard__footer">{action}</div>}
    </Panel>
  )
}
