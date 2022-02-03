import './index.css'
import React from 'react'

interface Props {
  dataTestId?: string
  disabled?: boolean
  handleChange: () => void
  value: boolean
  title: string
}

export default function ToggleSwitch({
  handleChange,
  value,
  disabled,
  title,
  dataTestId = 'toggleSwitch'
}: Props) {
  return (
    <label className="switch" aria-label={title}>
      <input
        data-testid={dataTestId}
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
      />

      <span className="checkmark" />
    </label>
  )
}
