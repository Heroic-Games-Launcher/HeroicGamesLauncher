import { useCallback, useContext, useEffect, useState } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { SelectField } from 'frontend/components/UI'
import { MenuItem, SelectChangeEvent } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption | undefined) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { appName, runner, gameSettings } = useContext(GameContext)
  const { t } = useTranslation('gamepage')
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedLaunchOptionIndex, setSelectedLaunchOptionIndex] = useState(-1)

  useEffect(() => {
    const fetchLaunchOptions = async () => {
      const options = await window.api.getLaunchOptions(appName, runner)
      setLaunchOptions(options)

      if (gameSettings?.lastUsedLaunchOption && options.length > 0) {
        const lastOption = gameSettings.lastUsedLaunchOption
        const foundIndex = options.findIndex((option) => {
          if (option.type !== lastOption.type) return false

          if (
            (option.type === undefined || option.type === 'basic') &&
            'name' in option &&
            'name' in lastOption &&
            'parameters' in option &&
            'parameters' in lastOption
          ) {
            return (
              option.name === lastOption.name &&
              option.parameters === lastOption.parameters
            )
          }

          if (
            option.type === 'dlc' &&
            'dlcAppName' in option &&
            'dlcAppName' in lastOption
          ) {
            return option.dlcAppName === lastOption.dlcAppName
          }

          if (
            option.type === 'altExe' &&
            'executable' in option &&
            'executable' in lastOption
          ) {
            return option.executable === lastOption.executable
          }

          return false
        })

        if (foundIndex !== -1) {
          setSelectedLaunchOptionIndex(foundIndex)
          setLaunchArguments(options[foundIndex])
        } else {
          setSelectedLaunchOptionIndex(0)
          if (options.length > 0) {
            setLaunchArguments(options[0])
          }
        }
      } else if (options.length > 0) {
        // If no saved option, use the first one
        setSelectedLaunchOptionIndex(0)
        setLaunchArguments(options[0])
      }
    }

    void fetchLaunchOptions()
  }, [gameInfo, appName, runner, gameSettings, setLaunchArguments])

  const labelForLaunchOption = useCallback((option: LaunchOption) => {
    switch (option.type) {
      case undefined:
      case 'basic':
        return 'name' in option ? option.name : 'Launch Option'
      case 'dlc':
        return 'dlcTitle' in option ? option.dlcTitle : 'DLC'
      case 'altExe':
        return 'executable' in option
          ? option.executable
          : 'Alternative Executable'
    }
  }, [])

  const handleLaunchOptionChange = (event: SelectChangeEvent) => {
    const value = event.target.value

    if (value === '') {
      setSelectedLaunchOptionIndex(-1)
      setLaunchArguments(undefined)
      // Save the setting
      void window.api.setSetting({
        appName,
        key: 'lastUsedLaunchOption',
        value: undefined
      })
    } else {
      const selectedIndex = Number(value)
      setSelectedLaunchOptionIndex(selectedIndex)
      const selectedOption = launchOptions[selectedIndex]
      setLaunchArguments(selectedOption)
      // Save the setting
      void window.api.setSetting({
        appName,
        key: 'lastUsedLaunchOption',
        value: selectedOption
      })
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
      value={selectedLaunchOptionIndex.toString()}
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
