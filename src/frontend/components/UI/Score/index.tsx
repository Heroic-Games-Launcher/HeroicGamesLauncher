import classNames from 'classnames'
import './index.css'

interface ScoreProps {
  label: string
  value?: string | null
  onClick?: () => void
  title?: string
  className?: string
}

function toneFor(value?: string | null) {
  const parsed = Number(value)

  if (!value || Number.isNaN(parsed)) {
    return 'unknown'
  }
  if (parsed > 66) {
    return 'high'
  }
  if (parsed < 33) {
    return 'low'
  }
  return 'mid'
}

export default function Score({
  label,
  value,
  onClick,
  title,
  className
}: ScoreProps) {
  const Element = onClick ? 'button' : 'span'

  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={classNames('Score', className, {
        'Score--clickable': !!onClick
      })}
    >
      <span className="Score__label">{label}</span>
      <span
        className={classNames(
          'Score__value',
          `Score__value--${toneFor(value)}`
        )}
      >
        {value ?? '?'}
      </span>
    </Element>
  )
}
