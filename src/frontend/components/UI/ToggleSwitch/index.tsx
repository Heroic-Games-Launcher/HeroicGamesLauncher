import classNames from 'classnames'
import React, { ChangeEventHandler, useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'
import { Stack, IconButton } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface Props {
  htmlId: string
  handleChange: ChangeEventHandler<HTMLInputElement>
  value: unknown
  title: string
  disabled?: boolean
  extraClass?: string
  description?: string
  fading?: boolean
  resetToDefaultValue?: () => void
  isSetToDefaultValue?: boolean
}

export default function ToggleSwitch(props: Props) {
  const { t } = useTranslation()
  const {
    handleChange,
    value,
    disabled,
    title,
    htmlId,
    extraClass,
    description = '',
    fading,
    resetToDefaultValue,
    isSetToDefaultValue
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
      {resetToDefaultValue && !isSetToDefaultValue && (
        <IconButton
          color={'primary'}
          onClick={resetToDefaultValue}
          title={t('button.reset-to-default', 'Reset to default')}
        >
          <SettingsBackupRestoreIcon />
        </IconButton>
      )}
    </Stack>
  )
}
