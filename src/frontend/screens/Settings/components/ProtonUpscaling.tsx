import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '../util'

const ProtonUpscaling = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [fsr4Upgrade, setFsr4Upgrade] = useSetting('fsr4Upgrade', false)
  const [dlssUpgrade, setDlssUpgrade] = useSetting('dlssUpgrade', false)
  const [useOptiScaler, setUseOptiScaler] = useSetting('useOptiScaler', false)
  const isProtonFork = /GE-Proton|Proton-CachyOS|EM-/i.test(wineVersion.name)

  if (platform !== 'linux' || wineVersion.type !== 'proton' || !isProtonFork) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="fsr4Upgrade"
        value={fsr4Upgrade}
        handleChange={() => setFsr4Upgrade(!fsr4Upgrade)}
        title={t('setting.fsr4Upgrade', 'Upgrade FSR 3.1 to FSR 4')}
        description={t(
          'setting.fsr4Upgrade-description',
          'Replace the game FSR 3.1 DLL with FSR 4 when supported'
        )}
        info={t(
          'help.fsr4Upgrade',
          'Requires GE-Proton, Proton-CachyOS or umu-protonfixes. Valve Proton may already ship the updated DLL.'
        )}
      />
      <ToggleSwitch
        htmlId="dlssUpgrade"
        value={dlssUpgrade}
        handleChange={() => setDlssUpgrade(!dlssUpgrade)}
        title={t('setting.dlssUpgrade', 'Upgrade DLSS / Streamline')}
        description={t(
          'setting.dlssUpgrade-description',
          'Use newer DLSS and Streamline DLLs, including multi-frame generation'
        )}
        info={t(
          'help.dlssUpgrade',
          'Requires GE-Proton or Proton-CachyOS and an NVIDIA RTX GPU. Valve Proton ignores these variables.'
        )}
      />
      <ToggleSwitch
        htmlId="useOptiScaler"
        value={useOptiScaler}
        handleChange={() => setUseOptiScaler(!useOptiScaler)}
        title={t('setting.useOptiScaler', 'Enable OptiScaler')}
        description={t(
          'setting.useOptiScaler-description',
          'Inject OptiScaler to remap DLSS, FSR and XeSS upscalers'
        )}
        info={t(
          'help.useOptiScaler',
          'Requires GE-Proton, Proton-CachyOS or umu-protonfixes. Useful on AMD GPUs to run FSR 4 in games that only expose DLSS.'
        )}
      />
    </>
  )
}

export default ProtonUpscaling
