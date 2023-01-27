import { Runner, Status } from 'common/types'
import { TFunction } from 'react-i18next'
import fallbackImage from 'frontend/assets/heroic_card.jpg'

type StatusArgs = {
  status: Status
  t: TFunction<'gamepage', undefined>
  runner: Runner
  size: string
  percent: number
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

export function getImageFormatting(cover: string, runner: Runner) {
  const imageBase = cover
  if (imageBase === 'fallback') {
    return fallbackImage
  }
  if (runner === 'legendary') {
    return `${imageBase}?h=400&resize=1&w=300`
  } else {
    return imageBase
  }
}

export const installingGrayscale = (
  isInstalling: boolean,
  progress: number
) => {
  return isInstalling ? `${125 - progress}%` : '100%'
}
