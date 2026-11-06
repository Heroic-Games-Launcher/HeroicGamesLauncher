import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const MinimizeOnGameLaunch = () => {
  const { t } = useTranslation()
  const [minimizeOnLaunch, setMinimizeOnLaunch] = useSetting(
    'minimizeOnLaunch',
    false
  )
  const [noTrayIcon] = useSetting('noTrayIcon', false)

  return (
    <ToggleSwitch
      description={t(
        'setting.minimizeOnLaunch.description',
        'Send Heroic to the background once a game starts'
      )}
      htmlId="minimizeOnLaunch"
      value={minimizeOnLaunch && !noTrayIcon}
      handleChange={() => setMinimizeOnLaunch(!minimizeOnLaunch)}
      title={t(
        'setting.minimize-on-launch',
        'Minimize Heroic After Game Launch'
      )}
      disabled={noTrayIcon}
    />
  )
}

export default MinimizeOnGameLaunch
