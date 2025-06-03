import React, { useCallback, useContext, useEffect, useState } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { SelectField } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption | undefined) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { appName, runner } = useContext(GameContext)
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedLaunchOptionIndex, setSelectedLaunchOptionIndex] = useState(0)

  useEffect(() => {
    void window.api.getLaunchOptions(appName, runner).then(setLaunchOptions)
  }, [gameInfo])

  const labelForLaunchOption = useCallback((option: LaunchOption) => {
    switch (option.type) {
      case undefined:
      case 'basic':
        return option.name
      case 'dlc':
        return option.dlcTitle
      case 'altExe':
        return option.executable
    }
  }, [])

  if (!gameInfo.is_installed) {
    return null
  }

  if (!launchOptions.length) {
    return null
  }

  return (
    <SelectField
      htmlId="launch_options"
      onChange={({ target: { value } }) => {
        if (value === '') {
          setSelectedLaunchOptionIndex(-1)
          setLaunchArguments(undefined)
        } else {
          const selectedIndex = Number(value)
          setSelectedLaunchOptionIndex(selectedIndex)
          setLaunchArguments(launchOptions[selectedIndex])
        }
      }}
      value={selectedLaunchOptionIndex.toString()}
    >
      {launchOptions.map((option, index) => (
        <MenuItem key={index} value={index}>
          {labelForLaunchOption(option)}
        </MenuItem>
      ))}
    </SelectField>
  )
}

export default LaunchOptions
