import classNames from 'classnames'
import './index.css'

interface CountBadgeProps {
  count: number
  label?: string
  className?: string
}

export default function CountBadge({
  count,
  label,
  className
}: CountBadgeProps) {
  if (count <= 0) return null

  return (
    <span
      className={classNames('CountBadge', className)}
      aria-label={label}
      title={label}
    >
      {count}
    </span>
  )
}
