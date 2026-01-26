import { TypeCheckedStoreBackend } from '../electron_store'

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
    cwd: 'store',
    name: 'game_overrides',
    clearInvalidConfig: true
  }
)
