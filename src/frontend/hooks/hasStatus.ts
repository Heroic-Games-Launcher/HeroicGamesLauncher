import React from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, GameStatus, SideloadGame, Status } from 'common/types'
import { hasProgress } from './hasProgress'
import { useTranslation } from 'react-i18next'
import { getStatusLabel, handleNonAvailableGames } from './constants'

export function hasStatus(
  appName: string,
  gameInfo: GameInfo | SideloadGame,
  gameSize?: string
) {
  const { libraryStatus, epic, gog } = React.useContext(ContextProvider)
  const [progress] = hasProgress(appName)
  const { t } = useTranslation('gamepage')

  const [gameStatus, setGameStatus] = React.useState<{
    status?: Status
    folder?: string
    label: string
  }>({ label: '' })

  const {
    thirdPartyManagedApp = undefined,
    is_installed,
    runner
  } = { ...gameInfo }

  React.useEffect(() => {
    const checkGameStatus = async () => {
      const { status, folder } =
        libraryStatus.find((game: GameStatus) => game.appName === appName) || {}

      if (status) {
        const label = getStatusLabel({
          status,
          t,
          runner,
          size: gameSize,
          percent: progress.percent
        })
        return setGameStatus({ status, folder, label })
      }

      if (thirdPartyManagedApp === 'Origin') {
        const label = getStatusLabel({
          status: 'notSupportedGame',
          t,
          runner
        })
        return setGameStatus({ status: 'notSupportedGame', label })
      }

      if (is_installed) {
        const gameAvailable = await handleNonAvailableGames(appName, runner)
        if (!gameAvailable) {
          const label = getStatusLabel({
            status: 'notAvailable',
            t,
            runner
          })
          return setGameStatus({ status: 'notAvailable', label })
        }
        const label = getStatusLabel({
          status: 'installed',
          t,
          runner,
          size: gameSize
        })
        return setGameStatus({ status: 'installed', label })
      }

      const label = getStatusLabel({
        status: 'notInstalled',
        t,
        runner
      })
      return setGameStatus({ status: 'notInstalled', label })
    }
    checkGameStatus()
  }, [
    libraryStatus,
    appName,
    epic.library,
    gog.library,
    is_installed,
    progress.percent
  ])

  return gameStatus
}
