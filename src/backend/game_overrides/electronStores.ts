import { TypeCheckedStoreBackend } from '../electron_store'
import { join } from 'node:path'
import { userDataPath } from 'backend/constants/paths'

/**
 * Store for custom game metadata overrides (title, images)
 * These overrides are applied on top of the game info from the store
 */
export interface GameMetadataOverride {
  title?: string
  art_cover?: string
  art_square?: string
}

export type GameOverridesStore = Record<string, GameMetadataOverride>

export const gameOverridesStore = new TypeCheckedStoreBackend(
  'gameOverridesStore',
  {
    cwd: join(userDataPath, 'store'),
    name: 'game-overrides',
    clearInvalidConfig: true
  }
)
