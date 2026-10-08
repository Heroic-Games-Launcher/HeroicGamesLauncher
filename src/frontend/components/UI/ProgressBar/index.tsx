import classNames from 'classnames'
import './index.css'

type ProgressTone = 'accent' | 'success' | 'warning'

interface ProgressBarProps {
  value: number
  tone?: ProgressTone
  className?: string
  label?: string
}

export default function ProgressBar({
  value,
  tone = 'accent',
  className,
  label
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={classNames('ProgressBar', `ProgressBar--${tone}`, className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="ProgressBar__fill" style={{ width: `${clamped}%` }} />
    </div>
  )
}
