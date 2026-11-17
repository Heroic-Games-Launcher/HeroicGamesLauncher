import { ArrowLeft } from 'lucide-react'
import classNames from 'classnames'
import { NavLink } from 'react-router-dom'
import Icon from '../Icon'
import './index.css'

interface BackButtonProps {
  to: string
  label: string
  className?: string
}

export default function BackButton({ to, label, className }: BackButtonProps) {
  return (
    <NavLink
      to={to}
      title={label}
      className={classNames('BackButton', className)}
    >
      <Icon glyph={ArrowLeft} size="md" />
      <span className="BackButton__label">{label}</span>
    </NavLink>
  )
}
