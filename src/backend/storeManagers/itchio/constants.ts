import { appFolder } from 'backend/constants/paths'
import { join } from 'path'

export const itchioConfigPath = join(appFolder, 'itchio_config')
export const butlerDbPath = join(itchioConfigPath, 'butler.db')
