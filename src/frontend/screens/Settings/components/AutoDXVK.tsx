import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { defaultWineVersion } from '..'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const [autoInstallDxvk, setAutoInstallDxvk] = useSetting(
    'autoInstallDxvk',
    false
  )
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [autoInstallVkd3d] = useSetting('autoInstallVkd3d', false)
  const [autoInstallDxvkNvapi] = useSetting('autoInstallDxvkNvapi', false)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const { appName } = useContext(SettingsContext)
  const [installingDxvk, setInstallingDxvk] = React.useState(false)

  if (wineVersion.type !== 'wine' || wineVersion.bin.includes('toolkit')) {
    return <></>
  }

  const handleAutoInstallDxvk = async () => {
    const action = autoInstallDxvk ? 'restore' : 'backup'
    setInstallingDxvk(true)
    const res = await window.api.toggleDXVK({
      appName,
      action
    })

    setInstallingDxvk(false)
    if (res) {
      setAutoInstallDxvk(!autoInstallDxvk)
    }
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvk"
        value={autoInstallDxvk}
        handleChange={handleAutoInstallDxvk}
        title={
          installingDxvk
            ? t('please-wait', 'Please wait...')
            : t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')
        }
        fading={installingDxvk}
        disabled={
          installingDxvk ||
          (isLinux && (autoInstallDxvkNvapi || autoInstallVkd3d))
        }
      />

      <InfoIcon
        text={t(
          'help.dxvk',
          'DXVK is a Vulkan-based translational layer for DirectX 9, 10 and 11 games. Enabling may improve compatibility. Might cause issues especially for older DirectX games.'
        )}
      />
    </div>
  )
}

export default AutoDXVK
