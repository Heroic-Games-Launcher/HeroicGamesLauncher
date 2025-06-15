import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

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
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="wineWaylandToggle"
        value={enableWineWayland || false}
        handleChange={() => setEnableWineWayland(!enableWineWayland)}
        title={t('setting.wineWayland', 'Enable Wine-Wayland (Experimental)')}
      />

      <InfoIcon
        text={t(
          'help.wine-wayland',
          'The Wine-Wayland experimental driver allows games to run natively under the Wayland display protocol. Enabling might break some games.'
        )}
      />
    </div>
  )
}

export default EnableWineWayland
