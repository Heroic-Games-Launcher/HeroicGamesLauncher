import { useEffect, useState } from 'react'
import { GameInfo, Status } from 'common/types'
import { hasProgress } from './hasProgress'
import { useTranslation } from 'react-i18next'
import { getStatusLabel, handleNonAvailableGames } from './constants'
import { useGlobalState } from '../state/GlobalStateV2'
import { useShallow } from 'zustand/react/shallow'

export function hasStatus(
  appName: string,
  gameInfo: GameInfo,
  gameSize?: string
) {
  const thisStatus = useGlobalState(
    useShallow((state) => state.libraryStatus[`${appName}_${gameInfo.runner}`])
  )
  const [progress] = hasProgress(appName)
  const { t } = useTranslation('gamepage')

  const [gameStatus, setGameStatus] = useState<{
    status?: Status
    statusContext?: string
    folder?: string
    label: string
  }>({ label: '' })

  const {
    thirdPartyManagedApp = undefined,
    is_installed,
    runner,
    isEAManaged
  } = { ...gameInfo }

  useEffect(() => {
    const checkGameStatus = async () => {
      const { status, folder, context: statusContext } = thisStatus ?? {}

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

      if (thirdPartyManagedApp && !isEAManaged) {
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
        const gameAvailable = await handleNonAvailableGames(appName, runner)
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
  }, [thisStatus, appName, is_installed, progress.percent])

  return gameStatus
}
