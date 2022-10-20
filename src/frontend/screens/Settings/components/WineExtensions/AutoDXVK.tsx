import React from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '../WineSettings'
import useSetting from 'frontend/hooks/useSetting'
import { configStore } from 'frontend/helpers/electronStores'
import { ToggleSwitch } from 'frontend/components/UI'

const AutoDXVK = () => {
  const { t } = useTranslation()
  const [autoInstallDxvk, setAutoInstallDxak] = useSetting(
    'autoInstallDxvk',
    false
  )
  const home = configStore.get('userHome', '')
  const [winePrefix] = useSetting('winePrefix', `${home}/.wine`)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const isProton = wineVersion.type === 'proton'

  if (isProton) {
    return <></>
  }

  const handleAutoInstallDxvk = () => {
    const action = autoInstallDxvk ? 'restore' : 'backup'
    window.api.toggleDXVK([{ winePrefix, winePath: wineVersion.bin }, action])
    return setAutoInstallDxak(!autoInstallDxvk)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="autodxvk"
        value={autoInstallDxvk}
        handleChange={handleAutoInstallDxvk}
        title={t('setting.autodxvk', 'Auto Install/Update DXVK on Prefix')}
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
