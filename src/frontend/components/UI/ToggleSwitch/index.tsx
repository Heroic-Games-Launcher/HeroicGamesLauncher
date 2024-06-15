import classNames from 'classnames'
import React, { ChangeEventHandler } from 'react'
import './index.css'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

interface Props {
  htmlId: string
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: unknown
  title: string
  disabled?: boolean
  extraClass?: string
  description?: string
  fading?: boolean
}

export default function ToggleSwitch(props: Props) {
  const {
    handleChange,
    value,
    disabled,
    title,
    htmlId,
    extraClass,
    description = '',
    fading
  } = props
  const { isRTL } = useShallowGlobalState('isRTL')

  return (
    <>
      <input
        id={htmlId}
        disabled={disabled}
        checked={Boolean(value)}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
        className="hiddenCheckbox"
      />
      <label
        className={classNames(`toggleSwitchWrapper Field ${extraClass}`, {
          isRTL,
          fading
        })}
        htmlFor={htmlId}
        title={description}
      >
        {title}
      </label>
    </>
  )
}
