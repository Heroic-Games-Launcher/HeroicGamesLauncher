import { spawnSync } from 'child_process'
import { homedir, platform } from 'os'
import { join, resolve } from 'path'
import Store from 'electron-store'
import { parse } from '@node-steam/vdf'

import { GameConfigVersion, GlobalConfigVersion } from 'common/types'
import { logDebug, LogPrefix } from './logger/logger'
import { createNewLogFileAndClearOldOnces } from './logger/logfile'
import { env } from 'process'
import { app } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { GlobalConfig } from './config'

const configStore = new Store({
  cwd: 'store'
})

const tsStore = new Store({
  cwd: 'store',
  name: 'timestamp'
})

const fontsStore = new Store({
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
const legendaryConfigPath = isLinux
  ? join(configFolder, 'legendary')
  : join(userHome, '.config', 'legendary')
const heroicFolder = join(configFolder, 'heroic')
const heroicConfigPath = join(heroicFolder, 'config.json')
const heroicGamesConfigPath = join(heroicFolder, 'GamesConfig')
const heroicToolsPath = join(heroicFolder, 'tools')
const heroicIconFolder = join(heroicFolder, 'icons')
const runtimePath = join(heroicToolsPath, 'runtimes')
const userInfo = join(legendaryConfigPath, 'user.json')
const heroicInstallPath = join(homedir(), 'Games', 'Heroic')
const heroicDefaultWinePrefix = join(homedir(), 'Games', 'Heroic', 'Prefixes')
const heroicAnticheatDataPath = join(heroicFolder, 'areweanticheatyet.json')
const imagesCachePath = join(heroicFolder, 'images-cache')

const { currentLogFile: currentLogFile, lastLogFile: lastLogFile } =
  createNewLogFileAndClearOldOnces()

const publicDir = resolve(__dirname, '..', app.isPackaged ? '' : '../public')
const icon = fixAsarPath(join(publicDir, 'icon.png'))
const iconDark = fixAsarPath(join(publicDir, 'icon-dark.png'))
const iconLight = fixAsarPath(join(publicDir, 'icon-light.png'))
const installed = join(legendaryConfigPath, 'installed.json')
const legendaryMetadata = join(legendaryConfigPath, 'metadata')
const fallBackImage = 'fallback'
const epicLoginUrl = 'https://legendary.gl/epiclogin'
const gogLoginUrl =
  'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'
const sidInfoUrl =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/issues/42'
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
  const { defaultSteamPath } = await GlobalConfig.get().getSettings()
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
  logDebug('Unable to load Steam Libraries, libraryfolders.vdf not found', {
    prefix: LogPrefix.Backend
  })
  return libraries
}

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}

export {
  currentGameConfigVersion,
  currentGlobalConfigVersion,
  currentLogFile,
  lastLogFile,
  discordLink,
  execOptions,
  fixAsarPath,
  getShell,
  configStore,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  heroicGithubURL,
  heroicIconFolder,
  heroicInstallPath,
  heroicToolsPath,
  heroicDefaultWinePrefix,
  heroicAnticheatDataPath,
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
  gogLoginUrl,
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
  wineprefixFAQ
}
