import { fixPathForAsarUnpack } from 'electron-util'
import { homedir } from 'os'
import { join } from 'path'

const home = homedir()
const legendaryConfigPath = `${home}/.config/legendary`
const heroicFolder = `${home}/.config/heroic/`
const heroicConfigPath = `${heroicFolder}config.json`
const heroicGamesConfigPath = `${heroicFolder}GamesConfig/`
const heroicToolsPath = `${heroicFolder}tools`
const userInfo = `${legendaryConfigPath}/user.json`
const heroicInstallPath = `${home}/Games/Heroic`
const legendaryBin = fixPathForAsarUnpack(join(__dirname, '/bin/legendary'))
const icon = fixPathForAsarUnpack(join(__dirname, '/icon.png'))
const iconDark = fixPathForAsarUnpack(join(__dirname, '/icon-dark.png'))
const iconLight = fixPathForAsarUnpack(join(__dirname, '/icon-light.png'))
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
const shell = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'

export {
  discordLink,
  heroicConfigPath,
  heroicFolder,
  heroicGamesConfigPath,
  heroicGithubURL,
  heroicInstallPath,
  heroicToolsPath,
  home,
  icon,
  iconDark,
  iconLight,
  installed,
  legendaryBin,
  legendaryConfigPath,
  libraryPath,
  loginUrl,
  shell,
  sidInfoUrl,
  supportURL,
  userInfo
}
