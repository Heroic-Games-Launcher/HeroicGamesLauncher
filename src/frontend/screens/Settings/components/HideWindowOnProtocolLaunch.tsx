import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const HideWindowOnProtocolLaunch = () => {
  const { t } = useTranslation()
  const [hideWindowOnProtocolLaunch, setHideWindowOnProtocolLaunch] =
    useSetting('hideWindowOnProtocolLaunch', false)

  return (
    <ToggleSwitch
      info={t(
        'help.hide-window-on-protocol-launch',
        "Keeps the Heroic window hidden when a game is launched from an external shortcut, like the 'Add to Steam' feature."
      )}
      htmlId="hideWindowOnProtocolLaunch"
      value={hideWindowOnProtocolLaunch}
      handleChange={() =>
        setHideWindowOnProtocolLaunch(!hideWindowOnProtocolLaunch)
      }
      title={t(
        'setting.hide-window-on-protocol-launch',
        'Hide Heroic window when launching games from heroic:// links'
      )}
    />
  )
}

export default HideWindowOnProtocolLaunch
