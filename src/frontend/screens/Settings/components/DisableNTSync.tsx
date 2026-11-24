import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '../util'

const DisableNTSync = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [disableNTSync, setDisableNTSync] = useSetting('disableNTSync', false)
  const isProtonFork = /GE-Proton|Proton-CachyOS|EM-/i.test(wineVersion.name)

  if (platform !== 'linux' || wineVersion.type !== 'proton' || !isProtonFork) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="disableNTSync"
      value={disableNTSync}
      handleChange={() => setDisableNTSync(!disableNTSync)}
      title={t('setting.disableNTSync', 'Disable NTSync (troubleshooting)')}
      description={t(
        'setting.disableNTSync-description',
        'Fall back to fsync/wineserver when a game hangs or stutters with NTSync'
      )}
      info={t(
        'help.disableNTSync',
        'NTSync is enabled automatically on kernels 6.14 and newer. Disabling it is only useful for troubleshooting regressions in specific games.'
      )}
    />
  )
}

export default DisableNTSync
