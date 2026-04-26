import { GameInfo } from 'common/types'
import { gameOverridesStore, GameMetadataOverride } from './electronStores'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { userDataPath } from 'backend/constants/paths'
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  unlinkSync
} from 'graceful-fs'
import { extname, join } from 'node:path'

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

const removeImagesForKind = (appName: string, kind: 'cover' | 'square') =>
  removeImagesMatching((file) => file.startsWith(`${appName}-${kind}.`))

const removeImagesForApp = (appName: string) =>
  removeImagesMatching((file) => file.startsWith(`${appName}-`))

/**
 * Copies a user-picked image into the app's data directory and returns the
 * destination path. Used so overrides survive the original file being moved or
 * deleted (and so Flatpak portal-mounted paths don't leak into persistent state).
 */
export function copyImageToOverrides(
  srcPath: string,
  appName: string,
  kind: 'cover' | 'square'
): string | null {
  try {
    if (!existsSync(srcPath)) {
      logError(`Source image does not exist: ${srcPath}`, logPrefix)
      return null
    }
    if (!existsSync(overridesImagesDir)) {
      mkdirSync(overridesImagesDir, { recursive: true })
    }
    // Drop any prior file for this kind so changing extensions doesn't
    // leave stale orphans behind.
    removeImagesForKind(appName, kind)
    const ext = extname(srcPath) || '.png'
    const destPath = join(overridesImagesDir, `${appName}-${kind}${ext}`)
    copyFileSync(srcPath, destPath)
    return destPath
  } catch (error) {
    logError(
      `Failed to copy image override for ${appName}: ${String(error)}`,
      logPrefix
    )
    return null
  }
}

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

    // If override is empty, remove it and drop any stored image files.
    if (!override.title && !override.art_cover && !override.art_square) {
      delete currentOverrides[appName]
      removeImagesForApp(appName)
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
