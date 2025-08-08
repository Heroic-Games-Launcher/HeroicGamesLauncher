import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const EnableNtsync = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [wineVersion] = useSetting('wineVersion')
  const [enableNtsync, setEnableNtsync] = useSetting('enableNtsync', false)

  if (wineVersion.type !== 'proton' || wineVersion.bin.includes('toolkit')) {
    return <></>
  }

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
    <ToggleSwitch
    htmlId="NtsyncToggle"
    value={enableNtsync || false}
    handleChange={() => setEnableNtsync(!enableNtsync)}
    title={t('setting.Ntsync', 'Enable Ntsync')}
    />

    <InfoIcon
    text={t(
      'help.Ntsync',
      'Ntsync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance on supported Linux kernels.'
    )}
    />
    </div>
  )
}

export default EnableNtsync
