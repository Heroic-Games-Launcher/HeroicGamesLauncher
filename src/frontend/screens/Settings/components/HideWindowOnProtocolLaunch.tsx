import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const HideWindowOnProtocolLaunch = () => {
  const { t } = useTranslation()
  const [hideWindowOnProtocolLaunch, setHideWindowOnProtocolLaunch] =
    useSetting('hideWindowOnProtocolLaunch', false)

  return (
    <div className="toggleRow">
      <ToggleSwitch
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
      <InfoIcon
        text={t(
          'help.hide-window-on-protocol-launch',
          "Keeps the Heroic window hidden when a game is launched from an external shortcut, like the 'Add to Steam' feature."
        )}
      />
    </div>
  )
}

export default HideWindowOnProtocolLaunch
