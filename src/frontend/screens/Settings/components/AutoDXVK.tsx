import React from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import { join } from 'path'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const [autoInstallDxvk, setAutoInstallDxak] = useSetting(
    'autoInstallDxvk',
    false
  )

  const [defaultWinePrefix] = useSetting('defaultWinePrefix', '')
  const [winePrefix] = useSetting(
    'winePrefix',
    join(defaultWinePrefix, 'default')
  )
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [installingDxvk, setInstallingDxvk] = React.useState(false)

  if (wineVersion.type !== 'wine') {
    return <></>
  }

  const handleAutoInstallDxvk = async () => {
    const action = autoInstallDxvk ? 'restore' : 'backup'
    setInstallingDxvk(true)
    const res = await window.api.toggleDXVK({
      winePrefix,
      winePath: wineVersion.bin,
      action
    })

    setInstallingDxvk(false)
    if (res) {
      setAutoInstallDxak(!autoInstallDxvk)
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
        disabled={installingDxvk}
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
