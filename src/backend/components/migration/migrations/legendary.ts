import { app } from 'electron'
import { type PathLike } from 'fs'
import { access, cp, mkdir } from 'fs/promises'
import { join } from 'path'

import { isLinux, legendaryConfigPath, userHome } from 'backend/constants'

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
    // Don't overwrite existing configuration
    if (hasHeroicSpecificConfig) return true

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
