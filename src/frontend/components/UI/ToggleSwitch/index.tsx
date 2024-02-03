import classNames from 'classnames'
import React, { ChangeEventHandler, ReactNode, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import { Stack } from '@mui/material'

interface Props {
  htmlId: string
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: unknown
  title: string
  disabled?: boolean
  extraClass?: string
  description?: string
  fading?: boolean
  inlineElement?: ReactNode
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
    fading,
    inlineElement
  } = props
  const { isRTL } = useContext(ContextProvider)

  return (
    <Stack direction={'row'}>
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
      {inlineElement}
    </Stack>
  )
}
