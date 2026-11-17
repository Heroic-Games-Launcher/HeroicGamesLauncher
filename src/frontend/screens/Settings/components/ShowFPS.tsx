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
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'

  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <ToggleSwitch
      description={t(
        'setting.showfps-description',
        'Draw a frame rate counter on top of the game'
      )}
      htmlId="showFPS"
      value={showFps}
      handleChange={() => setShowFps(!showFps)}
      title={t('setting.showMetalOverlay', 'Show stats overlay')}
    />
  )
}

export default ShowFPS
