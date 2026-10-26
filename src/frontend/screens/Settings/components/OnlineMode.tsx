import { MenuItem, SelectChangeEvent } from '@mui/material'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const OnlineMode = () => {
  const { t } = useTranslation()
  const [networkMode, setNetworkMode] = useSetting('networkMode', 'auto')

  const handleChange = (event: SelectChangeEvent) => {
    setNetworkMode(event.target.value as 'auto' | 'online' | 'offline')
  }

  return (
    <SelectField
      htmlId="networkMode"
      value={networkMode}
      onChange={handleChange}
      label={t('setting.networkModeLabel', 'Online/Offline Mode')}
    >
      <MenuItem value="auto">
        {t('setting.networkMode.auto', 'Auto (follow connection)')}
      </MenuItem>
      <MenuItem value="online">
        {t('setting.networkMode.online', 'Online (always check for updates)')}
      </MenuItem>
      <MenuItem value="offline">
        {t('setting.networkMode.offline', 'Offline (never check for updates)')}
      </MenuItem>
    </SelectField>
  )
}

export default OnlineMode
