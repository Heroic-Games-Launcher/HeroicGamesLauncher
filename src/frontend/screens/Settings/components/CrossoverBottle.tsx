import React from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import { IconButton } from '@mui/material'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'

export default function CrossoverBottle() {
  const { t } = useTranslation()
  const [
    crossoverBottle,
    setCrossoverBottle,
    crossoverBottleConfigFetched,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useSharedConfig('crossoverBottle')
  const [wineVersion, , wineVersionConfigFetched] =
    useSharedConfig('wineVersion')

  if (
    !crossoverBottleConfigFetched ||
    !wineVersionConfigFetched ||
    wineVersion.type !== 'crossover'
  ) {
    return <></>
  }

  let resetButton = <></>
  if (!isSetToDefaultValue) {
    resetButton = (
      <IconButton
        color={'primary'}
        onClick={resetToDefaultValue}
        title={t('button.reset-to-default', 'Reset to default')}
      >
        <SettingsBackupRestoreIcon />
      </IconButton>
    )
  }

  return (
    <TextInputField
      label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
      htmlId="crossoverBottle"
      value={crossoverBottle}
      onChange={async (event) => setCrossoverBottle(event.target.value)}
      inlineElement={resetButton}
    />
  )
}
