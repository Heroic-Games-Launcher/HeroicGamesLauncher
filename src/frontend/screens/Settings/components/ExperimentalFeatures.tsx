import React, { useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const FEATURES = ['enableNewShinyFeature']

const ExperimentalFeatures = () => {
  const { t } = useTranslation()
  const [experimentalFeatures, setExprimentalFeatures] = useSetting(
    'experimentalFeatures',
    { enableNewShinyFeature: false }
  )
  const { handleExperimentalFeatures } = useContext(ContextProvider)

  const toggleFeature = (feature: string) => {
    setExprimentalFeatures({
      ...experimentalFeatures,
      [feature]: !experimentalFeatures[feature]
    })
  }

  useEffect(() => {
    handleExperimentalFeatures(experimentalFeatures)
  }, [experimentalFeatures])

  /*
    Translations:
    t('setting.experimental_features.enableNewShinyFeature', 'New shiny feature')
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
