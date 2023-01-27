import React from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import {
  GameInfo,
  GameStatus,
  Runner,
  SideloadGame,
  Status
} from 'common/types'

const storage = window.localStorage
const nonAvailbleGames = storage.getItem('nonAvailableGames') || '[]'
const nonAvailbleGamesArray = JSON.parse(nonAvailbleGames)

async function handleNonAvailableGames(appName: string, runner: Runner) {
  const gameAvailable = await window.api.isGameAvailable({
    appName,
    runner
  })

  if (!gameAvailable) {
    if (!nonAvailbleGamesArray.includes(appName)) {
      nonAvailbleGamesArray.push(appName)
      storage.setItem(
        'nonAvailableGames',
        JSON.stringify(nonAvailbleGamesArray)
      )
    }
  } else {
    if (nonAvailbleGamesArray.includes(appName)) {
      nonAvailbleGamesArray.splice(nonAvailbleGamesArray.indexOf(appName), 1)
      storage.setItem(
        'nonAvailableGames',
        JSON.stringify(nonAvailbleGamesArray)
      )
    }
  }
  return gameAvailable
}

export function hasStatus(appName: string, gameInfo: GameInfo | SideloadGame) {
  const { libraryStatus, epic, gog } = React.useContext(ContextProvider)
  const [gameStatus, setGameStatus] = React.useState<{
    status?: Status
    folder?: string
  }>({})

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
        return setGameStatus({ status, folder })
      }

      if (thirdPartyManagedApp === 'Origin') {
        return setGameStatus({ status: 'notSupportedGame' })
      }

      if (is_installed) {
        const gameAvailable = await handleNonAvailableGames(appName, runner)
        if (!gameAvailable) {
          return setGameStatus({ status: 'notAvailable' })
        }
        return setGameStatus({ status: 'installed' })
      }

      return setGameStatus({ status: 'notInstalled' })
    }
    checkGameStatus()
  }, [libraryStatus, appName, epic.library, gog.library, is_installed])

  return gameStatus
}
