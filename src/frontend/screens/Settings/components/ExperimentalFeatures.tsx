import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const ExperimentalFeatures = () => {
  const FEATURES = ['enableNewDesign', 'enableHelp', 'cometSupport']

  if (!isWindows) {
    FEATURES.push('automaticWinetricksFixes')
  }

  if (isLinux) {
    FEATURES.push('umuSupport')
  }

  const { t } = useTranslation()
  const [experimentalFeatures, setExperimentalFeatures] = useSetting(
    'experimentalFeatures',
    {
      enableNewDesign: false,
      enableHelp: false,
      automaticWinetricksFixes: true,
      cometSupport: true,
      umuSupport: false
    }
  )
  const { handleExperimentalFeatures } = useContext(ContextProvider)

  const toggleFeature = (feature: string) => {
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
    t('setting.experimental_features.automaticWinetricksFixes', 'Apply known fixes automatically')
    t('setting.experimental_features.cometSupport', 'Comet support')
    t('setting.experimental_features.umuSupport', 'Use UMU as Proton runtime')
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
