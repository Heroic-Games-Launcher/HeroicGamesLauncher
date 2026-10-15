import classNames from 'classnames'
import './index.css'

type ProgressTone = 'accent' | 'success' | 'warning'

interface ProgressBarProps {
  value?: number
  tone?: ProgressTone
  className?: string
  label?: string
  showValue?: boolean
}

export default function ProgressBar({
  value,
  tone = 'accent',
  className,
  label,
  showValue = false
}: ProgressBarProps) {
  const indeterminate = value === undefined || Number.isNaN(value)
  const clamped = indeterminate ? 0 : Math.min(100, Math.max(0, value))

  return (
    <div className={classNames('ProgressBar', className)}>
      <div
        className={classNames('ProgressBar__track', `ProgressBar--${tone}`, {
          'ProgressBar--indeterminate': indeterminate
        })}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="ProgressBar__fill"
          style={indeterminate ? undefined : { width: `${clamped}%` }}
        />
      </div>
      {showValue && !indeterminate && (
        <span className="ProgressBar__value">{Math.round(clamped)}%</span>
      )}
    </div>
  )
}
