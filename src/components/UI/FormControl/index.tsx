import { faCaretDown, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import cx from 'classnames'
import React from 'react'
import './index.css'

export interface FormControlProps {
  className?: string
  select?: boolean
  segmented?: boolean
  small?: boolean
  onClear?: () => void
}

const FormControl: React.FC<FormControlProps> = ({
  children,
  className = undefined,
  select = false,
  segmented = false,
  small = false,
  onClear = undefined
}) => {
  return (
    <div
      className={cx('FormControl', className, {
        'FormControl--select': select,
        'FormControl--segmented': segmented,
        'FormControl--small': small,
        'FormControl--clearable': !!onClear
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
    </div>
  )
}

export default FormControl
