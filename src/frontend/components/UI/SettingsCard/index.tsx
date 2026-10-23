import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import Panel from '../Panel'
import './index.css'

interface SettingsCardProps {
  title: string
  children: ReactNode
  glyph?: LucideIcon
  description?: string
  className?: string
}

export default function SettingsCard({
  title,
  children,
  glyph,
  description,
  className
}: SettingsCardProps) {
  return (
    <Panel className={classNames('SettingsCard', className)}>
      <div className="SettingsCard__header">
        {glyph && (
          <Icon glyph={glyph} size="lg" className="SettingsCard__icon" />
        )}
        <h3 className="SettingsCard__title">{title}</h3>
      </div>
      {description && (
        <p className="SettingsCard__description">{description}</p>
      )}
      <div className="SettingsCard__body">{children}</div>
    </Panel>
  )
}
