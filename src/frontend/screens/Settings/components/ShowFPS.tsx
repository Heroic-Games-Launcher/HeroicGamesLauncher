import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'

const ShowFPS = () => {
  const { t } = useTranslation()
  const [showFps, setShowFps] = useSetting('showFps', false)
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
      description={t(
        'setting.showfps.description',
        'Draw a frame rate counter on top of the game'
      )}
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
