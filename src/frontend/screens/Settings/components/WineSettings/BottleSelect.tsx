import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { WineInstallation } from 'common/types'
import { defaultWineVersion } from '.'

export default function BottleSelect() {
  const { t } = useTranslation()
  const [selectedBottleName, setSelectedBottleName] = useSetting<string>(
    'bottlesBottle',
    'Heroic'
  )

  const [wineVersion] = useSetting<WineInstallation>(
    'wineVersion',
    defaultWineVersion
  )
  const [bottlesNames, setBottlesNames] = useState([])

  useEffect(() => {
    let cancelled = false
    const getBottlesNames = async () => {
      const bottlesNames = await window.api.getBottlesNames(wineVersion.bin)
      if (!cancelled) setBottlesNames(bottlesNames)
    }

    getBottlesNames()
    return () => {
      cancelled = true
    }
  }, [])

  if (wineVersion.type !== 'bottles') {
    return <></>
  }

  return (
    <>
      <SelectField
        label={t('setting.bottles-bottle', 'Bottle')}
        htmlId="setBottlesBottleName"
        value={selectedBottleName}
        onChange={(event) => {
          setSelectedBottleName(event.target.value)
        }}
      >
        {bottlesNames.map((value, index) => (
          <option key={'bottle' + index} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
    </>
  )
}
