import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const DoNotUseWine = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'
  const isLinux = platform === 'linux'

  const [doNotUseWine, setDoNotUseWine] = useSetting('doNotUseWine', false)

  if (isWindows || isDefault) {
    return <></>
  }

  const label = isLinux
    ? t('setting.doNotUseWine.labelLinux', 'Do not use Wine/Proton')
    : t(
        'setting.doNotUseWine.labelMac',
        'Do not use Wine/Crossover/Game Porting Toolkit'
      )

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="doNotUseWineToggle"
        value={doNotUseWine || false}
        handleChange={() => setDoNotUseWine(!doNotUseWine)}
        title={label}
      />
      <InfoIcon
        text={t(
          'setting.doNotUseWine.info',
          'This is useful for alternative native executable. This is NOT meant to be used for DosBOX games.'
        )}
      />
    </div>
  )
}

export default DoNotUseWine
