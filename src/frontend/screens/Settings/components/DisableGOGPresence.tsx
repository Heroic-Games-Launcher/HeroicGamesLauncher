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
      title={t('setting.disable_gog_presence', 'Disable GOG Presence updates')}
    />
  )
}

export default DisableGOGPresence
