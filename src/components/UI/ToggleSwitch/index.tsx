import './index.css'
import React from 'react'

interface Props {
  dataTestId?: string,
  disabled?: boolean,
  handleChange: () => void,
  value: boolean
}

export default function ToggleSwitch({ handleChange, value, disabled, dataTestId = 'toggleSwitch' }: Props) {
  return (
    <label className="switch">
      <input
        data-testid={dataTestId}
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
      />
      <span className="slider round" />
    </label>
  )
}
