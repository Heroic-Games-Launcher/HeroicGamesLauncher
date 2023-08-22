import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

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
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disablePlaytimeSync"
        value={disablePlaytimeSync}
        handleChange={() => setDisablePlaytimeSync(!disablePlaytimeSync)}
        title={t(
          'setting.disablePlaytimeSync',
          'Disable playtime synchronization'
        )}
      />
      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.disablePlaytimeSync',
          "Disables playtime synchronization with given store's servers (currently only GOG is supported)"
        )}
      />
    </div>
  )
}

export default PlaytimeSync
