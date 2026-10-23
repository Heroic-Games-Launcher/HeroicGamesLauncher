import { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

type AlertVariant = 'neutral' | 'info' | 'success' | 'warning' | 'error'

const GLYPHS: Record<AlertVariant, LucideIcon> = {
  neutral: Info,
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert
}

interface AlertProps {
  children: ReactNode
  variant?: AlertVariant
  title?: string
  glyph?: LucideIcon
  actions?: ReactNode
  className?: string
}

export default function Alert({
  children,
  variant = 'neutral',
  title,
  glyph,
  actions,
  className
}: AlertProps) {
  const Glyph = glyph ?? GLYPHS[variant]

  return (
    <div
      className={classNames('Alert', `Alert--${variant}`, className)}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon glyph={Glyph} size="lg" className="Alert__icon" />
      <div className="Alert__body">
        {title && <span className="Alert__title">{title}</span>}
        <span className="Alert__message">{children}</span>
      </div>
      {actions && <div className="Alert__actions">{actions}</div>}
    </div>
  )
}
