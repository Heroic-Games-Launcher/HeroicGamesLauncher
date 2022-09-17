import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { ipcRenderer } from 'frontend/helpers'
import useSetting from 'frontend/hooks/useSetting'

const MaxWorkers = () => {
  const { t } = useTranslation()
  const [maxWorkers, setMaxWorkers] = useSetting<number>('maxWorkers', 0)
  const [maxCpus, setMaxCpus] = useState(maxWorkers)

  useEffect(() => {
    const getMoreInfo = async () => {
      const cores = await ipcRenderer.invoke('getMaxCpus')
      setMaxCpus(cores)
    }
    getMoreInfo()
  }, [maxWorkers])

  return (
    <SelectField
      htmlId="max_workers"
      label={t('setting.maxworkers')}
      onChange={(event) => setMaxWorkers(Number(event.target.value))}
      value={maxWorkers.toString()}
      extraClass="smaller"
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
