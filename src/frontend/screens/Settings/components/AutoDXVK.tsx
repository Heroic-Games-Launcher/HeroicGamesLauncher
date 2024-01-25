import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { ToggleSwitch } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { useSharedConfig } from 'frontend/hooks/config'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const [
    autoInstallDxvk,
    setAutoInstallDxvk,
    dxvkConfigFetched,
    dxvkConfigIsDefault,
    resetDxvkConfig
  ] = useSharedConfig('autoInstallDxvk')
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [autoInstallVkd3d, , vkd3dConfigFetched] =
    useSharedConfig('autoInstallVkd3d')
  const [wineVersion, , wineVersionConfigFetched] =
    useSharedConfig('wineVersion')
  const { appName, runner, isDefault } = useContext(SettingsContext)
  const [installingDxvk, setInstallingDxvk] = React.useState(false)

  if (!dxvkConfigFetched || !vkd3dConfigFetched || !wineVersionConfigFetched) {
    return <></>
  }

  if (wineVersion.type !== 'wine' || wineVersion.bin.includes('toolkit')) {
    return <></>
  }

  const handleAutoInstallDxvk = async () => {
    const action = autoInstallDxvk ? 'restore' : 'backup'
    setInstallingDxvk(true)
    let res = true
    if (!isDefault)
      res = await window.api.toggleDXVK({
        appName,
        runner,
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
        disabled={installingDxvk || (isLinux && autoInstallVkd3d)}
        isSetToDefaultValue={dxvkConfigIsDefault}
        resetToDefaultValue={resetDxvkConfig}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.dxvk',
          'DXVK is a Vulkan-based translational layer for DirectX 9, 10 and 11 games. Enabling may improve compatibility. Might cause issues especially for older DirectX games.'
        )}
      />
    </div>
  )
}

export default AutoDXVK
