import React from 'react'
import ContextProvider from 'frontend/state/ContextProvider'
import { GameInfo, Status } from 'common/types'
import { hasProgress } from './hasProgress'
import { useTranslation } from 'react-i18next'
import { getStatusLabel, handleNonAvailableGames } from './constants'
import type { GameHandle } from '../helpers/ipc'

export function hasStatus(game: GameHandle, gameSize?: string) {
  const { libraryStatus, epic, gog } = React.useContext(ContextProvider)
  const [progress] = hasProgress(game)
  const [gameInfo, setGameInfo] = React.useState<GameInfo>()
  const { t } = useTranslation('gamepage')

  const [gameStatus, setGameStatus] = React.useState<{
    status?: Status
    statusContext?: string
    folder?: string
    label: string
  }>({ label: '' })

  const {
    thirdPartyManagedApp = undefined,
    is_installed,
    runner = 'sideload',
    isEAManaged,
    isUbisoftManaged
  } = { ...gameInfo }

  React.useEffect(() => {
    const getGameInfo = async () => {
      const updatedInfo = await window.api.getGameInfo(game)
      if (updatedInfo) {
        setGameInfo(updatedInfo)
      }
    }
    getGameInfo()
  }, [game])

  React.useEffect(() => {
    const checkGameStatus = async () => {
      const {
        status,
        folder,
        context: statusContext
      } = libraryStatus.find((s) => s.appName === game.id) || {}

      if (status && status !== 'done') {
        const label = getStatusLabel({
          status,
          t,
          runner,
          size: gameSize,
          statusContext,
          percent: progress.percent
        })
        return setGameStatus({ status, folder, label, statusContext })
      }

      if (thirdPartyManagedApp && !isEAManaged && !isUbisoftManaged) {
        const label = getStatusLabel({
          status: 'notSupportedGame',
          t,
          runner
        })
        return setGameStatus({
          status: 'notSupportedGame',
          label,
          statusContext
        })
      }

      if (is_installed && !thirdPartyManagedApp) {
        const gameAvailable = await handleNonAvailableGames(game)
        if (!gameAvailable) {
          const label = getStatusLabel({
            status: 'notAvailable',
            t,
            runner
          })
          return setGameStatus({ status: 'notAvailable', label, statusContext })
        }
        const label = getStatusLabel({
          status: 'installed',
          t,
          runner,
          size: gameSize
        })
        return setGameStatus({ status: 'installed', label, statusContext })
      }

      const label = getStatusLabel({
        status: 'notInstalled',
        t,
        runner
      })
      return setGameStatus({ status: 'notInstalled', label, statusContext })
    }
    checkGameStatus()
  }, [
    libraryStatus,
    game,
    epic.library,
    gog.library,
    is_installed,
    progress.percent
  ])

  return gameStatus
}
