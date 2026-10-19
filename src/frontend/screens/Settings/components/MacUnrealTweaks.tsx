import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MacUnrealTweaks = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [macUnrealTweaks, setMacUnrealTweaks] = useSetting(
    'macUnrealTweaks',
    false
  )

  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="macUnrealTweaksToggle"
        value={macUnrealTweaks}
        handleChange={() => setMacUnrealTweaks(!macUnrealTweaks)}
        title={t('setting.macUnrealTweaks', 'Unreal Engine image tweaks')}
      />

      <InfoIcon
        text={t(
          'help.macUnrealTweaks',
          "For supported Unreal Engine games (currently Senua's Saga: Hellblade II), removes the letterbox bars, lens softness, chromatic aberration, lens distortion and film grain through the game's Engine.ini. Turning this off removes the changes again."
        )}
      />
    </div>
  )
}

export default MacUnrealTweaks
