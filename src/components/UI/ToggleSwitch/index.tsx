import React, { ChangeEventHandler } from 'react'
import './index.css'

interface Props {
  htmlId: string
  disabled?: boolean
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: boolean
  title: string
}

export default function ToggleSwitch(props: Props) {
  const { handleChange, value, disabled, title, htmlId } = props

  return (
    <>
      <input
        id={htmlId}
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
        className="hiddenCheckbox"
      />
      <label
        className={`setting toggleSwitchWrapper ${value ? 'checked' : ''}`}
        htmlFor={htmlId}
      >
        {title}
      </label>
    </>
  )
}
