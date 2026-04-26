import { GameInfo } from 'common/types'
import { gameOverridesStore, GameMetadataOverride } from './electronStores'
import { logInfo, logError, LogPrefix } from 'backend/logger'

const logPrefix: LogPrefix = 'GameOverrides'

/**
 * Get stored overrides for a specific game
 */
export function getGameOverrides(appName: string): GameMetadataOverride | null {
  try {
    const overrides = gameOverridesStore.get('overrides', {}) as Record<
      string,
      GameMetadataOverride
    >
    return overrides[appName] || null
  } catch {
    logError(`Failed to get overrides for ${appName}`, logPrefix)
    return null
  }
}

/**
 * Get all stored overrides
 */
export function getAllGameOverrides(): Record<string, GameMetadataOverride> {
  try {
    return gameOverridesStore.get('overrides', {}) as Record<
      string,
      GameMetadataOverride
    >
  } catch {
    logError('Failed to get all overrides', logPrefix)
    return {}
  }
}

/**
 * Save custom overrides for a game
 */
export function setGameOverrides(
  appName: string,
  override: GameMetadataOverride
): boolean {
  try {
    const currentOverrides = gameOverridesStore.get('overrides', {}) as Record<
      string,
      GameMetadataOverride
    >

    // If override is empty, remove it
    if (!override.title && !override.art_cover && !override.art_square) {
      delete currentOverrides[appName]
    } else {
      currentOverrides[appName] = override
    }

    gameOverridesStore.set('overrides', currentOverrides)
    logInfo(`Saved overrides for ${appName}`, logPrefix)
    return true
  } catch {
    logError(`Failed to save overrides for ${appName}`, logPrefix)
    return false
  }
}

/**
 * Remove overrides for a game (reset to default)
 */
export function removeGameOverrides(appName: string): boolean {
  try {
    const currentOverrides = gameOverridesStore.get('overrides', {}) as Record<
      string,
      GameMetadataOverride
    >
    delete currentOverrides[appName]
    gameOverridesStore.set('overrides', currentOverrides)
    logInfo(`Removed overrides for ${appName}`, logPrefix)
    return true
  } catch {
    logError(`Failed to remove overrides for ${appName}`, logPrefix)
    return false
  }
}

/**
 * Attach stored overrides to a GameInfo object as the `overrides` property.
 * Original fields (title, art_cover, art_square) are left untouched so callers
 * can choose between the canonical value and the user-edited one.
 */
export function attachOverrides(gameInfo: GameInfo): GameInfo {
  const overrides = getGameOverrides(gameInfo.app_name)
  if (!overrides) {
    return gameInfo
  }
  return { ...gameInfo, overrides }
}
