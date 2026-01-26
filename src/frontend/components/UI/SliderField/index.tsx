import { ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import { Select, MenuItem, SelectChangeEvent, Slider } from '@mui/material'
import './index.css'

interface SliderFieldProps {
  htmlId: string
  value: number
  onChange?: (value: number) => void
  label?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  marks?: boolean
}

export default function SliderField({
  htmlId,
  value,
  onChange,
  label,
  disabled = false,
  min,
  max,
  step,
  marks
}: SliderFieldProps) {
  const { isRTL } = useContext(ContextProvider)

  return (
    <div
      tabIndex={-1}
      className={classnames(`sliderFieldWrapper Field`, {
        isRTL
      })}
    >
      {label && (
        <label tabIndex={-1} htmlFor={htmlId}>
          {label}
        </label>
      )}
      <Slider
        className="sliderStyle"
        id={htmlId}
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay="auto"
        onChange={(_event, value) => {
          if (!onChange) return

          onChange(Array.isArray(value) ? value[0] : value)
        }}
        disabled={disabled}
        sx={{
          '& .MuiSelect-icon': { display: 'none' },
          '& .MuiOutlinedInput-notchedOutline legend': { width: 0 },
          '& .MuiSelect-select': {
            textAlign: isRTL ? 'right' : 'left'
          }
        }}
      />
    </div>
  )
}
