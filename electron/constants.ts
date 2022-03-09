import { homedir, platform } from 'os'
import { join } from 'path'
import Store from 'electron-store'

import { GameConfigVersion, GlobalConfigVersion } from './types'
import {
  createNewLogFileAndClearOldOnces,
  logInfo,
  LogPrefix
} from './logger/logger'
import { env } from 'process'
import { app } from 'electron'
import { existsSync } from 'graceful-fs'

const configStore = new Store({
  cwd: 'store'
})

function getLegendaryBin() {
  const settings = configStore.get('settings') as { altLeg: string }
  const bin =
    settings?.altLeg ||
    `${fixAsarPath(
      join(
        __dirname,
        '/bin/',
        process.platform,
        isWindows ? '/legendary.exe' : '/legendary'
      )
    )}`
  if (bin.includes(' ')) {
    return `"${bin}"`
  }
  logInfo(`Location: ${bin}`, LogPrefix.Legendary)
  return bin
}

function getGOGdlBin() {
  const settings = configStore.get('settings') as { altGogdl: string }
  const bin = fixAsarPath(
    settings?.altGogdl ||
      join(
        __dirname,
        '/bin/',
        process.platform,
        isWindows ? '/gogdl.exe' : '/gogdl'
      )
  )
  logInfo(`Location: ${bin}`, LogPrefix.Gog)
  return bin
}

const isMac = platform() === 'darwin'
const isWindows = platform() === 'win32'
const isLinux = platform() == 'linux'
const isFlatpak = Boolean(env.FLATPAK_ID)
const currentGameConfigVersion: GameConfigVersion = 'v0'
const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'

const flatPakHome = env.XDG_DATA_HOME?.replace('/data', '') || homedir()
const home = isFlatpak ? flatPakHome : homedir()
const configFolder = app.getPath('appData')
const legendaryConfigPath = isLinux
  ? join(configFolder, 'legendary')
  : join(home, '.config', 'legendary')
const heroicFolder = join(configFolder, 'heroic')
const heroicConfigPath = join(heroicFolder, 'config.json')
const heroicGamesConfigPath = join(heroicFolder, 'GamesConfig')
const heroicToolsPath = join(heroicFolder, 'tools')
const heroicIconFolder = join(heroicFolder, 'icons')
const userInfo = join(legendaryConfigPath, 'user.json')
const heroicInstallPath = join(homedir(), 'Games', 'Heroic')
const heroicDefaultWinePrefix = join(homedir(), 'Games', 'Heroic', 'Prefixes')

const { currentLogFile: currentLogFile, lastLogFile: lastLogFile } =
  createNewLogFileAndClearOldOnces()

const legendaryBin = getLegendaryBin()
const gogdlBin = getGOGdlBin()

const icon = fixAsarPath(join(__dirname, 'icon.png'))
const iconDark = fixAsarPath(join(__dirname, 'icon-dark.png'))
const iconLight = fixAsarPath(join(__dirname, 'icon-light.png'))
const installed = join(legendaryConfigPath, 'installed.json')
const libraryPath = join(legendaryConfigPath, 'metadata')
const steamCompatFolder: string = getSteamCompatFolder()
const fallBackImage = 'fallback'
const epicLoginUrl =
  'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
const gogLoginUrl =
  'https://auth.gog.com/auth?client_id=46899977096215655&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&response_type=code&layout=galaxy'
const sidInfoUrl =
  'https://github.com/flavioislima/HeroicGamesLauncher/issues/42'
const heroicGithubURL =
  'https://github.com/flavioislima/HeroicGamesLauncher/releases/latest'
const supportURL =
  'https://github.com/flavioislima/HeroicGamesLauncher/blob/main/Support.md'
const discordLink = 'https://discord.gg/rHJ2uqdquK'
const wikiLink =
  'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki'
const weblateUrl = 'https://hosted.weblate.org/projects/heroic-games-launcher'
const kofiPage = 'https://ko-fi.com/heroicgames'
const patreonPage = 'https://www.patreon.com/heroicgameslauncher'

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

function getSteamCompatFolder() {
  if (existsSync(`${home}/.var/app/com.valvesoftware.Steam/.steam/steam`)) {
    return `${home}/.var/app/com.valvesoftware.Steam/.steam/steam`
  }
  return `${home}/.steam/steam`
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
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  heroicGithubURL,
  heroicIconFolder,
  heroicInstallPath,
  heroicToolsPath,
  heroicDefaultWinePrefix,
  home,
  kofiPage,
  icon,
  iconDark,
  iconLight,
  installed,
  isFlatpak,
  isMac,
  isWindows,
  isLinux,
  legendaryBin,
  gogdlBin,
  legendaryConfigPath,
  libraryPath,
  epicLoginUrl,
  gogLoginUrl,
  patreonPage,
  sidInfoUrl,
  supportURL,
  fallBackImage,
  userInfo,
  weblateUrl,
  wikiLink,
  steamCompatFolder
}
