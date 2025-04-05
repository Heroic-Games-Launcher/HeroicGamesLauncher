import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const ExperimentalFeatures = () => {
  const FEATURES = ['enableHelp', 'cometSupport']

  const { t } = useTranslation()
  const [experimentalFeatures, setExperimentalFeatures] = useSetting(
    'experimentalFeatures',
    {
      enableHelp: false,
      cometSupport: true
    }
  )
  const { handleExperimentalFeatures } = useContext(ContextProvider)

  const toggleFeature = (feature: string) => {
    const newFeatures = {
      ...experimentalFeatures,
      [feature]:
        !experimentalFeatures[feature as keyof typeof experimentalFeatures]
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
              value={
                experimentalFeatures[
                  feature as keyof typeof experimentalFeatures
                ]
              }
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
