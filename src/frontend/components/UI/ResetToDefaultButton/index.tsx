import React from 'react'
import { useTranslation } from 'react-i18next'
import IconButton from '@mui/material/IconButton'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'

interface Props {
  isSetToDefault?: boolean
  resetToDefault?: () => void
}

function ResetToDefaultButton({ isSetToDefault, resetToDefault }: Props) {
  const { t } = useTranslation()

  if (!resetToDefault || isSetToDefault) return <></>

  return (
    <IconButton
      color={'primary'}
      onClick={resetToDefault}
      title={t('button.reset-to-default', 'Reset to default')}
    >
      <SettingsBackupRestoreIcon />
    </IconButton>
  )
}

export default React.memo(ResetToDefaultButton)
