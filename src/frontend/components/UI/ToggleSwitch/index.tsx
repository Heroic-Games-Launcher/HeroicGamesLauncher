import classNames from 'classnames'
import { ChangeEventHandler, ReactNode } from 'react'
import InfoTooltip from '../InfoTooltip'
import SettingRow from '../SettingRow'
import './index.css'

interface Props {
  htmlId: string
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: unknown
  title: string
  disabled?: boolean
  extraClass?: string
  description?: string
  info?: ReactNode
  fading?: boolean
}

export default function ToggleSwitch({
  handleChange,
  value,
  disabled,
  title,
  htmlId,
  extraClass,
  description,
  info,
  fading
}: Props) {
  const infoAsDescription = !description && info

  return (
    <SettingRow
      label={title}
      labelAfter={
        !infoAsDescription &&
        info && <InfoTooltip content={info} label={title} />
      }
      description={infoAsDescription ? info : description}
      htmlFor={htmlId}
      className={classNames('ToggleSwitch', extraClass, {
        'ToggleSwitch--disabled': disabled,
        fading
      })}
    >
      <input
        id={htmlId}
        disabled={disabled}
        checked={Boolean(value)}
        type="checkbox"
        onChange={handleChange}
        aria-label={title}
        className="ToggleSwitch__input hiddenCheckbox"
      />
      <label className="ToggleSwitch__track" htmlFor={htmlId}>
        <span className="ToggleSwitch__thumb" />
      </label>
    </SettingRow>
  )
}
