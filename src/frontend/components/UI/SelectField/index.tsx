import React, { ChangeEvent, ReactNode, useContext } from 'react'
import classnames from 'classnames'
import ContextProvider from 'frontend/state/ContextProvider'
import './index.css'
import { Stack, IconButton } from '@mui/material'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'
import { useTranslation } from 'react-i18next'

interface SelectFieldProps {
  htmlId: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  afterSelect?: ReactNode
  label?: string
  prompt?: string
  disabled?: boolean
  extraClass?: string
  resetToDefaultValue?: () => void
  isSetToDefaultValue?: boolean
}

const SelectField = ({
  htmlId,
  value,
  onChange,
  label,
  prompt,
  disabled = false,
  extraClass = '',
  afterSelect,
  children,
  resetToDefaultValue,
  isSetToDefaultValue
}: SelectFieldProps) => {
  const { isRTL } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <div
      className={classnames(`selectFieldWrapper Field ${extraClass}`, {
        isRTL
      })}
    >
      {label && <label htmlFor={htmlId}>{label}</label>}
      <Stack direction="row">
        <select
          id={htmlId}
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {prompt && <option value="">{prompt}</option>}
          {children}
        </select>
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
      {afterSelect}
    </div>
  )
}

export default React.memo(SelectField)
