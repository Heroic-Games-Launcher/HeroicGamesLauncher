import React, { ChangeEventHandler } from 'react'
import './index.css'

interface Props {
  dataTestId?: string
  disabled?: boolean
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: boolean
  title: string
}

export default function ToggleSwitch(props: Props) {
  const {
    handleChange,
    value,
    disabled,
    title,
    dataTestId = 'toggleSwitch'
  } = props

  return (
    <label className={`setting toggleSwitchWrapper ${value ? 'checked' : ''}`}>
      <input
        id={dataTestId}
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
      />
      <span>{title}</span>
    </label>
  )
}
