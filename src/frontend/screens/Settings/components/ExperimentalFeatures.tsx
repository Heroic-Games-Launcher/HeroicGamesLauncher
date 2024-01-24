import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useGlobalConfig } from 'frontend/hooks/config'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import type { GlobalConfig } from 'backend/config/schemas'

interface FeatureToggleProps {
  feature: keyof GlobalConfig
}
function FeatureToggle({ feature }: FeatureToggleProps) {
  const { t } = useTranslation()
  const [value, setValue, valueFetched] = useGlobalConfig(feature)

  if (!valueFetched) return <></>

  return (
    <ToggleSwitch
      htmlId={feature}
      value={value}
      handleChange={async () => setValue(!value)}
      title={t(`setting.experimental_features.${feature}`, feature)}
    />
  )
}

const ExperimentalFeatures = () => {
  const { platform } = useContext(ContextProvider)

  const FEATURES: (keyof GlobalConfig)[] = ['enableNewDesign', 'enableHelp']

  if (platform !== 'win32') {
    FEATURES.push('automaticWinetricksFixes')
  }

  const { t } = useTranslation()

  /*
    Translations:
    t('setting.experimental_features.enableNewDesign', 'New design')
    t('setting.experimental_features.enableHelp', 'Help component')
    t('setting.experimental_features.automaticWinetricksFixes', 'Apply known fixes automatically')
  */

  return (
    <>
      <h3>
        {t('settings.experimental_features.title', 'Experimental Features')}
      </h3>
      {FEATURES.map((feature) => {
        return (
          <div key={feature}>
            <FeatureToggle feature={feature} />
          </div>
        )
      })}
    </>
  )
}

export default ExperimentalFeatures
