import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const ShowFPS = () => {
  const { t } = useTranslation()
  const [showFps, setShowFps] = useSetting('showFps', false)
  const { platform } = useContext(ContextProvider)
  const { isMacNative, isLinuxNative } = useContext(SettingsContext)
  const isWin = platform === 'win32'
  const shouldRenderFpsOption = !isMacNative && !isWin && !isLinuxNative

  if (!shouldRenderFpsOption) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="showFPS"
      value={showFps}
      handleChange={() => setShowFps(!showFps)}
      title={t('setting.showfps')}
    />
  )
}

export default ShowFPS
