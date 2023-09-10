import React, { useContext, useEffect, useState } from 'react'
import GameContext from '../../GameContext'
import { GameInfo, LaunchOption } from 'common/types'
import { getGOGLaunchOptions } from 'frontend/helpers'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'

interface Props {
  gameInfo: GameInfo
  launchArguments: string
  setLaunchArguments: (args: string) => void
}

const LaunchOptions = ({
  gameInfo,
  launchArguments,
  setLaunchArguments
}: Props) => {
  const { t } = useTranslation('gamepage')
  const { appName, gameInstallInfo, runner } = useContext(GameContext)
  const [launchOptions, setLaunchOptions] = useState<LaunchOption[]>([])

  useEffect(() => {
    if (!gameInstallInfo) {
      return
    }

    if (
      runner === 'gog' &&
      (gameInstallInfo.game?.launch_options || []).length === 0
    ) {
      getGOGLaunchOptions(appName)
        .then((launchOptions) => {
          setLaunchOptions(launchOptions)
        })
        .catch((error) => {
          console.error(error)
          window.api.logError(`${error}`)
        })
    } else {
      setLaunchOptions(gameInstallInfo.game?.launch_options)
    }
  }, [gameInstallInfo])

  if (!gameInfo.is_installed) {
    return null
  }

  if (!launchOptions.length) {
    return null
  }

  return (
    <SelectField
      htmlId="launch_options"
      onChange={(event) => setLaunchArguments(event.target.value)}
      value={launchArguments}
      prompt={t('launch.options', 'Launch Options...')}
    >
      {launchOptions.map(({ name, parameters }) => (
        <option key={parameters} value={parameters}>
          {name}
        </option>
      ))}
    </SelectField>
  )
}

export default LaunchOptions
