import { app } from 'electron'
import { access, cp, mkdir } from 'fs/promises'
import { join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  heroicDataPath,
  userHome
} from 'backend/constants/paths'
import { legendaryConfigPath } from 'backend/storeManagers/legendary/constants'

import type { PathLike } from 'fs'
import type { Migration } from '..'

const exists = async (path: PathLike) =>
  access(path).then(
    () => true,
    () => false
  )

export class LegendaryGlobalConfigFolderMigration implements Migration {
  identifier = 'legendary-move-global-config-folder'
  async run(): Promise<boolean> {
    const hasHeroicSpecificConfig = await exists(legendaryConfigPath)
    // Do not copy global Legendary data over an existing Heroic profile.
    // On Linux, an older Heroic profile may still be awaiting XDG migration.
    const hasLegacyHeroicConfig =
      isLinux &&
      appFolder !== heroicDataPath &&
      (await exists(join(appFolder, 'legendaryConfig', 'legendary')))
    if (hasHeroicSpecificConfig || hasLegacyHeroicConfig) return true

    const globalLegendaryConfig = isLinux
      ? join(app.getPath('appData'), 'legendary')
      : join(userHome, '.config', 'legendary')

    const hasGlobalConfig = await exists(globalLegendaryConfig)
    // Nothing to migrate
    if (!hasGlobalConfig) return true

    await mkdir(legendaryConfigPath, { recursive: true })
    await cp(globalLegendaryConfig, legendaryConfigPath, { recursive: true })
    return true
  }
}
