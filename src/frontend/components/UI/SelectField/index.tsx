import React, { ChangeEvent, ReactNode } from 'react'
import classnames from 'classnames'
import './index.css'
import { useGlobalState } from 'frontend/state/GlobalStateV2'
import { useShallow } from 'zustand/react/shallow'

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

const SelectField = ({
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
  const isRTL = useGlobalState(useShallow((state) => state.isRTL))

  return (
    <div
      className={classnames(`selectFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <select id={htmlId} value={value} onChange={onChange} disabled={disabled}>
        {prompt && <option value="">{prompt}</option>}
        {children}
      </select>
      {afterSelect}
    </div>
  )
}

export default React.memo(SelectField)
