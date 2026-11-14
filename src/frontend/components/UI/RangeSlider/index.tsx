import { ReactNode } from 'react'
import { Slider } from '@mui/material'
import './index.css'

interface RangeSliderProps {
  value: [number, number]
  onChange: (value: [number, number]) => void
  min: number
  max: number
  step?: number
  disabled?: boolean
  /** Current selection shown above the track (e.g. "BRL 0 – 215") */
  valueLabel?: ReactNode
  /** Captions under the track ends */
  minLabel?: ReactNode
  maxLabel?: ReactNode
  ariaLabel?: string
}

/**
 * Themed dual-handle range slider: the track and handles follow the accent
 * colour, the current selection is surfaced above the track and the bounds
 * sit underneath. Wraps MUI's Slider so screens don't restyle it each time.
 */
export default function RangeSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  valueLabel,
  minLabel,
  maxLabel,
  ariaLabel
}: RangeSliderProps) {
  return (
    <div className="rangeSlider">
      {valueLabel !== undefined && (
        <span className="rangeSlider__value">{valueLabel}</span>
      )}
      <Slider
        size="small"
        value={value}
        onChange={(_, next) => onChange(next as [number, number])}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        className="rangeSlider__slider"
      />
      {(minLabel !== undefined || maxLabel !== undefined) && (
        <div className="rangeSlider__bounds">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}
