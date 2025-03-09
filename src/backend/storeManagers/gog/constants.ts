import { appFolder, toolsPath, userDataPath } from 'backend/constants/paths'
import { join } from 'path'

export const gogdlConfigPath = join(appFolder, 'gogdlConfig', 'heroic_gogdl')
export const gogSupportPath = join(gogdlConfigPath, 'gog-support')
export const gogRedistPath = join(toolsPath, 'redist', 'gog')
export const gogdlAuthConfig = join(userDataPath, 'gog_store', 'auth.json')
