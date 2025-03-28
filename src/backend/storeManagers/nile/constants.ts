import { appFolder } from 'backend/constants/paths'
import { join } from 'path'

export const nileConfigPath = join(appFolder, 'nile_config', 'nile')
export const nileInstalled = join(nileConfigPath, 'installed.json')
export const nileLibrary = join(nileConfigPath, 'library.json')
export const nileUserData = join(nileConfigPath, 'user.json')
