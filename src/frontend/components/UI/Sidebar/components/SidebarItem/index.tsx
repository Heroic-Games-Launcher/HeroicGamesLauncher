import React, { MouseEventHandler } from 'react'
import classNames from 'classnames'
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import './index.css'

interface SidebarItemProps {
  label: string
  url?: string
  icon?: IconProp
  isActiveFallback?: boolean
  onClick?: MouseEventHandler
  className?: string
  elementType?: 'a' | 'button'
}

export default function SidebarItem({
  icon,
  label,
  url = '',
  isActiveFallback = false,
  onClick,
  className,
  elementType
}: SidebarItemProps) {
  const itemContent = (
    <>
      {icon && (
        <div className="Sidebar__itemIcon">
          <FontAwesomeIcon icon={icon} title={label} />
        </div>
      )}
      <span>{label}</span>
    </>
  )

  switch (elementType) {
    case 'button':
      return (
        <button className="Sidebar__item" onClick={onClick}>
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
        >
          {itemContent}
        </NavLink>
      )
  }
}
