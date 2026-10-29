import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

type BadgeVariant =
  | 'neutral'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  glyph?: LucideIcon
  title?: string
  className?: string
  onOverlay?: boolean
}

export default function Badge({
  children,
  variant = 'neutral',
  glyph,
  title,
  className,
  onOverlay = false
}: BadgeProps) {
  return (
    <span
      className={classNames(
        'Badge',
        `Badge--${variant}`,
        { 'Badge--onOverlay': onOverlay },
        className
      )}
      title={title}
    >
      {glyph && <Icon glyph={glyph} size="xs" />}
      {children}
    </span>
  )
}
