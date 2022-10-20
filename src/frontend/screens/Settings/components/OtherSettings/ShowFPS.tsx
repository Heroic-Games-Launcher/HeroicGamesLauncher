import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import { LocationState } from 'frontend/types'

const ShowFPS = () => {
  const { t } = useTranslation()
  const [showFps, setShowFps] = useSetting<boolean>('showFps', false)
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const {
    state: { isLinuxNative, isMacNative }
  } = useLocation() as { state: LocationState }
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
