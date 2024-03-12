import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { useSharedConfig } from 'frontend/hooks/config'
import SettingsContext from '../SettingsContext'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const ShowFPS = () => {
  const { t } = useTranslation()
  const [showFps, setShowFps, , isSetToDefaultValue, resetToDefaultValue] =
    useSharedConfig('showFps')
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isWin = platform === 'win32'
  const isLinux = platform === 'linux'
  const shouldRenderFpsOption = !isWin || (isLinux && !isLinuxNative)

  if (!shouldRenderFpsOption) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="showFPS"
      value={showFps}
      handleChange={async () => setShowFps(!showFps)}
      title={
        isLinux
          ? t('setting.showfps')
          : t('setting.showMetalOverlay', 'Show Stats Overlay')
      }
      inlineElement={
        <ResetToDefaultButton
          resetToDefault={resetToDefaultValue}
          isSetToDefault={isSetToDefaultValue}
        />
      }
    />
  )
}

export default ShowFPS
