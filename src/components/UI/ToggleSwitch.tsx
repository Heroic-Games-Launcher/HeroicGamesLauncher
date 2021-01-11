import React from 'react'

interface Props {
  handleChange: () => void
  value: boolean
  description: string
}

export default function ToggleSwitch({handleChange, value, description}: Props) {

  // random number so the for can work correctly each time a new switch is generated
  let forCount = Math.floor((Math.random() * 9999) + 1).toString();

  return (
      <label className="checkbox" htmlFor={forCount}>
        {description}
        <input checked={value} name={forCount} id={forCount} type="checkbox" onChange={handleChange} />
        <span className="checkbox-switch"></span>
      </label>
    )
}
