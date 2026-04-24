import type { HeroicBackupStageId } from './types'

export const BACKUP_FORMAT_VERSION = 1

export const BACKUP_STAGE_IDS: readonly HeroicBackupStageId[] = [
  'globalSettings',
  'perGameSettings',
  'credentials',
  'libraryCache',
  'wineMetadata',
  'sideloadLibrary'
] as const

export const BACKUP_MANIFEST_FILE = 'manifest.json'

export const BACKUP_PATHS = {
  manifest: BACKUP_MANIFEST_FILE,
  globalSettings: {
    config: 'globalSettings/config.json',
    fixesDir: 'globalSettings/fixes/',
    themesDir: 'globalSettings/themes/'
  },
  perGameSettings: {
    dir: 'perGameSettings/'
  },
  credentials: {
    legendaryUser: 'credentials/legendary/user.json',
    nileUser: 'credentials/nile/user.json',
    gogConfig: 'credentials/gog/config.json',
    gogAuth: 'credentials/gog/auth.json',
    zoomConfig: 'credentials/zoom/config.json',
    zoomToken: 'credentials/zoom/.zoom.token'
  },
  libraryCache: {
    legendaryLibrary: 'libraryCache/legendary_library.json',
    gogLibrary: 'libraryCache/gog_library.json',
    nileLibrary: 'libraryCache/nile_library.json',
    zoomLibrary: 'libraryCache/zoom_library.json',
    legendaryInstalled: 'libraryCache/legendary/installed.json',
    legendaryThirdParty: 'libraryCache/legendary/third-party-installed.json',
    legendaryMetadataDir: 'libraryCache/legendary/metadata/',
    gogInstalled: 'libraryCache/gog/installed.json',
    nileInstalled: 'libraryCache/nile/installed.json',
    nileLibraryFile: 'libraryCache/nile/library.json'
  },
  sideloadLibrary: {
    library: 'sideloadLibrary/library.json'
  },
  wineMetadata: {
    store: 'wineMetadata/wine-downloader-info.json'
  }
} as const
