import React, { ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

interface TextInputFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  htmlId: string
  inputIcon?: ReactNode
  afterInput?: ReactNode
  label?: string
  placeholder?: string
  extraClass?: string
  warning?: ReactNode
}

const TextInputField = ({
  htmlId,
  label,
  extraClass = '',
  inputIcon,
  afterInput,
  warning,
  value,
  ...inputProps
}: TextInputFieldProps) => {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div
      className={classnames(`textInputFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      {inputIcon}
      <input type="text" id={htmlId} value={value} {...inputProps} />
      {value && warning}
      {afterInput}
    </div>
  )
}

export default TextInputField
