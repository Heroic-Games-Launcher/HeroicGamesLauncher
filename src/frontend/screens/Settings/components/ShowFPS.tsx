import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const ShowFPS = () => {
  const { t } = useTranslation()
  const [showFps, setShowFps] = useSetting('showFps', false)
  const { isLinuxNative } = useContext(SettingsContext)
  const shouldRenderFpsOption = !isWindows || (isLinux && !isLinuxNative)

  if (!shouldRenderFpsOption) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="showFPS"
      value={showFps}
      handleChange={() => setShowFps(!showFps)}
      title={
        isLinux
          ? t('setting.showfps')
          : t('setting.showMetalOverlay', 'Show Stats Overlay')
      }
    />
  )
}

export default ShowFPS
