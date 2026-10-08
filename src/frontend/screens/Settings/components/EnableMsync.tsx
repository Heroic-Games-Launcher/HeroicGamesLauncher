import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import { defaultWineVersion } from '../util'

const EnableMsync = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [enableMsync, setEnableMsync] = useSetting('enableMsync', false)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  if (!isMac || isMacNative || wineVersion.name.endsWith('-DXMT')) {
    return <></>
  }

  return (
    <ToggleSwitch
      info={t(
        'help.msync',
        'Msync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance on supported Linux kernels.'
      )}
      description={t(
        'setting.msync.description',
        'Speed up multi-threaded games using macOS synchronisation primitives'
      )}
      htmlId="msyncToggle"
      value={enableMsync || false}
      handleChange={() => setEnableMsync(!enableMsync)}
      title={t('setting.msync', 'Enable Msync')}
    />
  )
}

export default EnableMsync
