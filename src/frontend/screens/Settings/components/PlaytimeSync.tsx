import { useContext } from 'react'
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
      info={t(
        'help.disablePlaytimeSync',
        "Disables playtime synchronization with given store's servers (currently only GOG is supported)"
      )}
      description={t(
        'setting.playtimeSync.description',
        'Keep your recorded playtime in sync with the store'
      )}
      htmlId="disablePlaytimeSync"
      value={disablePlaytimeSync}
      handleChange={() => setDisablePlaytimeSync(!disablePlaytimeSync)}
      title={t(
        'setting.disablePlaytimeSync',
        'Disable playtime synchronization'
      )}
    />
  )
}

export default PlaytimeSync
