import { ChevronRight, type LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import { NavLink } from 'react-router-dom'
import Icon from '../Icon'
import './index.css'

export interface NavListItem {
  to: string
  label: string
  glyph?: LucideIcon
}

interface NavListProps {
  items: NavListItem[]
  className?: string
  'aria-label'?: string
}

export default function NavList({
  items,
  className,
  'aria-label': ariaLabel
}: NavListProps) {
  return (
    <nav className={classNames('NavList', className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            classNames('NavList__item', {
              'NavList__item--active': isActive
            })
          }
        >
          {item.glyph && (
            <Icon glyph={item.glyph} size="sm" className="NavList__glyph" />
          )}
          <span className="NavList__label">{item.label}</span>
          <Icon
            glyph={ChevronRight}
            size="sm"
            className="NavList__chevron"
            strokeWidth={2}
          />
        </NavLink>
      ))}
    </nav>
  )
}
