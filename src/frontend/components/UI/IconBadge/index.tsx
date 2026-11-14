import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

type IconBadgeSize = 'md' | 'lg'
type IconBadgeTone = 'surface' | 'accent'

interface IconBadgeProps {
  glyph?: LucideIcon
  children?: ReactNode
  size?: IconBadgeSize
  tone?: IconBadgeTone
  className?: string
}

export default function IconBadge({
  glyph,
  children,
  size = 'lg',
  tone = 'surface',
  className
}: IconBadgeProps) {
  return (
    <span
      className={classNames(
        'IconBadge',
        `IconBadge--${size}`,
        `IconBadge--${tone}`,
        className
      )}
    >
      {glyph ? (
        <Icon glyph={glyph} size={size === 'lg' ? 'lg' : 'md'} />
      ) : (
        children
      )}
    </span>
  )
}
