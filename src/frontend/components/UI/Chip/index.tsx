import { ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

interface ChipProps {
  children: ReactNode
  icon?: ReactNode
  active?: boolean
  title?: string
  className?: string
  onClick?: () => void
}

export default function Chip({
  children,
  icon,
  active = false,
  title,
  className,
  onClick
}: ChipProps) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      className={classNames('Chip', className, { 'Chip--active': active })}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
