import React from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'

export default function CrossoverBottle() {
  const { t } = useTranslation()
  const [
    crossoverBottle,
    setCrossoverBottle,
    crossoverBottleConfigFetched,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useSharedConfig('crossoverBottle')
  const [wineVersion, , wineVersionConfigFetched] =
    useSharedConfig('wineVersion')

  if (
    !crossoverBottleConfigFetched ||
    !wineVersionConfigFetched ||
    wineVersion.type !== 'crossover'
  ) {
    return <></>
  }

  return (
    <TextInputField
      label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
      htmlId="crossoverBottle"
      value={crossoverBottle}
      onChange={async (event) => setCrossoverBottle(event.target.value)}
      isSetToDefaultValue={isSetToDefaultValue}
      resetToDefaultValue={resetToDefaultValue}
    />
  )
}
