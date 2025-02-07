import React, { ReactNode, useContext, useEffect, useRef } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

interface TextInputFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  htmlId: string
  inputIcon?: ReactNode
  afterInput?: ReactNode
  label?: string
  placeholder?: string
  extraClass?: string
  warning?: ReactNode
  value: string
  onChange: (newValue: string) => void
}

const TextInputField = ({
  htmlId,
  label,
  extraClass = '',
  inputIcon,
  afterInput,
  warning,
  value,
  onChange,
  ...inputProps
}: TextInputFieldProps) => {
  const { isRTL } = useContext(ContextProvider)
  const input = useRef<HTMLInputElement>(null)

  // we have to use an event listener instead of the react
  // onChange callback so it works with the virtual keyboard
  useEffect(() => {
    if (input.current) {
      const element = input.current
      element.value = value
      const handler = () => {
        onChange(element.value)
      }
      element.addEventListener('input', handler)
      return () => {
        element.removeEventListener('input', handler)
      }
    }
    return
  }, [input])

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
        ref={input}
        {...inputProps}
        // passing this dummy onChange function to avoid a React warning
        // we are handling the change with the eventListener above
        onChange={() => {}}
      />
      {value && warning}
      {afterInput}
    </div>
  )
}

export default TextInputField
