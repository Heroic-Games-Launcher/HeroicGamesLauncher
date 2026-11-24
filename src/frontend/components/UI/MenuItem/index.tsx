import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

type MenuItemTone = 'default' | 'danger'

interface MenuItemProps {
  children: ReactNode
  glyph?: LucideIcon
  icon?: ReactNode
  tone?: MenuItemTone
  disabled?: boolean
  title?: string
  className?: string
  onClick?: () => void
}

export default function MenuItem({
  children,
  glyph,
  icon,
  tone = 'default',
  disabled = false,
  title,
  className,
  onClick
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={classNames('MenuItem', `MenuItem--${tone}`, className)}
    >
      <span className="MenuItem__icon">
        {glyph ? <Icon glyph={glyph} size="md" /> : icon}
      </span>
      <span className="MenuItem__label">{children}</span>
    </button>
  )
}
