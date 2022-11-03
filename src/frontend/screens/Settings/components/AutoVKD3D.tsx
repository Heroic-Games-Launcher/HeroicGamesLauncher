import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { configStore } from 'frontend/helpers/electronStores'
import { defaultWineVersion } from '..'

const AutoVKD3D = () => {
  const { t } = useTranslation()
  const [autoInstallVkd3d, setAutoInstallVkd3d] = useSetting(
    'autoInstallVkd3d',
    false
  )
  const home = configStore.get('userHome', '')
  const [winePrefix] = useSetting('winePrefix', `${home}/.wine`)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const isProton = wineVersion.type === 'proton'

  if (isProton) {
    return <></>
  }

  const handleAutoInstallVkd3d = () => {
    const action = autoInstallVkd3d ? 'restore' : 'backup'
    window.api.toggleVKD3D([{ winePrefix, winePath: wineVersion.bin }, action])
    return setAutoInstallVkd3d(!autoInstallVkd3d)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autovkd3d"
        value={autoInstallVkd3d}
        handleChange={handleAutoInstallVkd3d}
        title={t('setting.autovkd3d', 'Auto Install/Update VKD3D on Prefix')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.vkd3d',
          'VKD3D is a Vulkan-based translational layer for DirectX 12 games. Enabling may improve compatibility significantly. Has no effect on older DirectX games.'
        )}
      />
    </div>
  )
}

export default AutoVKD3D
