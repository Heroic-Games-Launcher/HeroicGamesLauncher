import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import SettingsContext from '../SettingsContext'
import { LaunchOption } from 'common/types'
import useSetting from 'frontend/hooks/useSetting'
import { useLaunchOptions } from 'frontend/hooks/useLaunchOptions'

const LaunchOptionSelector = ({ showTitle = true }: { showTitle: boolean }) => {
  const { t } = useTranslation()
  const { isDefault, appName, gameInfo } = useContext(SettingsContext)

  const defaultLaunchOption: LaunchOption = {
    type: 'basic',
    name: '',
    parameters: ''
  }

  const [lastUsedLaunchOption, setLastUsedLaunchOption] = useSetting(
    'lastUsedLaunchOption',
    defaultLaunchOption
  )

  const {
    launchOptions,
    selectedIndex,
    labelForLaunchOption,
    handleLaunchOptionChange
  } = useLaunchOptions({
    appName: appName || '',
    runner: gameInfo?.runner,
    lastUsedOption: lastUsedLaunchOption,
    onSelectionChange: (option) => {
      setLastUsedLaunchOption(option)
    }
  })

  const handleSelectChange = (event: SelectChangeEvent) => {
    const value = event.target.value
    const index = Number(value)
    handleLaunchOptionChange(index)
  }

  if (isDefault || launchOptions.length <= 1) {
    return null
  }

  return (
    <div className="Field">
      {showTitle && (
        <label>{t('settings.launchOptions', 'Launch Options')}</label>
      )}
      <div className="SettingsField">
        <SelectField
          htmlId="launch_options_settings"
          onChange={handleSelectChange}
          value={selectedIndex.toString()}
        >
          {launchOptions.map((option, index) => (
            <MenuItem key={index} value={index.toString()}>
              {labelForLaunchOption(option)}
            </MenuItem>
          ))}
        </SelectField>
      </div>
    </div>
  )
}

export default LaunchOptionSelector
