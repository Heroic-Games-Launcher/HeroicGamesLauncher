import { ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

interface SectionHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
  'data-tour'?: string
}

export default function SectionHeader({
  title,
  subtitle,
  actions,
  className,
  'data-tour': dataTour
}: SectionHeaderProps) {
  return (
    <div
      className={classNames('SectionHeader', className)}
      data-tour={dataTour}
    >
      <div className="SectionHeader__text">
        <h2 className="SectionHeader__title">{title}</h2>
        {subtitle !== undefined && subtitle !== null && (
          <span className="SectionHeader__subtitle">{subtitle}</span>
        )}
      </div>
      {actions && <div className="SectionHeader__actions">{actions}</div>}
    </div>
  )
}
