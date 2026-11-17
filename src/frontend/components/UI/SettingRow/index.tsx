import { ReactNode } from 'react'
import classNames from 'classnames'
import './index.css'

type SettingRowLayout = 'inline' | 'stacked'

interface SettingRowProps {
  label: ReactNode
  children: ReactNode
  labelAfter?: ReactNode
  description?: ReactNode
  layout?: SettingRowLayout
  htmlFor?: string
  className?: string
}

export default function SettingRow({
  label,
  children,
  labelAfter,
  description,
  layout = 'inline',
  htmlFor,
  className
}: SettingRowProps) {
  const Label = htmlFor ? 'label' : 'span'

  return (
    <div
      className={classNames('SettingRow', `SettingRow--${layout}`, className)}
    >
      <div className="SettingRow__text">
        <span className="SettingRow__labelLine">
          <Label className="SettingRow__label" htmlFor={htmlFor}>
            {label}
          </Label>
          {labelAfter}
        </span>
        {description && (
          <span className="SettingRow__description">{description}</span>
        )}
      </div>
      <div className="SettingRow__control">{children}</div>
    </div>
  )
}
