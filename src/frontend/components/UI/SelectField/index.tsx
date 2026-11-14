import { ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import { Select, MenuItem, SelectChangeEvent } from '@mui/material'
import InfoTooltip from '../InfoTooltip'
import './index.css'

interface SelectFieldProps {
  htmlId: string
  value: string
  onChange: (event: SelectChangeEvent) => void
  children: ReactNode
  afterSelect?: ReactNode
  label?: string
  description?: ReactNode
  info?: ReactNode
  prompt?: string
  disabled?: boolean
  extraClass?: string
  displayEmpty?: boolean
}

export default function SelectField({
  htmlId,
  value,
  onChange,
  label,
  description,
  info,
  prompt,
  disabled = false,
  extraClass = '',
  displayEmpty = false,
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
      {label && (
        <label htmlFor={htmlId}>
          {label}
          {info && <InfoTooltip content={info} label={label} />}
        </label>
      )}
      {description && (
        <span className="selectFieldWrapper__description">{description}</span>
      )}
      <Select
        id={htmlId}
        value={value}
        tabIndex={-1}
        onChange={onChange}
        disabled={disabled}
        displayEmpty={displayEmpty}
        sx={{
          '& .MuiSelect-icon': { display: 'none' },
          '& .MuiOutlinedInput-notchedOutline legend': { width: 0 },
          '& .MuiSelect-select': {
            textAlign: isRTL ? 'right' : 'left'
          }
        }}
      >
        {prompt && <MenuItem value="">{prompt}</MenuItem>}
        {children}
      </Select>
      {afterSelect}
    </div>
  )
}
