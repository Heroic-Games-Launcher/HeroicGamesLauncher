import React, { useContext } from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { useSharedConfig } from 'frontend/hooks/config'

const AutoDXVKNVAPI = () => {
  const { t } = useTranslation()
  const [autoInstallDXVKNVAPI, setAutoInstallDXVKNVAPI] = useSharedConfig(
    'autoInstallDxvkNvapi'
  )
  const { appName, runner } = useContext(SettingsContext)
  const [wineVersion, , wineVersionFetched] = useSharedConfig('wineVersion')
  const [installingDxvkNvapi, setInstallingDxvkNvapi] = React.useState(false)

  if (!wineVersionFetched) return <></>

  const handleAutoInstallDxvkNvapi = async () => {
    let res = true
    const isProton = wineVersion.type === 'proton'
    setInstallingDxvkNvapi(true)

    if (!isProton) {
      const action = autoInstallDXVKNVAPI ? 'restore' : 'backup'
      res = await window.api.toggleDXVKNVAPI({
        appName,
        runner,
        action
      })
    }

    setInstallingDxvkNvapi(false)
    if (res) {
      setAutoInstallDXVKNVAPI(!autoInstallDXVKNVAPI)
    }
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvknvapi"
        value={autoInstallDXVKNVAPI}
        handleChange={handleAutoInstallDxvkNvapi}
        title={
          installingDxvkNvapi
            ? t('please-wait', 'Please wait...')
            : t(
                'setting.autodxvknvapi',
                'Auto Install/Update DXVK-NVAPI on Prefix'
              )
        }
        fading={installingDxvkNvapi}
        disabled={installingDxvkNvapi}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.dxvknvapi',
          'DXVK-NVAPI is an implementation of NVAPI built on top of DXVK and the linux native NVAPI, it allows for the usage of DLSS on Nvidia GPUs.'
        )}
      />
    </div>
  )
}

export default AutoDXVKNVAPI
