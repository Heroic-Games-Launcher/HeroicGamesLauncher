import { spawnSync } from 'child_process'
import { homedir, platform } from 'os'
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

const isMac = platform() === 'darwin'
const isWindows = platform() === 'win32'
const isLinux = platform() === 'linux'
const isSteamDeckGameMode = process.env.XDG_CURRENT_DESKTOP === 'gamescope'
const isCLIFullscreen = process.argv.includes('--fullscreen')
const isCLINoGui = process.argv.includes('--no-gui')
const isFlatpak = Boolean(env.FLATPAK_ID)
const currentGameConfigVersion: GameConfigVersion = 'v0'
const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

const flatPakHome = env.XDG_DATA_HOME?.replace('/data', '') || homedir()
const userHome = homedir()
const configFolder = app.getPath('appData')
const appFolder = join(configFolder, 'heroic')
const legendaryConfigPath = join(appFolder, 'legendaryConfig', 'legendary')
const nileConfigPath = join(appFolder, 'nile_config', 'nile')
const configPath = join(appFolder, 'config.json')
const gamesConfigPath = join(appFolder, 'GamesConfig')
const toolsPath = join(appFolder, 'tools')
const heroicIconFolder = join(appFolder, 'icons')
const runtimePath = join(toolsPath, 'runtimes')
const userInfo = join(legendaryConfigPath, 'user.json')
const heroicInstallPath = join(homedir(), 'Games', 'Heroic')
const defaultWinePrefixDir = join(homedir(), 'Games', 'Heroic', 'Prefixes')
const defaultWinePrefix = join(defaultWinePrefixDir, 'default')
const anticheatDataPath = join(appFolder, 'areweanticheatyet.json')
const imagesCachePath = join(appFolder, 'images-cache')
const cachedUbisoftInstallerPath = join(
  appFolder,
  'tools',
  'UbisoftConnectInstaller.exe'
)

const {
  currentLogFile,
  lastLogFile,
  legendaryLogFile,
  gogdlLogFile,
  nileLogFile
} = createNewLogFileAndClearOldOnes()

const publicDir = resolve(__dirname, '..', app.isPackaged ? '' : '../public')
const gogdlAuthConfig = join(app.getPath('userData'), 'gog_store', 'auth.json')
const vulkanHelperBin = fixAsarPath(
  join(publicDir, 'bin', process.platform, 'vulkan-helper')
)
const icon = fixAsarPath(join(publicDir, 'icon.png'))
const iconDark = fixAsarPath(join(publicDir, 'icon-dark.png'))
const iconLight = fixAsarPath(join(publicDir, 'icon-light.png'))
const installed = join(legendaryConfigPath, 'installed.json')
const legendaryMetadata = join(legendaryConfigPath, 'metadata')
const nileInstalled = join(nileConfigPath, 'installed.json')
const nileLibrary = join(nileConfigPath, 'library.json')
const nileUserData = join(nileConfigPath, 'user.json')
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
    const defaultWinPath = join(process.env['PROGRAMFILES(X86)'] ?? '', 'Steam')
    return defaultWinPath
  } else if (isMac) {
    return join(userHome, 'Library/Application Support/Steam')
  } else {
    const flatpakSteamPath = join(
      userHome,
      '.var/app/com.valvesoftware.Steam/.steam/steam'
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
    return join(userHome, '.steam/steam')
  }
}

export async function getSteamLibraries(): Promise<string[]> {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  const path = defaultSteamPath.replaceAll("'", '')
  const vdfFile = join(path, 'steamapps', 'libraryfolders.vdf')
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
  necessaryFoldersByPlatform[platform()].forEach((folder: string) => {
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
  isCLIFullscreen,
  isCLINoGui,
  publicDir,
  GITHUB_API,
  wineprefixFAQ,
  customThemesWikiLink,
  cachedUbisoftInstallerPath,
  gogdlAuthConfig,
  vulkanHelperBin,
  nileConfigPath,
  nileInstalled,
  nileLibrary,
  nileUserData
}
