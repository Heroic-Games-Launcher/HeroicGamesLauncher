import { faCaretDown, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { ReactNode } from 'react'
import './index.css'

export interface FormControlProps {
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
      {children}
      {select && (
        <span className="FormControl__caret">
          <FontAwesomeIcon icon={faCaretDown} />
        </span>
      )}
      {onClear && (
        <button className="FormControl__clear" onClick={onClear} tabIndex={-1}>
          <FontAwesomeIcon icon={faXmark} />
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
      {leftButton && (
        <span className="FormControl__leftButton" tabIndex={-1}>
          {leftButton}
        </span>
      )}
    </div>
  )
}

export default FormControl
