import { ChevronDown, X } from 'lucide-react'
import cx from 'classnames'
import React, { ReactNode } from 'react'
import Icon from '../Icon'
import './index.css'

interface FormControlProps {
  children: ReactNode
  className?: string
  select?: boolean
  segmented?: boolean
  small?: boolean
  onClear?: () => void
  sideButton?: ReactNode
  leftButton?: ReactNode
}

const FormControl: React.FC<FormControlProps> = ({
  children,
  className,
  select = false,
  segmented = false,
  small = false,
  onClear,
  sideButton,
  leftButton
}) => {
  return (
    <div
      className={cx('FormControl', className, {
        'FormControl--select': select,
        'FormControl--segmented': segmented,
        'FormControl--small': small,
        'FormControl--clearable': !!onClear,
        'FormControl--hasSideButton': !!sideButton,
        'FormControl--hasLeftButton': leftButton
      })}
    >
      {leftButton && (
        <span className="FormControl__leftButton" tabIndex={-1}>
          {leftButton}
        </span>
      )}
      {children}
      {select && (
        <span className="FormControl__caret">
          <Icon glyph={ChevronDown} size="sm" />
        </span>
      )}
      {onClear && (
        <button className="FormControl__clear" onClick={onClear} tabIndex={-1}>
          <Icon glyph={X} size="sm" />
        </button>
      )}
      {sideButton && (
        <span
          className="FormControl__sideButton"
          onClick={onClear}
          tabIndex={-1}
        >
          {sideButton}
        </span>
      )}
    </div>
  )
}

export default FormControl
