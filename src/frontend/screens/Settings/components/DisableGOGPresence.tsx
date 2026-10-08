import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'

const DisableGOGPresence = () => {
  const { t } = useTranslation()
  const [disableGOGPresence, setDisableGOGPresence] = useSetting(
    'disableGOGPresence',
    false
  )

  return (
    <ToggleSwitch
      htmlId="disableGOGPresence"
      value={disableGOGPresence}
      handleChange={() => setDisableGOGPresence(!disableGOGPresence)}
      description={t(
        'setting.disable-gog-presence.description',
        'Stop sharing which GOG game you are playing with your friends'
      )}
      title={t('setting.disable_gog_presence', 'Disable GOG Presence updates')}
    />
  )
}

export default DisableGOGPresence
