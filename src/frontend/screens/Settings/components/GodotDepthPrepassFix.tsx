import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const GodotDepthPrepassFix = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [godotDepthPrepassFix, setGodotDepthPrepassFix] = useSetting(
    'godotDepthPrepassFix',
    false
  )

  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="godotDepthPrepassFixToggle"
        value={godotDepthPrepassFix || false}
        handleChange={() => setGodotDepthPrepassFix(!godotDepthPrepassFix)}
        title={t('setting.godotDepthPrepassFix', 'Enable Godot depth pre-pass fix')}
      />

      <InfoIcon
        text={t(
          'help.godotDepthPrepassFix',
          'Force Godot depth pre-pass to be enabled. If your game is written in Godot and is having trouble loading sprites/imgs.'
        )}
      />
    </div>
  )
}

export default GodotDepthPrepassFix
