import './DownloadUnits.css'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useDisplayUnits } from 'frontend/state/DisplayUnits'
import type { DisplayUnits } from 'common/format'
import {
  MEBIBYTES,
  MEBIBYTES_PER_SECOND,
  MEGABYTES,
  MEGABYTES_PER_SECOND
} from 'common/format'

const DownloadUnits = () => {
  const { t } = useTranslation()
  const [units, setUnitsSetting] = useSetting('downloadUnits', 'mib')
  const setUnits = useDisplayUnits((state) => state.setUnits)

  useEffect(() => {
    setUnits(units)
  }, [units, setUnits])

  return (
    <SelectField
      htmlId="units_selector"
      label={t('setting.units', 'Download speed units')}
      description={t(
        'setting.units-description',
        'How download and disk write speeds are shown.'
      )}
      info={t(
        'setting.units-info',
        '1 {{mib}} = 1,048,576 bytes. 1 {{mb}} = 1,000,000 bytes, so the same speed reads about 5% higher in {{mbps}}.',
        {
          mib: MEBIBYTES,
          mb: MEGABYTES,
          mbps: MEGABYTES_PER_SECOND
        }
      )}
      value={units}
      extraClass="downloadUnitsSelect"
      onChange={(event) => setUnitsSetting(event.target.value as DisplayUnits)}
    >
      <MenuItem value="mib">
        {t('setting.units-option-mib', '{{unit}} (binary)', {
          unit: MEBIBYTES_PER_SECOND
        })}
      </MenuItem>
      <MenuItem value="mb">
        {t('setting.units-option-mb', '{{unit}} (decimal)', {
          unit: MEGABYTES_PER_SECOND
        })}
      </MenuItem>
    </SelectField>
  )
}

export default DownloadUnits
