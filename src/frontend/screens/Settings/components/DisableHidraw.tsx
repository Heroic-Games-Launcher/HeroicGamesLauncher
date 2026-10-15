import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const DisableHidraw = () => {
  const { t } = useTranslation()

  const [disableHidraw, setDisableHidraw] = useSetting('disableHidraw', false)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableHidrawToggle"
        value={disableHidraw || false}
        handleChange={() => setDisableHidraw(!disableHidraw)}
        title={t(
          'setting.disableHidraw',
          'Use SDL for gamepads (Disable hidraw)'
        )}
      />

      <InfoIcon
        text={t(
          'help.disableHidraw',
          'This can help with detection in games as it makes them work as XInput devices (like on Xbox 360). Disables hidraw and enables SDL, as often required for PlayStation 4/5 gamepads.'
        )}
      />
    </div>
  )
}

export default DisableHidraw
