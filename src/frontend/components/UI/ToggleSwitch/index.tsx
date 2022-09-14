import classNames from 'classnames'
import React, { ChangeEventHandler, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'

interface Props {
  htmlId: string
  disabled?: boolean
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: boolean
  title: string
  extraClass?: string
}

export default function ToggleSwitch(props: Props) {
  const { handleChange, value, disabled, title, htmlId, extraClass } = props
  const { isRTL } = useContext(ContextProvider)

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
        className={classNames(`toggleSwitchWrapper Field ${extraClass}`, {
          isRTL
        })}
        htmlFor={htmlId}
      >
        {title}
      </label>
    </>
  )
}
