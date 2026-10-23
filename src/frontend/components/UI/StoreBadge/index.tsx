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
    <span className={classNames('StoreBadge', className)} title={title}>
      <StoreLogos runner={runner} className="StoreBadge__logo" />
    </span>
  )
}
