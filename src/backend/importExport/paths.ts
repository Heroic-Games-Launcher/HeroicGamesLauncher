import { join } from 'path'
import { existsSync } from 'graceful-fs'
import { app } from 'electron'

import { appFolder, configPath, gamesConfigPath } from 'backend/constants/paths'
import { GlobalConfig } from 'backend/config'

const userData = () => app.getPath('userData')

const storeDir = () => join(userData(), 'store')

export const sourcePaths = {
  appFolder: () => appFolder,
  globalConfig: () => configPath,
  gamesConfigDir: () => gamesConfigPath,
  // Keep the legacy directory available for older backups.
  fixesDir: () => join(appFolder, 'fixes'),
  customThemesDir: () => {
    const { customThemesPath } = GlobalConfig.get().getSettings()
    return customThemesPath && existsSync(customThemesPath)
      ? customThemesPath
      : undefined
  },
  wine: {
    infoStore: () => join(storeDir(), 'wine-downloader-info.json')
  }
}
