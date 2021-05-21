import './index.css'
import React from 'react'

interface Props {
  disabled?: boolean
  handleChange: () => void
  value: boolean
}

export default function ToggleSwitch({ handleChange, value, disabled }: Props) {
  return (
    <label className="switch">
      <input
        data-testid="toggleswitch"
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
      />
      <span className="slider round" />
    </label>
  )
}
