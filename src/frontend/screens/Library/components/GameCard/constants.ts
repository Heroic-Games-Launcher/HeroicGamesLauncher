import { Runner, CoverResolution } from 'common/types'
import fallbackImage from 'frontend/assets/heroic_card.jpg'

const legendaryResolutions: Record<CoverResolution, string> = {
  low: '?h=240&resize=1&w=180',
  medium: '?h=400&resize=1&w=300',
  high: '?h=800&resize=1&w=600'
}

export function getImageFormatting(
  cover: string,
  runner: Runner,
  resolution: CoverResolution = 'medium'
) {
  const imageBase = cover
  if (imageBase === 'fallback' || !cover) {
    return fallbackImage
  }
  if (runner === 'legendary') {
    return `${imageBase}${legendaryResolutions[resolution]}`
  } else {
    return imageBase
  }
}

export function getCardStatus(
  status: string | undefined,
  isInstalled: boolean,
  layout: string
) {
  const isInstalling =
    status === 'installing' || status === 'updating' || status === 'extracting'
  const isUpdating = status === 'updating'
  const isReparing = status === 'repairing'
  const isMoving = status === 'moving'
  const isPlaying = status === 'playing'
  const isQueued = status === 'queued'
  const isUninstalling = status === 'uninstalling'
  const notAvailable = status === 'notAvailable'
  const notSupportedGame = status === 'notSupportedGame'
  const syncingSaves = status === 'syncing-saves'
  const isLaunching = status === 'launching'
  const isInstallingWinetricksPackages = status === 'winetricks'
  const isInstallingRedist = status === 'redist'

  const haveStatus =
    isMoving ||
    isReparing ||
    isInstalling ||
    isUpdating ||
    isQueued ||
    isUninstalling ||
    notAvailable ||
    notSupportedGame ||
    isPlaying ||
    syncingSaves ||
    isLaunching ||
    isInstallingWinetricksPackages ||
    isInstallingRedist ||
    (isInstalled && layout !== 'grid')
  return {
    isInstalling,
    notSupportedGame,
    isUninstalling,
    isQueued,
    isPlaying,
    notAvailable,
    isUpdating,
    isLaunching,
    isInstallingWinetricksPackages,
    isInstallingRedist,
    haveStatus
  }
}
