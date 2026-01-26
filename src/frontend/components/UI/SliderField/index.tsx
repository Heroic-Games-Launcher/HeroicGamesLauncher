import { ReactNode, useContext, useEffect, useState } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import { Select, MenuItem, SelectChangeEvent, Slider } from '@mui/material'
import './index.css'
import { Mark } from '@mui/material/Slider/useSlider.types'

interface SliderFieldProps {
  htmlId: string
  value: number
  onChange?: (value: number) => void
  label?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  marks?: Mark[]
  showMinMaxMarks?: boolean
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
  marks,
  showMinMaxMarks
}: SliderFieldProps) {
  const { isRTL } = useContext(ContextProvider)

  const [sliderMarks, setSliderMarks] = useState<Mark[]>([])

  useEffect(() => {
    if (!marks && !showMinMaxMarks) return

    if (marks) {
      setSliderMarks(marks)
      return
    }

    if (showMinMaxMarks) {
      setSliderMarks([
        {
          value: min ?? 0,
          label: `${min ?? 0}`
        },
        {
          value: max ?? 0,
          label: `${max ?? 0}`
        }
      ])
    }
  }, [marks, showMinMaxMarks])

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
        marks={sliderMarks}
        valueLabelDisplay="auto"
        onChange={(_event, value) => {
          if (!onChange) return

          onChange(Array.isArray(value) ? value[0] : value)
        }}
        disabled={disabled}
      />
    </div>
  )
}
