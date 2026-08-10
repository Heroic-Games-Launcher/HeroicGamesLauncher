import { appFolder, toolsPath, userDataPath } from 'backend/constants/paths'
import { join } from 'path'

export const gogdlConfigPath = join(appFolder, 'gogdlConfig', 'heroic_gogdl')
export const gogSupportPath = join(gogdlConfigPath, 'gog-support')
export const gogRedistPath = join(toolsPath, 'redist', 'gog')
const gogStorePath = join(userDataPath, 'gog_store')
export const gogConfigPath = join(gogStorePath, 'config.json')
export const gogInstalledConfigPath = join(gogStorePath, 'installed.json')
export const gogdlAuthConfig = join(gogStorePath, 'auth.json')
