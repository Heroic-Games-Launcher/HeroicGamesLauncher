import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import ContextProvider from 'frontend/state/ContextProvider'
import { defaultWineVersion } from '..'

const DisableUMU = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)
  const { platform } = useContext(ContextProvider)

  const [disableUMU, setDisableUMU] = useSetting('disableUMU', false)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  if (isDefault || platform !== 'linux' || wineVersion.type !== 'proton') {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="disableUMU"
      value={disableUMU}
      handleChange={() => setDisableUMU(!disableUMU)}
      title={t('setting.disableUMU', 'Disable UMU')}
    />
  )
}

export default DisableUMU
