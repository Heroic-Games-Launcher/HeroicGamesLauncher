import { app } from 'electron'
import { mkdirSync } from 'graceful-fs'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { env } from 'process'
import { dirSync } from 'tmp'
import { isSnap } from './environment'

let configFolder = app.getPath('appData')
// If we're running tests, we want a config folder independent of the normal
// user configuration
if (process.env.CI === 'e2e') {
  const temp_dir = dirSync({ unsafeCleanup: true })
  console.log(
    `CI is set to "e2e", storing Heroic config files in ${temp_dir.name}`
  )
  configFolder = temp_dir.name
  mkdirSync(join(configFolder, 'heroic'))
}

export const flatpakHome = env.XDG_DATA_HOME?.replace('/data', '') || homedir()
export const userHome = isSnap ? env.SNAP_REAL_HOME! : homedir()

// general `heroic` folder for shared elements like anticheat data or downloaded tools
export const appFolder = join(configFolder, 'heroic')
// profile-specific subfolder for isolated data like configurations, installed games, etc
export const profileFolder = env.HEROIC_PROFILE
  ? join(configFolder, 'heroic', env.HEROIC_PROFILE)
  : appFolder
// this is used by gog to store it's user_auth.json file
export const userDataPath = env.HEROIC_PROFILE
  ? join(app.getPath('userData'), env.HEROIC_PROFILE)
  : app.getPath('userData')

export const toolsPath = join(appFolder, 'tools')
export const runtimePath = join(toolsPath, 'runtimes')
export const defaultUmuPath = join(runtimePath, 'umu', 'umu_run.py')
export const configPath = join(profileFolder, 'config.json')
export const gamesConfigPath = join(profileFolder, 'GamesConfig')
export const heroicIconFolder = join(appFolder, 'icons')
export const heroicInstallPath = join(userHome, 'Games', 'Heroic')
const defaultWinePrefixDir = join(userHome, 'Games', 'Heroic', 'Prefixes')
export const defaultWinePrefix = join(defaultWinePrefixDir, 'default')
export const fixesPath = join(appFolder, 'fixes')

export const publicDir = resolve(
  __dirname,
  '..',
  app.isPackaged || process.env.CI === 'e2e' ? '' : '../public'
)

export const fakeEpicExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'EpicGamesLauncher.exe')
)

export const galaxyCommunicationExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'GalaxyCommunication.exe')
)

export const webviewPreloadPath = fixAsarPath(
  join('file://', publicDir, 'webviewPreload.js')
)

/**
 * Fix path for packed files with asar, else will do nothing.
 * @param origin  original path
 * @returns fixed path
 */
export function fixAsarPath(origin: string): string {
  if (!origin.includes('app.asar.unpacked')) {
    return origin.replace('app.asar', 'app.asar.unpacked')
  }
  return origin
}

export const windowIcon = fixAsarPath(join(publicDir, 'icon.png'))
