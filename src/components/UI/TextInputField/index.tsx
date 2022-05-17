import React, { ChangeEvent, ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

interface TextInputFieldProps {
  htmlId: string
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  inputIcon?: ReactNode
  afterInput?: ReactNode
  label?: string
  placeholder?: string
  disabled?: boolean
  extraClass?: string
}

const TextInputField = ({
  htmlId,
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  extraClass = '',
  inputIcon,
  afterInput
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
      <input
        type="text"
        id={htmlId}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
      />
      {afterInput}
    </div>
  )
}

export default TextInputField
