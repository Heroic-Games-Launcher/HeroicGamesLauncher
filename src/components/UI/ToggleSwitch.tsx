import React from 'react'

interface Props {
  handleChange: () => void
  value: boolean
}

export default function ToggleSwitch({handleChange, value}: Props) {
  return (
    <label className="switch">
      <input checked={value} type="checkbox" onChange={handleChange} />
      <span className="slider round" />
    </label>
    )
}
