import { spawnSync } from 'child_process'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { parse } from '@node-steam/vdf'

import { GameConfigVersion, GlobalConfigVersion } from 'common/types'
import { logDebug, LogPrefix } from './logger/logger'
import { createNewLogFileAndClearOldOnes } from './logger/logfile'
import { env } from 'process'
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync } from 'graceful-fs'
import { GlobalConfig } from './config'
import { TypeCheckedStoreBackend } from './electron_store'
import { dirSync } from 'tmp'

const configStore = new TypeCheckedStoreBackend('configStore', {
  cwd: 'store'
})

const tsStore = new TypeCheckedStoreBackend('timestampStore', {
  cwd: 'store',
  name: 'timestamp'
})

const fontsStore = new TypeCheckedStoreBackend('fontsStore', {
  cwd: 'store',
  name: 'fonts'
})

const isMac = process.platform === 'darwin'
const isWindows = process.platform === 'win32'
const isLinux = process.platform === 'linux'
const isSteamDeckGameMode = process.env.XDG_CURRENT_DESKTOP === 'gamescope'
const isCLIFullscreen = process.argv.includes('--fullscreen')
const isCLINoGui = process.argv.includes('--no-gui')
const isFlatpak = Boolean(env.FLATPAK_ID)
const isSnap = Boolean(env.SNAP)
const currentGameConfigVersion: GameConfigVersion = 'v0'
const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

const flatPakHome = env.XDG_DATA_HOME?.replace('/data', '') || homedir()
const userHome = isSnap ? env.SNAP_REAL_HOME! : homedir()

enum PATH_KEYS {
  GOG_STORE = 'gog_store',
  AUTH_JSON = 'auth.json',
  VULKAN_HELPER = 'vulkan-helper',
  ICON_PNG = 'icon.png',
  ICON_DARK_PNG = 'icon-dark.png',
  ICON_LIGHT_PNG = 'icon-light.png',
  INSTALLED_JSON = 'installed.json',
  THIRD_PARTY_INSTALLED_JSON = 'third-party-installed.json',
  METADATA = 'metadata',
  LIBRARY_JSON = 'library.json',
  USER_JSON = 'user.json',
  STEAM = 'Steam',
  LIBRARY__APPLICATION_SUPPORT__STEAM = 'Library/Application Support/Steam',
  VAR_APP__COM__VALVESOFTWARE__STEAM = '.var/app/com.valvesoftware.Steam/.steam/steam',
  STEAM__STEAM = '.steam/steam',
  STEAMAPPS = 'steamapps',
  LIBRARY_FOLDERS__VDF = 'libraryfolders.vdf',
  HEROIC = 'heroic',
  LEGENDARY = 'legendary',
  LEGENDARY_CONFIG = 'legendaryConfig',
  GOGDL_CONFIG = 'gogdlConfig',
  HEROIC_GOGDL = 'heroic_gogdl',
  EPIC = 'epic',
  EPIC_CONFIG = 'epicConfig',
  REDIST = 'redist',
  LEGENDARY_REDIST = 'legendary',
  GOG_REDIST = 'gog',
  EPIC_REDIST = 'epic',
  GOG_SUPPORT = 'gog-support',
  NILE_CONFIG = 'nile_config',
  NILE = 'nile',
  CONFIG_JSON = 'config.json',
  GAMES_CONFIG = 'GamesConfig',
  TOOLS = 'tools',
  GOG = 'gog',
  ICONS = 'icons',
  RUNTIMES = 'runtimes',
  UMU = 'umu',
  UMU_RUN_PY = 'umu_run.py',
  GAMES = 'Games',
  APPDATA = 'appdata',
  USER = 'user',
  PREFIXES = 'Prefixes',
  DEFAULT = 'default',
  AREWEANTICHEATYET_JSON = 'areweanticheatyet.json',
  IMAGES_CACHE = 'images-cache',
  FIXES = 'fixes'
}

let configFolder = app.getPath('appData')
// If we're running tests, we want a config folder independent of the normal
// user configuration
if (process.env.CI === 'e2e') {
  const temp_dir = dirSync({ unsafeCleanup: true })
  logDebug(
    `CI is set to "e2e", storing Heroic config files in ${temp_dir.name}`
  )
  configFolder = temp_dir.name
  mkdirSync(join(configFolder, PATH_KEYS.HEROIC))
}

