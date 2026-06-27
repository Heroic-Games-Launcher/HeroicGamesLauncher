import { GameInfo } from 'common/types'
import { gameOverridesStore, GameMetadataOverride } from './electronStores'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { userDataPath } from 'backend/constants/paths'
import { existsSync, readdirSync, unlinkSync } from 'graceful-fs'
import { join } from 'node:path'
import type { Game } from 'common/types/game_manager'

const logPrefix: LogPrefix = 'GameOverrides'

const overridesImagesDir = join(userDataPath, 'game_overrides_images')

const removeImagesMatching = (predicate: (file: string) => boolean) => {
  if (!existsSync(overridesImagesDir)) return
  for (const file of readdirSync(overridesImagesDir)) {
    if (!predicate(file)) continue
    try {
      unlinkSync(join(overridesImagesDir, file))
    } catch (error) {
      logError(
        `Failed to delete override image ${file}: ${String(error)}`,
        logPrefix
      )
    }
  }
}

const removeImagesForApp = (game: Game) =>
  removeImagesMatching((file) => file.startsWith(`${game.id}-`))

/**
 * Get stored overrides for a specific game
 */
export function getGameOverrides(game: Game): GameMetadataOverride | null {
  try {
    const overrides = gameOverridesStore.get('overrides', {})
    return overrides[game.id] || null
  } catch {
    logError(`Failed to get overrides for ${game}`, logPrefix)
    return null
  }
}

/**
 * Get all stored overrides
 */
export function getAllGameOverrides(): Record<string, GameMetadataOverride> {
  try {
    return gameOverridesStore.get('overrides', {})
  } catch {
    logError('Failed to get all overrides', logPrefix)
    return {}
  }
}

/**
 * Save custom overrides for a game
 */
export function setGameOverrides(
  game: Game,
  override: GameMetadataOverride
): boolean {
  try {
    const currentOverrides = gameOverridesStore.get('overrides', {})

    // If override is empty, remove it and drop any stored image files.
    if (!override.title && !override.art_cover && !override.art_square) {
      delete currentOverrides[game.id]
      removeImagesForApp(game)
    } else {
      currentOverrides[game.id] = override
    }

    gameOverridesStore.set('overrides', currentOverrides)
    logInfo(`Saved overrides for ${game}`, logPrefix)
    return true
  } catch {
    logError(`Failed to save overrides for ${game}`, logPrefix)
    return false
  }
}

/**
 * Attach stored overrides to a GameInfo object as the `overrides` property.
 * Original fields (title, art_cover, art_square) are left untouched so callers
 * can choose between the canonical value and the user-edited one.
 */
export function attachOverrides(game: Game, gameInfo: GameInfo): GameInfo {
  const overrides = getGameOverrides(game)
  if (!overrides) {
    return gameInfo
  }
  return { ...gameInfo, overrides }
}
