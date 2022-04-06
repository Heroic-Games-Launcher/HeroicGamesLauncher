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
  // TODO fixes errors in the console, but the props may not be necessary at all
  const checkmarkProps = {
    value,
    title,
    datatestid: dataTestId
  }
  return (
    <div className="switch" aria-label={title}>
      <input
        data-testid={dataTestId}
        disabled={disabled}
        checked={value}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
      />

      <span {...checkmarkProps} className="checkmark" />
    </div>
  )
}