const appFolder = join(configFolder, PATH_KEYS.HEROIC)
const legendaryConfigPath = isSnap
  ? join(env.XDG_CONFIG_HOME!, PATH_KEYS.LEGENDARY)
  : join(appFolder, PATH_KEYS.LEGENDARY_CONFIG, PATH_KEYS.LEGENDARY)
const gogdlConfigPath = join(
  appFolder,
  PATH_KEYS.GOGDL_CONFIG,
  PATH_KEYS.HEROIC_GOGDL
)
const gogSupportPath = join(gogdlConfigPath, PATH_KEYS.GOG_SUPPORT)
const nileConfigPath = join(appFolder, PATH_KEYS.NILE_CONFIG, PATH_KEYS.NILE)
const configPath = join(appFolder, PATH_KEYS.CONFIG_JSON)
const gamesConfigPath = join(appFolder, PATH_KEYS.GAMES_CONFIG)
const toolsPath = join(appFolder, PATH_KEYS.TOOLS)
const epicRedistPath = join(toolsPath, PATH_KEYS.REDIST, PATH_KEYS.LEGENDARY)
const gogRedistPath = join(toolsPath, PATH_KEYS.REDIST, PATH_KEYS.GOG)
const heroicIconFolder = join(appFolder, PATH_KEYS.ICONS)
const runtimePath = join(toolsPath, PATH_KEYS.RUNTIMES)
const defaultUmuPath = join(runtimePath, PATH_KEYS.UMU, PATH_KEYS.UMU_RUN_PY)
const userInfo = join(legendaryConfigPath, PATH_KEYS.USER_JSON)
const heroicInstallPath = join(userHome, PATH_KEYS.GAMES, 'Heroic')
const defaultWinePrefixDir = join(
  userHome,
  PATH_KEYS.GAMES,
  'Heroic',
  PATH_KEYS.PREFIXES
)
const defaultWinePrefix = join(defaultWinePrefixDir, PATH_KEYS.DEFAULT)
const anticheatDataPath = join(appFolder, PATH_KEYS.AREWEANTICHEATYET_JSON)
const imagesCachePath = join(appFolder, PATH_KEYS.IMAGES_CACHE)
const fixesPath = join(appFolder, PATH_KEYS.FIXES)

const {
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile
} = createNewLogFileAndClearOldOnes()

const publicDir = resolve(
  __dirname,
  '..',
  app.isPackaged || process.env.CI === 'e2e' ? '' : '../public'
)
const gogdlAuthConfig = join(
  app.getPath('userData'),
  PATH_KEYS.GOG_STORE,
  PATH_KEYS.AUTH_JSON
)
const vulkanHelperBin = fixAsarPath(
  join(
    publicDir,
    'bin',
    process.arch,
    process.platform,
    PATH_KEYS.VULKAN_HELPER
  )
)
const icon = fixAsarPath(join(publicDir, PATH_KEYS.ICON_PNG))
const iconDark = fixAsarPath(join(publicDir, PATH_KEYS.ICON_DARK_PNG))
const iconLight = fixAsarPath(join(publicDir, PATH_KEYS.ICON_LIGHT_PNG))
const installed = join(legendaryConfigPath, PATH_KEYS.INSTALLED_JSON)
const thirdPartyInstalled = join(
  legendaryConfigPath,
  PATH_KEYS.THIRD_PARTY_INSTALLED_JSON
)
const legendaryMetadata = join(legendaryConfigPath, PATH_KEYS.METADATA)
const nileInstalled = join(nileConfigPath, PATH_KEYS.INSTALLED_JSON)
const nileLibrary = join(nileConfigPath, PATH_KEYS.LIBRARY_JSON)
const nileUserData = join(nileConfigPath, PATH_KEYS.USER_JSON)
const fallBackImage = 'fallback'
const epicLoginUrl = 'https://legendary.gl/epiclogin'
const sidInfoUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/How-To:-Epic-Alternative-Login'
const heroicGithubURL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases/latest'
const GITHUB_API =
  'https://api.github.com/repos/Heroic-Games-Launcher/HeroicGamesLauncher/releases'
const supportURL =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/blob/main/Support.md'
const discordLink = 'https://discord.gg/rHJ2uqdquK'
const wikiLink =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
const weblateUrl = 'https://hosted.weblate.org/projects/heroic-games-launcher'
const kofiPage = 'https://ko-fi.com/heroicgames'
const patreonPage = 'https://www.patreon.com/heroicgameslauncher'
const wineprefixFAQ = 'https://wiki.winehq.org/FAQ#Wineprefixes'
const customThemesWikiLink =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki/Custom-Themes'

