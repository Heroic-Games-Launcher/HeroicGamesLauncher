import type { LucideIcon } from 'lucide-react'
import './index.css'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 26
}

const DEFAULT_STROKE = 1.75

interface IconProps {
  glyph: LucideIcon
  size?: IconSize
  strokeWidth?: number
  className?: string
  label?: string
  fill?: string
  fillOpacity?: number
}

export default function Icon({
  glyph: Glyph,
  size = 'lg',
  strokeWidth,
  className,
  label,
  fill = 'none',
  fillOpacity
}: IconProps) {
  return (
    <Glyph
      className={className}
      size={SIZES[size]}
      strokeWidth={strokeWidth ?? DEFAULT_STROKE}
      fill={fill}
      {...(fillOpacity === undefined ? {} : { fillOpacity })}
      aria-hidden={label ? undefined : true}
      aria-label={label}
    />
  )
}
