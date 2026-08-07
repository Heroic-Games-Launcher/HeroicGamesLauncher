import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { MenuItem } from '@mui/material'
import { hasHelp } from 'frontend/hooks/hasHelp'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MaxWorkers = () => {
  const { t } = useTranslation()
  const [maxWorkers, setMaxWorkers] = useSetting('maxWorkers', 0)
  const [maxCpus, setMaxCpus] = useState(maxWorkers)

  useEffect(() => {
    const getMoreInfo = async () => {
      const cores = await window.api.getMaxCpus()
      setMaxCpus(cores)
    }
    getMoreInfo()
  }, [maxWorkers])

  const helpContent = t(
    'help.max_workers.info',
    'Sets the maximum number of parallel download chunks. Lower numbers limit download speed. High numbers can lead to high CPU usage.'
  )

  hasHelp(
    'maxWorkers',
    t('setting.maxworkers', 'Maximum Number of Workers when downloading'),
    <p>{helpContent}</p>
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}
    >
      <SelectField
        htmlId="max_workers"
        label={t('setting.maxworkers')}
        onChange={(event) => setMaxWorkers(Number(event.target.value))}
        value={maxWorkers.toString()}
        extraClass="smaller"
      >
        {Array.from(Array(maxCpus).keys()).map((n) => (
          <MenuItem key={n + 1} value={n + 1}>
            {n + 1}
          </MenuItem>
        ))}
        <MenuItem key={0} value={0}>
          Max
        </MenuItem>
      </SelectField>
      <InfoIcon text={helpContent} />
    </div>
  )
}

export default MaxWorkers
