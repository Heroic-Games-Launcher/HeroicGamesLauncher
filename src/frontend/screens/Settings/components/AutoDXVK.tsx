import React, { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import SettingsContext from '../SettingsContext'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const { appName, runner } = useContext(SettingsContext)
  const [autoInstallDxvk, setAutoInstallDxvk] = useSetting(
    'autoInstallDxvk',
    false
  )
  const [modifyingDxvk, setModifyingDxvk] = useState(false)

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  if (wineVersion.type !== 'wine') {
    return <></>
  }

  const handleAutoInstallDxvk = async () => {
    setModifyingDxvk(true)
    // If we don't have a valid prefix yet, we don't want to try to modify DXVK
    const validPrefix = await window.api.hasValidPrefix(appName, runner)
    if (!validPrefix) {
      setAutoInstallDxvk(!autoInstallDxvk)
      setModifyingDxvk(false)
      return
    }

    const isInstalled = await window.api.isWorkaroundInstalled(
      'dxvk',
      appName,
      runner
    )
    let success
    // If the user has disabled auto-installation, remove it
    if (autoInstallDxvk) {
      success = await window.api.removeWorkaround('dxvk', appName, runner)
      // If the user has enabled auto-installation, install or update DXVK
    } else {
      if (isInstalled) {
        success = await window.api.updateWorkaround('dxvk', appName, runner)
      } else {
        success = await window.api.installWorkaround('dxvk', appName, runner)
      }
    }
    if (success) {
      setAutoInstallDxvk(!autoInstallDxvk)
    }
    setModifyingDxvk(false)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvk"
        value={autoInstallDxvk}
        handleChange={handleAutoInstallDxvk}
        title={
          modifyingDxvk
            ? t('please-wait', 'Please wait...')
            : t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')
        }
        fading={modifyingDxvk}
        disabled={modifyingDxvk}
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
