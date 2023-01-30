import { Runner, Status } from 'common/types'
import { TFunction } from 'react-i18next'

type StatusArgs = {
  status: Status
  t: TFunction<'gamepage', undefined>
  runner: Runner
  percent?: number
  size?: string
}

export function getStatus({
  status,
  t,
  runner,
  size,
  percent
}: StatusArgs): string {
  const statusMap: Partial<Record<Status, string>> = {
    notSupportedGame: t('status.notSupportedGame', 'Not Supported'),
    notAvailable: t('status.gameNotAvailable', 'Game not available'),
    playing: t('status.playing', 'Playing'),
    queued: `${t('status.queued', 'Queued')}`,
    uninstalling: t('status.uninstalling', 'Uninstalling'),
    updating: `${t('status.updating')} ${Math.ceil(percent || 0)}%`,
    installing: `${t('status.installing')} ${Math.ceil(percent || 0)}%`,
    moving: t('gamecard.moving', 'Moving'),
    repairing: t('gamecard.repairing', 'Repairing'),
    installed: `${t('status.installed')} ${runner === 'sideload' ? '' : size}`,
    notInstalled: t('status.notinstalled')
  }

  return statusMap[status] || t('status.notinstalled')
}

const storage = window.localStorage
const nonAvailbleGames = storage.getItem('nonAvailableGames') || '[]'
const nonAvailbleGamesArray = JSON.parse(nonAvailbleGames)

export async function handleNonAvailableGames(appName: string, runner: Runner) {
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
