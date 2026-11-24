import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'

const EnableWineWayland = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [enableWineWayland, setEnableWineWayland] = useSetting(
    'enableWineWayland',
    false
  )

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <ToggleSwitch
      description={t(
        'setting.wineWayland-description',
        'Run the game through the experimental Wine-Wayland driver'
      )}
      info={t(
        'help.wine-wayland',
        'The Wine-Wayland driver allows games to run natively under the Wayland display protocol. It is still experimental and may break some games. On GE-Proton and Proton-CachyOS this uses PROTON_ENABLE_WAYLAND; Valve Proton may ignore it.'
      )}
      htmlId="wineWaylandToggle"
      value={enableWineWayland || false}
      handleChange={() => setEnableWineWayland(!enableWineWayland)}
      title={t('setting.wineWayland', 'Force Wine-Wayland (experimental)')}
    />
  )
}

export default EnableWineWayland
