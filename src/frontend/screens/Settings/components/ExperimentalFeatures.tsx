import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import type { ExperimentalFeatures as ExperimentalFeaturesT } from 'common/types'

const ExperimentalFeatures = () => {
  const FEATURES = ['enableNewDesign', 'enableHelp', 'cometSupport'] as const

  const { t } = useTranslation()
  const [experimentalFeatures, setExperimentalFeatures] = useSetting(
    'experimentalFeatures',
    {
      enableNewDesign: false,
      enableHelp: false,
      cometSupport: true
    }
  )
  const { handleExperimentalFeatures } = useContext(ContextProvider)

  const toggleFeature = (feature: keyof ExperimentalFeaturesT) => {
    const newFeatures = {
      ...experimentalFeatures,
      [feature]: !experimentalFeatures[feature]
    }
    setExperimentalFeatures(newFeatures) // update settings
    handleExperimentalFeatures(newFeatures) // update global state
  }

  /*
    Translations:
    t('setting.experimental_features.enableNewDesign', 'New design')
    t('setting.experimental_features.enableHelp', 'Help component')
    t('setting.experimental_features.cometSupport', 'Comet support')
  */

  return (
    <>
      <h3>
        {t('settings.experimental_features.title', 'Experimental Features')}
      </h3>
      {FEATURES.map((feature) => {
        return (
          <div key={feature}>
            <ToggleSwitch
              htmlId={feature}
              value={experimentalFeatures[feature]}
              handleChange={() => toggleFeature(feature)}
              title={t(`setting.experimental_features.${feature}`, feature)}
            />
          </div>
        )
      })}
    </>
  )
}

export default ExperimentalFeatures
