import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'

const MinimizeOnGameLaunch = () => {
  const { t } = useTranslation()
  const [
    minimizeOnLaunch,
    setMinimizeOnLaunch,
    ,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useGlobalConfig('minimizeOnGameLaunch')

  return (
    <ToggleSwitch
      htmlId="minimizeOnLaunch"
      value={minimizeOnLaunch}
      handleChange={async () => setMinimizeOnLaunch(!minimizeOnLaunch)}
      title={t(
        'setting.minimize-on-launch',
        'Minimize Heroic After Game Launch'
      )}
      isSetToDefaultValue={isSetToDefaultValue}
      resetToDefaultValue={resetToDefaultValue}
    />
  )
}

export default MinimizeOnGameLaunch
