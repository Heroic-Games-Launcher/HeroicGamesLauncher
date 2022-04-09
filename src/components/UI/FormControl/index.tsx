import { faCaretDown, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React, { ReactNode } from 'react'
import './index.css'

export interface FormControlProps {
  className?: string
  select?: boolean
  segmented?: boolean
  small?: boolean
  onClear?: () => void
  sideButton?: ReactNode
}

const FormControl: React.FC<FormControlProps> = ({
  children,
  className = undefined,
  select = false,
  segmented = false,
  small = false,
  onClear = undefined,
  sideButton = undefined
}) => {
  return (
    <div
      className={cx('FormControl', className, {
        'FormControl--select': select,
        'FormControl--segmented': segmented,
        'FormControl--small': small,
        'FormControl--clearable': !!onClear,
        'FormControl--hasSideButton': !!sideButton
      })}
    >
      {children}
      {select && (
        <span className="FormControl__caret">
          <FontAwesomeIcon icon={faCaretDown} />
        </span>
      )}
      {onClear && (
        <span className="FormControl__clear" onClick={onClear} tabIndex={-1}>
          <FontAwesomeIcon icon={faXmark} />
        </span>
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
