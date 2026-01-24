import { useContext } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { SelectField } from 'frontend/components/UI'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useLaunchOptions } from 'frontend/hooks/useLaunchOptions'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption | undefined) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { appName, runner, gameSettings } = useContext(GameContext)
  const { t } = useTranslation('gamepage')

  const {
    launchOptions,
    selectedIndex,
    labelForLaunchOption,
    handleLaunchOptionChange: onLaunchOptionChange
  } = useLaunchOptions({
    appName,
    runner,
    lastUsedOption: gameSettings?.lastUsedLaunchOption,
    onSelectionChange: (option) => {
      setLaunchArguments(option)
      // Save the setting
      void window.api.setSetting({
        appName,
        key: 'lastUsedLaunchOption',
        value: option
      })
    }
  })

  const handleLaunchOptionChange = (event: SelectChangeEvent) => {
    const value = event.target.value

    if (value === '') {
      onLaunchOptionChange(-1)
    } else {
      const selectedIdx = Number(value)
      onLaunchOptionChange(selectedIdx)
    }
  }

  if (!gameInfo.is_installed) {
    return null
  }

  if (!launchOptions.length) {
    return null
  }

  return (
    <SelectField
      htmlId="launch_options"
      onChange={handleLaunchOptionChange}
      value={selectedIndex.toString()}
    >
      <MenuItem key={'-1'} value={'-1'}>
        {t('launch.options', 'Launch Options...')}
      </MenuItem>
      {launchOptions.map((option, index) => (
        <MenuItem key={index} value={index}>
          {labelForLaunchOption(option)}
        </MenuItem>
      ))}
    </SelectField>
  )
}

export default LaunchOptions
