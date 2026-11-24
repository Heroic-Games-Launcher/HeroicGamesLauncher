import { AnchorHTMLAttributes, ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  external?: boolean
  glyph?: LucideIcon
  className?: string
}

export default function Link({
  children,
  external = false,
  glyph,
  className,
  target,
  rel,
  ...rest
}: LinkProps) {
  const Glyph = glyph ?? (external ? ExternalLink : undefined)

  return (
    <a
      className={classNames('Link', className)}
      target={target ?? (external ? '_blank' : undefined)}
      rel={rel ?? (external ? 'noreferrer' : undefined)}
      {...rest}
    >
      <span className="Link__label">{children}</span>
      {Glyph && <Icon glyph={Glyph} size="sm" className="Link__icon" />}
    </a>
  )
}
