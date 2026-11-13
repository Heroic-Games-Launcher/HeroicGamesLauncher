import { heroicDataPath, toolsPath } from 'backend/constants/paths'
import { join } from 'path'

export const gogdlConfigPath = join(
  heroicDataPath,
  'gogdlConfig',
  'heroic_gogdl'
)
export const gogSupportPath = join(gogdlConfigPath, 'gog-support')
export const gogRedistPath = join(toolsPath, 'redist', 'gog')
export const gogdlAuthConfig = join(heroicDataPath, 'gog_store', 'auth.json')
