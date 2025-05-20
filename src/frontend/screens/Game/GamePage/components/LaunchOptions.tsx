import React, { useContext, useEffect } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { MenuItem } from '@mui/material'
import useLaunchOptions from 'frontend/hooks/useLaunchOptions'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption | undefined) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, runner } = useContext(GameContext)

  const {
    launchOptions,
    selectedOption,
    selectedIndex,
    selectOption,
    labelForLaunchOption
  } = useLaunchOptions({
    appName,
    runner
  })

  // Update parent component with selected option
  useEffect(() => {
    setLaunchArguments(selectedOption)
  }, [selectedOption])

  if (!gameInfo.is_installed || !launchOptions.length) {
    return null
  }

  return (
    <SelectField
      htmlId="launch_options"
      title={t('launch_options', 'Launch Options')}
      onChange={({ target: { value } }) => {
        const index = value === '' ? -1 : Number(value)
        selectOption(index, true)
      }}
      value={selectedIndex.toString()}
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
