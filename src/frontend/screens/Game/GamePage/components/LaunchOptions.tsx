import React, { useContext, useEffect, useState } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, runner } = useContext(GameContext)
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedLaunchOptionIndex, setSelectedLaunchOptionIndex] = useState(-1)

  useEffect(() => {
    window.api.getLaunchOptions(appName, runner).then(setLaunchOptions)
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
        const selectedIndex = Number(value)
        setSelectedLaunchOptionIndex(selectedIndex)
        setLaunchArguments(launchOptions[selectedIndex])
      }}
      value={selectedLaunchOptionIndex.toString()}
      prompt={t('launch.options', 'Launch Options...')}
    >
      {launchOptions.map((option, index) => (
        <MenuItem key={index} value={index}>
          {option.type === 'dlc' ? option.dlcTitle : option.name}
        </MenuItem>
      ))}
    </SelectField>
  )
}

export default LaunchOptions
