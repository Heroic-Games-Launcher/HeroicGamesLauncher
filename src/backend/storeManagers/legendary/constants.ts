import { isSnap } from 'backend/constants/environment'
import { appFolder, toolsPath } from 'backend/constants/paths'
import { join } from 'path'
import { env } from 'process'

export const legendaryConfigPath = isSnap
  ? join(env.XDG_CONFIG_HOME!, 'legendary')
  : join(appFolder, 'legendaryConfig', 'legendary')
export const legendaryUserInfo = join(legendaryConfigPath, 'user.json')
export const legendaryInstalled = join(legendaryConfigPath, 'installed.json')
export const thirdPartyInstalled = join(
  legendaryConfigPath,
  'third-party-installed.json'
)
export const legendaryMetadata = join(legendaryConfigPath, 'metadata')
export const epicRedistPath = join(toolsPath, 'redist', 'legendary')