/**
 * Get shell for different os
 * @returns Windows: powershell
 * @returns unix: $SHELL or /usr/bin/bash
 */
function getShell() {
  // Dont change this logic since Heroic will break when using SH or FISH
  switch (process.platform) {
    case 'win32':
      return 'powershell.exe'
    case 'linux':
      return '/bin/bash'
    case 'darwin':
      return '/bin/zsh'
    default:
      return '/bin/bash'
  }
}

/**
 * Fix path for packed files with asar, else will do nothing.
 * @param origin  original path
 * @returns fixed path
 */
function fixAsarPath(origin: string): string {
  if (!origin.includes('app.asar.unpacked')) {
    return origin.replace('app.asar', 'app.asar.unpacked')
  }
  return origin
}

export function getSteamCompatFolder() {
  // Paths are from https://savelocation.net/steam-game-folder
  if (isWindows) {
    const defaultWinPath = join(
      process.env['PROGRAMFILES(X86)'] ?? '',
      PATH_KEYS.STEAM
    )
    return defaultWinPath
  } else if (isMac) {
    return join(userHome, PATH_KEYS.LIBRARY__APPLICATION_SUPPORT__STEAM)
  } else {
    const flatpakSteamPath = join(
      userHome,
      PATH_KEYS.VAR_APP__COM__VALVESOFTWARE__STEAM
    )

    if (existsSync(flatpakSteamPath)) {
      // check if steam is really installed via flatpak
      const { status } = spawnSync('flatpak', [
        'info',
        'com.valvesoftware.Steam'
      ])

      if (status === 0) {
        return flatpakSteamPath
      }
    }
    return join(userHome, PATH_KEYS.STEAM__STEAM)
  }
}

export async function getSteamLibraries(): Promise<string[]> {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  const path = defaultSteamPath.replaceAll("'", '')
  const vdfFile = join(
    path,
    PATH_KEYS.STEAMAPPS,
    PATH_KEYS.LIBRARY_FOLDERS__VDF
  )
  const libraries = ['/usr/share/steam']

  if (existsSync(vdfFile)) {
    const json = parse(readFileSync(vdfFile, 'utf-8'))
    if (!json.libraryfolders) {
      return libraries
    }
    const folders = Object.values(json.libraryfolders) as Array<{
      path: string
    }>
    return [...libraries, ...folders.map((folder) => folder.path)].filter(
      (path) => existsSync(path)
    )
  }
  logDebug(
    'Unable to load Steam Libraries, libraryfolders.vdf not found',
    LogPrefix.Backend
  )
  return libraries
}

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}

const defaultFolders = [gamesConfigPath, heroicIconFolder, imagesCachePath]

const necessaryFoldersByPlatform = {
  win32: [...defaultFolders],
  linux: [...defaultFolders, toolsPath],
  darwin: [...defaultFolders, toolsPath]
}

export function createNecessaryFolders() {
  necessaryFoldersByPlatform[process.platform].forEach((folder: string) => {
    if (!existsSync(folder)) {
      mkdirSync(folder)
    }
  })
}

export {
  currentGameConfigVersion,
  currentGlobalConfigVersion,
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile,
  discordLink,
  execOptions,
  fixAsarPath,
  configStore,
  configPath,
  gamesConfigPath,
  heroicGithubURL,
  heroicIconFolder,
  heroicInstallPath,
  toolsPath,
  defaultWinePrefixDir,
  defaultWinePrefix,
  anticheatDataPath,
  imagesCachePath,
  userHome,
  flatPakHome,
  kofiPage,
  icon,
  iconDark,
  iconLight,
  installed,
  isFlatpak,
  isSnap,
  isMac,
  isWindows,
  isLinux,
  legendaryConfigPath,
  legendaryMetadata,
  epicLoginUrl,
  patreonPage,
  sidInfoUrl,
  supportURL,
  fallBackImage,
  userInfo,
  weblateUrl,
  wikiLink,
  tsStore,
  fontsStore,
  isSteamDeckGameMode,
  runtimePath,
  defaultUmuPath,
  isCLIFullscreen,
  isCLINoGui,
  publicDir,
  GITHUB_API,
  wineprefixFAQ,
  customThemesWikiLink,
  gogdlAuthConfig,
  gogdlConfigPath,
  gogSupportPath,
  gogRedistPath,
  epicRedistPath,
  vulkanHelperBin,
  nileConfigPath,
  nileInstalled,
  nileLibrary,
  nileUserData,
  fixesPath,
  thirdPartyInstalled
}
