import React, { useContext, useEffect, useState } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'

interface Props {
  gameInfo: GameInfo
  setLaunchArguments: (selected_option: LaunchOption | undefined) => void
}

const LaunchOptions = ({ gameInfo, setLaunchArguments }: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, runner } = useContext(GameContext)
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])
  const [selectedLaunchOptionIndex, setSelectedLaunchOptionIndex] = useState(-1)

  useEffect(() => {
    window.api.getLaunchOptions(appName, runner).then(setLaunchOptions)
  }, [gameInfo])

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
      prompt={t('launch.options', 'Launch Options...')}
    >
      {launchOptions.map((option, index) => (
        <option key={index} value={index}>
          {option.type === 'dlc' ? option.dlcTitle : option.name}
        </option>
      ))}
    </SelectField>
  )
}

export default LaunchOptions
