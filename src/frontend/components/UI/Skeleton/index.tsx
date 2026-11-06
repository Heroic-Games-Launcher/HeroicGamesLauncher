import classNames from 'classnames'
import './index.css'

interface SkeletonProps {
  width?: string
  height?: string
  radius?: string
  className?: string
}

export default function Skeleton({
  width = '100%',
  height = '1em',
  radius = '8px',
  className
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={classNames('Skeleton', className)}
      style={{ width, height, borderRadius: radius }}
    />
  )
}
