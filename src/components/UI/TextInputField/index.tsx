import React, { ChangeEvent, ReactNode, useContext } from 'react'
import classNames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

interface SelectFieldProps {
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

export const TextInpuField = ({
  htmlId,
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  extraClass = '',
  inputIcon,
  afterInput
}: SelectFieldProps) => {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div className={`setting textInputWrapper ${extraClass}`}>
      {label && (
        <label
          className={classNames('settingText', { isRTL: isRTL })}
          htmlFor={htmlId}
        >
          {label}
        </label>
      )}
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
