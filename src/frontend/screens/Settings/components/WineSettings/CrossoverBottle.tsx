import React from 'react'
import { useTranslation } from 'react-i18next'
import { TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { defaultWineVersion } from '.'

export default function CrossoverBottle() {
  const { t } = useTranslation()
  const [wineCrossoverBottle, setWineCrossoverBottle] = useSetting(
    'wineCrossoverBottle',
    'Heroic'
  )
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  if (wineVersion.type !== 'crossover') {
    return <></>
  }

  return (
    <TextInputField
      label={t('setting.winecrossoverbottle', 'CrossOver Bottle')}
      htmlId="crossoverBottle"
      value={wineCrossoverBottle}
      onChange={(event) => setWineCrossoverBottle(event.target.value)}
    />
  )
}
