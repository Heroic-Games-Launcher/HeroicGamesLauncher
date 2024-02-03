import React from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGameConfig } from 'frontend/hooks/config'
import { useTranslation } from 'react-i18next'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const IgnoreGameUpdates = () => {
  const { t } = useTranslation()

  const [
    ignoreGameUpdates,
    setIgnoreGameUpdates,
    ,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useGameConfig('ignoreGameUpdates')

  return (
    <ToggleSwitch
      htmlId="ignoreGameUpdates"
      value={ignoreGameUpdates}
      handleChange={async () => setIgnoreGameUpdates(!ignoreGameUpdates)}
      title={t('setting.ignoreGameUpdates', 'Ignore game updates')}
      inlineElement={
        <ResetToDefaultButton
          resetToDefault={resetToDefaultValue}
          isSetToDefault={isSetToDefaultValue}
        />
      }
    />
  )
}

export default IgnoreGameUpdates
