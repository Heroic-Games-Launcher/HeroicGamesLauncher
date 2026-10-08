import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'

const EnableFsync = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [enableFsync, setEnableFsync] = useSetting('enableFsync', false)

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <ToggleSwitch
      info={t(
        'help.fsync',
        'Fsync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance on supported Linux kernels.'
      )}
      description={t(
        'setting.fsync.description',
        'Speed up multi-threaded games using futex synchronisation'
      )}
      htmlId="fsyncToggle"
      value={enableFsync || false}
      handleChange={() => setEnableFsync(!enableFsync)}
      title={t('setting.fsync', 'Enable Fsync')}
    />
  )
}

export default EnableFsync
