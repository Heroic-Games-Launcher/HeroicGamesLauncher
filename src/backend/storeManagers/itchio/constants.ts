import { appFolder, userDataPath } from 'backend/constants/paths'
import { join } from 'path'

export const itchioConfigPath = join(appFolder, 'itchio_config')
export const butlerDbPath = join(itchioConfigPath, 'butler.db')
// Mirrors the electron-store created in electronStores.ts (cwd 'itchio_store',
// default store name 'config'). Heroic keeps the logged-in profile id here.
export const itchioStoreConfigPath = join(
  userDataPath,
  'itchio_store',
  'config.json'
)
