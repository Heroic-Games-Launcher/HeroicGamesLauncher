import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const PlaytimeSync = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const [disablePlaytimeSync, setDisablePlaytimeSync] = useSetting(
    'disablePlaytimeSync',
    false
  )

  if (!isDefault) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="disablePlaytimeSync"
      value={disablePlaytimeSync}
      handleChange={() => setDisablePlaytimeSync(!disablePlaytimeSync)}
      title={t(
        'setting.disablePlaytimeSync',
        'Disable Playtime Synchronization'
      )}
    />
  )
}

export default PlaytimeSync
