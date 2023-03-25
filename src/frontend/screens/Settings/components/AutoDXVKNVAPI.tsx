import React, { useContext } from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'
import { defaultWineVersion } from '..'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const AutoDXVKNVAPI = () => {
  const { t } = useTranslation()
  const [autoInstallDXVKNVAPI, setAutoInstallDXVKNVAPI] = useSetting(
    'autoInstallDxvkNvapi',
    false
  )
  const { appName } = useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const handleAutoInstallDxvkNvapi = () => {
    const isProton = wineVersion.type === 'proton'
    if (!isProton) {
      const action = autoInstallDXVKNVAPI ? 'restore' : 'backup'
      window.api.toggleDXVKNVAPI({
        appName,
        action
      })
    }
    return setAutoInstallDXVKNVAPI(!autoInstallDXVKNVAPI)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvknvapi"
        value={autoInstallDXVKNVAPI}
        handleChange={handleAutoInstallDxvkNvapi}
        title={t(
          'setting.autodxvknvapi',
          'Auto Install/Update DXVK-NVAPI on Prefix'
        )}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.dxvknvapi',
          'DXVK-NVAPI is an implementation of NVAPI built on top of DXVK and the linux native NVAPI, it is allows for the usage of DLSS on Nvidia GPUs.'
        )}
      />
    </div>
  )
}

export default AutoDXVKNVAPI
