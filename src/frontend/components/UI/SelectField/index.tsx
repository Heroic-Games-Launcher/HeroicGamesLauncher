import React, { ChangeEvent, ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import { Stack } from '@mui/material'

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
  inlineElement?: ReactNode
}

const SelectField = ({
  htmlId,
  value,
  onChange,
  label,
  prompt,
  disabled = false,
  extraClass = '',
  afterSelect,
  children,
  inlineElement
}: SelectFieldProps) => {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div
      className={classnames(`selectFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <Stack direction="row">
        <select
          id={htmlId}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {prompt && <option value="">{prompt}</option>}
          {children}
        </select>
        {inlineElement}
      </Stack>
      {afterSelect}
    </div>
  )
}

export default React.memo(SelectField)
