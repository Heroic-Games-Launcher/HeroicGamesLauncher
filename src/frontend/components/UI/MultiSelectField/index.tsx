import { useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent
} from '@mui/material'
import Checkbox from 'frontend/components/UI/Checkbox'
import 'frontend/components/UI/SelectField/index.css'
import './index.css'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectFieldProps {
  htmlId: string
  values: string[]
  options: MultiSelectOption[]
  onChange: (values: string[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  extraClass?: string
}

/**
 * Multi-select sibling of SelectField: a dropdown whose menu items carry
 * checkboxes and whose closed state summarises the current selection. Shares
 * SelectField's visual styling so single- and multi-selects match.
 */
export default function MultiSelectField({
  htmlId,
  values,
  options,
  onChange,
  label,
  placeholder = '',
  disabled = false,
  extraClass = ''
}: MultiSelectFieldProps) {
  const { isRTL } = useContext(ContextProvider)

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value
    onChange(typeof value === 'string' ? value.split(',') : value)
  }

  const renderValue = (selected: string[]) => {
    if (selected.length === 0) {
      return <span className="selectFieldPlaceholder">{placeholder}</span>
    }
    return options
      .filter((option) => selected.includes(option.value))
      .map((option) => option.label)
      .join(', ')
  }

  return (
    <div
      className={classnames(`selectFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <Select
        id={htmlId}
        multiple
        displayEmpty
        tabIndex={-1}
        value={values}
        onChange={handleChange}
        disabled={disabled}
        renderValue={renderValue}
        sx={{
          '& .MuiSelect-icon': { display: 'none' },
          '& .MuiOutlinedInput-notchedOutline legend': { width: 0 },
          '& .MuiSelect-select': {
            textAlign: isRTL ? 'right' : 'left'
          }
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox size="small" checked={values.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </div>
  )
}
