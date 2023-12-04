import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'
import SettingsContext from '../SettingsContext'

const AutoVKD3D = () => {
  const { t } = useTranslation()
  const [autoInstallVkd3d, setAutoInstallVkd3d] = useSetting(
    'autoInstallVkd3d',
    false
  )
  const { appName } = useContext(SettingsContext)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [autoInstallDxvk] = useSetting('autoInstallDxvk', false)
  const [installingVKD3D, setInstallingVKD3D] = React.useState(false)

  const isProton = wineVersion.type === 'proton'

  if (isProton) {
    return <></>
  }

  const handleAutoInstallVkd3d = async () => {
    const action = autoInstallVkd3d ? 'restore' : 'backup'
    setInstallingVKD3D(true)
    const res = await window.api.toggleVKD3D({
      appName,
      action
    })

    setInstallingVKD3D(false)
    if (res) {
      setAutoInstallVkd3d(!autoInstallVkd3d)
    }
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autovkd3d"
        value={autoInstallVkd3d}
        handleChange={handleAutoInstallVkd3d}
        title={
          installingVKD3D
            ? t('please-wait', 'Please wait...')
            : t('setting.autovkd3d', 'Auto Install/Update VKD3D on Prefix')
        }
        fading={installingVKD3D}
        disabled={!autoInstallDxvk || installingVKD3D}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.vkd3d',
          'VKD3D is a Vulkan-based translational layer for DirectX 12 games. Enabling may improve compatibility significantly. Has no effect on older DirectX games, it requires DXVK.'
        )}
      />
    </div>
  )
}

export default AutoVKD3D
