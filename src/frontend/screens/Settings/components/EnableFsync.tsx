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
        'Fsync is only used as a fallback when NTSync is unavailable, for example on kernels older than 6.14 or when /dev/ntsync is not available.'
      )}
      description={t(
        'setting.fsync-description',
        'Use fsync only when NTSync is unavailable'
      )}
      htmlId="fsyncToggle"
      value={enableFsync || false}
      handleChange={() => setEnableFsync(!enableFsync)}
      title={t('setting.fsync', 'Fsync fallback')}
    />
  )
}

export default EnableFsync
