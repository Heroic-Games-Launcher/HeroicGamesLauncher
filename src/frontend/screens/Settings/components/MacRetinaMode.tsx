import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MacRetinaMode = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [macRetinaMode, setMacRetinaMode] = useSetting('macRetinaMode', false)

  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="macRetinaModeToggle"
        value={macRetinaMode}
        handleChange={() => setMacRetinaMode(!macRetinaMode)}
        title={t('setting.macRetinaMode', 'Retina mode')}
      />

      <InfoIcon
        text={t(
          'help.macRetinaMode',
          'Lets the game render at the full pixel resolution of Retina displays instead of having macOS upscale it. The image is sharper, but the GPU has to render up to four times as many pixels.'
        )}
      />
    </div>
  )
}

export default MacRetinaMode
