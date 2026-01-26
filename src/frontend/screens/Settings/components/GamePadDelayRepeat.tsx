import { Slider } from '@mui/material'
import SliderField from 'frontend/components/UI/SliderField'
import { updateGamepadActions } from 'frontend/helpers/gamepad'
import useSetting from 'frontend/hooks/useSetting'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const GamePadDelayRepeat = () => {
  const { t } = useTranslation()
  const [activationDelay, setActivationDelay] = useSetting(
    'gamepadInitialRepeatDelay',
    250
  )
  const [repeatDelay, setRepeatDelay] = useSetting('gamepadRepeatDelay', 50)

  return (
    <div
      tabIndex={-1}
      style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}
    >
      <SliderField
        htmlId="gamePadDelayRepeat"
        value={activationDelay}
        step={10}
        min={10}
        max={500}
        onChange={(value) => {
          setActivationDelay(value)
          updateGamepadActions()
        }}
        label={t(
          'setting.gamepad-initial-repeat-delay',
          'Gamepad input initial repeat delay'
        )}
      />

      <SliderField
        htmlId="gamePadRepeatRate"
        value={repeatDelay}
        step={5}
        min={5}
        max={100}
        onChange={(value) => {
          setRepeatDelay(value)
          updateGamepadActions()
        }}
        label={t(
          'setting.gamepad-repeat-frequency',
          'Gamepad input repeat frequency'
        )}
      />
    </div>
  )
}

export default GamePadDelayRepeat
