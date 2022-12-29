import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'
import SettingsContext from '../SettingsContext'

const AutoVKD3D = () => {
  const { t } = useTranslation()
  const { appName, runner } = useContext(SettingsContext)
  const [autoInstallVkd3d, setAutoInstallVkd3d] = useSetting(
    'autoInstallVkd3d',
    false
  )
  const [modifyingVkd3d, setModifyingVkd3d] = useState(false)

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const isProton = wineVersion.type === 'proton'
  if (isProton) {
    return <></>
  }

  const handleAutoInstallVkd3d = async () => {
    setModifyingVkd3d(true)
    const validPrefix = await window.api.hasValidPrefix(appName, runner)
    if (!validPrefix) {
      setAutoInstallVkd3d(!autoInstallVkd3d)
      setModifyingVkd3d(false)
      return
    }

    const isInstalled = await window.api.isWorkaroundInstalled(
      'vkd3d',
      appName,
      runner
    )
    let success
    if (autoInstallVkd3d) {
      success = await window.api.removeWorkaround('vkd3d', appName, runner)
    } else {
      if (isInstalled) {
        success = await window.api.updateWorkaround('vkd3d', appName, runner)
      } else {
        success = await window.api.installWorkaround('vkd3d', appName, runner)
      }
    }
    if (success) {
      setAutoInstallVkd3d(!autoInstallVkd3d)
    }
    setModifyingVkd3d(false)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autovkd3d"
        value={autoInstallVkd3d}
        handleChange={handleAutoInstallVkd3d}
        title={
          modifyingVkd3d
            ? t('please-wait', 'Please wait...')
            : t('setting.autovkd3d', 'Auto Install/Update VKD3D on Prefix')
        }
        fading={modifyingVkd3d}
        disabled={modifyingVkd3d}
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
