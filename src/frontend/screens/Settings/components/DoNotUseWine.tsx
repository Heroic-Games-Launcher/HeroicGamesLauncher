import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'

const DoNotUseWine = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  const [doNotUseWine, setDoNotUseWine] = useSetting('doNotUseWine', false)

  if (isWindows || isDefault) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="doNotUseWineToggle"
      value={doNotUseWine || false}
      handleChange={() => setDoNotUseWine(!doNotUseWine)}
      title={t(
        'setting.doNotUseWine',
        'Do not use wine (Useful in combination with a native alternative exe)'
      )}
    />
  )
}

export default DoNotUseWine
