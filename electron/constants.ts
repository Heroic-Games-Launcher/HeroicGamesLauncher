import { GlobalConfig } from './config'
import { homedir, platform } from 'os'
import { join } from 'path'

import { GameConfigVersion, GlobalConfigVersion } from './types'

function getLegendaryBin() {
  const bin =
    GlobalConfig?.get()?.config?.altLegendaryBin ??
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
  return bin
}

const isMac = platform() === 'darwin'
const isWindows = platform() === 'win32'
const currentGameConfigVersion: GameConfigVersion = 'v0'
const currentGlobalConfigVersion: GlobalConfigVersion = 'v0'
const home = homedir()
const legendaryConfigPath = `${home}/.config/legendary`
const heroicFolder = `${home}/.config/heroic/`
const heroicConfigPath = `${heroicFolder}config.json`
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const heroicToolsPath = `${heroicFolder}tools`
const heroicIconFolder = `${heroicFolder}icons`
const userInfo = `${legendaryConfigPath}/user.json`
const heroicInstallPath = isWindows
  ? `${home}\\Games\\Heroic`
  : `${home}/Games/Heroic`
const legendaryBin = getLegendaryBin()
const icon = fixAsarPath(join(__dirname, '/icon.png'))
const iconDark = fixAsarPath(join(__dirname, '/icon-dark.png'))
const iconLight = fixAsarPath(join(__dirname, '/icon-light.png'))
const installed = `${legendaryConfigPath}/installed.json`
const libraryPath = `${legendaryConfigPath}/metadata/`
const loginUrl =
  'https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect'
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

const MAX_BUFFER = 25 * 1024 * 1024 // 25MB should be safe enough for big installations even on really slow internet

const execOptions = {
  maxBuffer: MAX_BUFFER,
  shell: getShell()
}

export {
  currentGameConfigVersion,
  currentGlobalConfigVersion,
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
  home,
  kofiPage,
  icon,
  iconDark,
  iconLight,
  installed,
  isMac,
  isWindows,
  legendaryBin,
  legendaryConfigPath,
  libraryPath,
  loginUrl,
  patreonPage,
  sidInfoUrl,
  supportURL,
  userInfo,
  weblateUrl,
  wikiLink
}
