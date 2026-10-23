import classNames from 'classnames'
import { Runner } from 'common/types'
import StoreLogos from '../StoreLogos'
import './index.css'

interface StoreBadgeProps {
  runner: Runner
  className?: string
}

export default function StoreBadge({ runner, className }: StoreBadgeProps) {
  return (
    <span className={classNames('StoreBadge', className)}>
      <StoreLogos runner={runner} className="StoreBadge__logo" />
    </span>
  )
}
