import React from 'react'
import { useTranslation } from 'react-i18next'
import { WineInstallation } from '/src/common/types'
import { TextInputField } from '/src/frontend/components/UI'
import useSetting from '/src/frontend/hooks/useSetting'
import { defaultWineVersion } from '.'

export default function CrossoverBottle() {
  const { t } = useTranslation()
  const [wineCrossoverBottle, setWineCrossoverBottle] = useSetting<string>(
    'wineCrossoverBottle',
    'Heroic'
  )
  const [wineVersion] = useSetting<WineInstallation>(
    'wineVersion',
    defaultWineVersion
  )

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
