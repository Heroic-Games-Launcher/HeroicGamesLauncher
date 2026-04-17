import { MouseEventHandler, ReactNode } from 'react'
import classNames from 'classnames'
import { NavLink } from 'react-router-dom'
import './index.css'

interface SidebarItemProps {
  label: string
  url?: string
  icon?: ReactNode
  isActiveFallback?: boolean
  onClick?: MouseEventHandler
  className?: string
  elementType?: 'a' | 'button'
  dataTour?: string
}

export default function SidebarItem({
  icon,
  label,
  url = '',
  isActiveFallback = false,
  onClick,
  className,
  elementType,
  dataTour
}: SidebarItemProps) {
  const itemContent = (
    <>
      {icon && <div className="Sidebar__itemIcon">{icon}</div>}
      <span>{label}</span>
    </>
  )

  switch (elementType) {
    case 'button':
      return (
        <button
          className="Sidebar__item"
          onClick={onClick}
          data-tour={dataTour}
        >
          {itemContent}
        </button>
      )
    default:
      return (
        <NavLink
          className={({ isActive }) =>
            classNames('Sidebar__item', className, {
              active: isActive || isActiveFallback
            })
          }
          to={url}
          onClick={onClick}
          data-tour={dataTour}
        >
          {itemContent}
        </NavLink>
      )
  }
}
