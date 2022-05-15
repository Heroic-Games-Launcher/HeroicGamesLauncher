import React, { ChangeEvent, ReactNode, useContext } from 'react'
import classNames from 'classnames'
import ContextProvider from 'src/state/ContextProvider'
import './index.css'

interface SelectFieldProps {
  htmlId: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  afterSelect?: ReactNode
  label?: string
  prompt?: string
  disabled?: boolean
  extraClass?: string
}

export const SelectField = ({
  htmlId,
  value,
  onChange,
  label,
  prompt,
  disabled = false,
  extraClass = '',
  afterSelect,
  children
}: SelectFieldProps) => {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div className={`setting selectWrapper ${extraClass}`}>
      {label && (
        <label
          className={classNames('settingText', { isRTL: isRTL })}
          htmlFor={htmlId}
        >
          {label}
        </label>
      )}
      <select
        id={htmlId}
        value={value}
        onChange={onChange}
        className="settingSelect is-drop-down"
        disabled={disabled}
      >
        {prompt && <option value="">{prompt}</option>}
        {children}
      </select>
      {afterSelect}
    </div>
  )
}
