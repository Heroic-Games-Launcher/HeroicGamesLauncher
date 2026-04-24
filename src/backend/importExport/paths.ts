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
import { GlobalConfig } from 'backend/config'

const userData = () => app.getPath('userData')

export const storeCacheDir = () => join(userData(), 'store_cache')
export const storeDir = () => join(userData(), 'store')
export const gogStoreDir = () => join(userData(), 'gog_store')
export const nileStoreDir = () => join(userData(), 'nile_store')
export const zoomStoreDir = () => join(userData(), 'zoom_store')
export const sideloadStoreDir = () => join(userData(), 'sideload_apps')

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
    configFile: () => join(gogStoreDir(), 'config.json'),
    installedFile: () => join(gogStoreDir(), 'installed.json')
  },
  zoom: {
    configFile: () => join(zoomStoreDir(), 'config.json')
  },
  libraryCache: {
    legendary: () => join(storeCacheDir(), 'legendary_library.json'),
    gog: () => join(storeCacheDir(), 'gog_library.json'),
    nile: () => join(storeCacheDir(), 'nile_library.json'),
    zoom: () => join(storeCacheDir(), 'zoom_library.json')
  },
  sideload: {
    library: () => join(sideloadStoreDir(), 'library.json')
  },
  wine: {
    infoStore: () => join(storeDir(), 'wine-downloader-info.json')
  }
}
