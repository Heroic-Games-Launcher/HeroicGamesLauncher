import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ipcRenderer } from 'frontend/helpers'
import { SelectField } from 'frontend/components/UI'

interface Props {
  bottlesType: string
  bottlesBottle: string
  setBottle: (bottle: string) => void
}

export default function BottleSelect({
  bottlesType,
  bottlesBottle,
  setBottle
}: Props) {
  const { t } = useTranslation()
  const [bottlesNames, setBottlesNames] = useState([])
  useEffect(() => {
    const getBottlesNames = async () => {
      setBottlesNames(
        await ipcRenderer.invoke('bottles.getBottlesNames', bottlesType)
      )
    }

    getBottlesNames()
  }, [])

  return (
    <>
      <SelectField
        label={t('setting.bottles-bottle', 'Bottle')}
        htmlId="setBottlesBottleName"
        value={bottlesBottle}
        onChange={(event) => {
          setBottle(event.target.value)
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
