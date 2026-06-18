import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const DisableHidraw = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative, isMacNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'

  // Only show on Linux and Mac (not for native games)
  if ((isLinux && isLinuxNative) || (isMac && isMacNative)) {
    return <></>
  }

  const [disableHidraw, setDisableHidraw] = useSetting('disableHidraw', false)

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="disableHidrawToggle"
        value={disableHidraw || false}
        handleChange={() => setDisableHidraw(!disableHidraw)}
        title={t(
          'setting.disableHidraw',
          'Use SDL for controllers (Disable hidraw)'
        )}
      />

      <InfoIcon
        text={t(
          'help.disableHidraw',
          'Disables hidraw and enables SDL for PlayStation 4/5 controllers. This makes controllers work as XInput devices and can help with controller detection in games that expect Xbox 360 controllers.'
        )}
      />
    </div>
  )
}

export default DisableHidraw
