import { ReactNode } from 'react'
import classNames from 'classnames'
import Panel from '../Panel'
import './index.css'

interface SpecCardProps {
  title: string
  media?: ReactNode
  children: ReactNode
  className?: string
}

export default function SpecCard({
  title,
  media,
  children,
  className
}: SpecCardProps) {
  return (
    <Panel padding="md" className={classNames('SpecCard', className)}>
      <span className="SpecCard__title">{title}</span>
      {media && <div className="SpecCard__media">{media}</div>}
      <div className="SpecCard__body">{children}</div>
    </Panel>
  )
}
