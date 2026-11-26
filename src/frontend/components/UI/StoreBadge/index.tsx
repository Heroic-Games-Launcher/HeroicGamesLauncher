import classNames from 'classnames'
import { Runner } from 'common/types'
import StoreLogos from '../StoreLogos'
import './index.css'

interface StoreBadgeProps {
  runner: Runner
  title?: string
  className?: string
}

export default function StoreBadge({
  runner,
  title,
  className
}: StoreBadgeProps) {
  return (
    <span
      className={classNames('StoreBadge', className)}
      title={title}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <span className="StoreBadge__mark" aria-hidden="true">
        <StoreLogos runner={runner} className="StoreBadge__logo" />
      </span>
    </span>
  )
}
