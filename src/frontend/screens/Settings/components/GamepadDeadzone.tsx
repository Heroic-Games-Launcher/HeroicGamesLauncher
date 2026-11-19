import SliderField from 'frontend/components/UI/SliderField'
import { updateGamepadActions } from 'frontend/helpers/gamepad'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const GamepadDeadzone = () => {
  const { t } = useTranslation()
  const [deadzone, setDeadzone] = useSetting('gamepadDeadzone', 0.15)

  return (
    <SliderField
      htmlId="gamepadDeadzone"
      value={deadzone}
      step={0.05}
      min={0}
      max={0.35}
      onChange={(value) => {
        setDeadzone(value)
        updateGamepadActions()
      }}
      label={t('setting.gamepad-deadzone', 'Stick deadzone')}
      marks={[
        { value: 0, label: '0' },
        { value: 0.35, label: '0.35' }
      ]}
    />
  )
}

export default GamepadDeadzone
