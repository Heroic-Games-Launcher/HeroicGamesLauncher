import { join } from 'path'
import { existsSync } from 'graceful-fs'
import { app } from 'electron'

import {
  appFolder,
  configPath,
  fixesPath,
  gamesConfigPath
} from 'backend/constants/paths'
import {
  legendaryConfigPath,
  legendaryInstalled,
  legendaryMetadata,
  legendaryUserInfo,
  thirdPartyInstalled
} from 'backend/storeManagers/legendary/constants'
import {
  nileConfigPath,
  nileInstalled,
  nileLibrary,
  nileUserData
} from 'backend/storeManagers/nile/constants'
import {
  gogConfigPath,
  gogInstalledConfigPath,
  gogdlAuthConfig
} from 'backend/storeManagers/gog/constants'
import { tokenPath, zoomConfigPath } from 'backend/storeManagers/zoom/constants'
import { sideloadLibraryPath } from 'backend/storeManagers/sideload/constants'
import { GlobalConfig } from 'backend/config'

const userData = () => app.getPath('userData')

const storeCacheDir = () => join(userData(), 'store_cache')
const storeDir = () => join(userData(), 'store')

export const sourcePaths = {
  appFolder: () => appFolder,
  globalConfig: () => configPath,
  gamesConfigDir: () => gamesConfigPath,
  fixesDir: () => fixesPath,
  customThemesDir: () => {
    const { customThemesPath } = GlobalConfig.get().getSettings()
    return customThemesPath && existsSync(customThemesPath)
      ? customThemesPath
      : undefined
  },
  legendary: {
    configDir: () => legendaryConfigPath,
    user: () => legendaryUserInfo,
    installed: () => legendaryInstalled,
    thirdPartyInstalled: () => thirdPartyInstalled,
    metadataDir: () => legendaryMetadata
  },
  nile: {
    configDir: () => nileConfigPath,
    user: () => nileUserData,
    installed: () => nileInstalled,
    library: () => nileLibrary
  },
  gog: {
    configFile: () => gogConfigPath,
    authFile: () => gogdlAuthConfig,
    installedFile: () => gogInstalledConfigPath
  },
  zoom: {
    configFile: () => zoomConfigPath,
    tokenFile: () => tokenPath
  },
  libraryCache: {
    legendary: () => join(storeCacheDir(), 'legendary_library.json'),
    gog: () => join(storeCacheDir(), 'gog_library.json'),
    nile: () => join(storeCacheDir(), 'nile_library.json'),
    zoom: () => join(storeCacheDir(), 'zoom_library.json')
  },
  sideload: {
    library: () => sideloadLibraryPath
  },
  wine: {
    infoStore: () => join(storeDir(), 'wine-downloader-info.json')
  }
}
