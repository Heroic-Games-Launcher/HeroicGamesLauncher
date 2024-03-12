import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import type { PositiveInteger } from 'backend/schemas'
import ResetToDefaultButton from 'frontend/components/UI/ResetToDefaultButton'

const MaxWorkers = () => {
  const { t } = useTranslation()
  const [
    maxWorkers,
    setMaxWorkers,
    maxWorkersFetched,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useGlobalConfig('maxDownloadWorkers')
  const [maxCpus, setMaxCpus] = useState(maxWorkers)

  useEffect(() => {
    const getMoreInfo = async () => {
      const cores = await window.api.getMaxCpus()
      setMaxCpus(cores)
    }
    getMoreInfo()
  }, [maxWorkers])

  if (!maxWorkersFetched) return <></>

  return (
    <SelectField
      htmlId="max_workers"
      label={t('setting.maxworkers')}
      onChange={async (event) =>
        setMaxWorkers(
          Number(event.target.value) > 0
            ? (Number(event.target.value) as PositiveInteger)
            : null
        )
      }
      value={(maxWorkers ?? 0).toString()}
      extraClass="smaller"
      inlineElement={
        <ResetToDefaultButton
          resetToDefault={resetToDefaultValue}
          isSetToDefault={isSetToDefaultValue}
        />
      }
    >
      {Array.from(Array(maxCpus).keys()).map((n) => (
        <option key={n + 1}>{n + 1}</option>
      ))}
      <option key={0} value={0}>
        Max
      </option>
    </SelectField>
  )
}

export default MaxWorkers
