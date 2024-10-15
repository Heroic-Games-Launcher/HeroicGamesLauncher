import React, { ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import { Select, MenuItem, SelectChangeEvent } from '@mui/material'
import './index.css'

interface SelectFieldProps {
  htmlId: string
  value: string
  onChange: (event: SelectChangeEvent) => void
  children: ReactNode
  afterSelect?: ReactNode
  label?: string
  prompt?: string
  disabled?: boolean
  extraClass?: string
}

export default function SelectField({
  htmlId,
  value,
  onChange,
  label,
  prompt,
  disabled = false,
  extraClass = '',
  afterSelect,
  children
}: SelectFieldProps) {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div
      className={classnames(`selectFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <Select id={htmlId} value={value} onChange={onChange} disabled={disabled}>
        {prompt && <MenuItem value="">{prompt}</MenuItem>}
        {children}
      </Select>
      {afterSelect}
    </div>
  )
}
