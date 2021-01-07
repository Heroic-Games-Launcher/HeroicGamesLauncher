import React from 'react'

interface Props {
  handleChange: () => void
}

export default function ToggleSwitch({handleChange}: Props) {
  return (
    <label className="switch">
      <input type="checkbox" onChange={handleChange} />
      <span className="slider round" />
    </label>
    )
}
