import { useTranslation } from 'react-i18next'
import { Joystick, SlidersHorizontal } from 'lucide-react'
import { SettingsCard } from 'frontend/components/UI'
import {
  DisableController,
  GamePadDelayRepeat,
  GamepadButtonMapping,
  GamepadDeadzone
} from '../../components'

export default function GamepadSettings() {
  const { t } = useTranslation()

  return (
    <div className="settingsSections">
      <SettingsCard
        glyph={Joystick}
        title={t('settings.section.controller', 'Controller')}
        description={t(
          'settings.gamepad.description',
          'Navigation, repeat speed and how forgiving the sticks are'
        )}
      >
        <DisableController />
        <GamepadDeadzone />
        <GamePadDelayRepeat />
      </SettingsCard>

      <SettingsCard
        glyph={SlidersHorizontal}
        title={t('settings.gamepad.buttonMapping.title', 'Button mapping')}
        description={t(
          'settings.gamepad.buttonMapping.description',
          'Choose which physical button triggers each action'
        )}
      >
        <GamepadButtonMapping />
      </SettingsCard>
    </div>
  )
}
