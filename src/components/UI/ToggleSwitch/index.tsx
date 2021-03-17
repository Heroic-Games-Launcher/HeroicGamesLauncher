import React from 'react'
import './index.css'

interface Props {
  handleChange: () => void
  value: boolean
  disabled?: boolean
}

export default function ToggleSwitch({ handleChange, value, disabled }: Props) {
  return (
    <label className="switch">
      <input
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
      />
      <span className="slider round" />
    </label>
  )
}
