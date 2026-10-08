import { Star } from 'lucide-react'
import classNames from 'classnames'
import Icon from '../Icon'
import './index.css'

interface RatingProps {
  value: number
  max?: number
  className?: string
  title?: string
}

export default function Rating({
  value,
  max = 5,
  className,
  title
}: RatingProps) {
  return (
    <span className={classNames('Rating', className)} title={title}>
      <Icon
        glyph={Star}
        size="sm"
        className="Rating__star"
        fill="currentColor"
      />
      <span className="Rating__value">
        {value.toFixed(1)}/{max.toFixed(1)}
      </span>
    </span>
  )
}
