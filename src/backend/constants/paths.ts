import { app } from 'electron'
import { mkdirSync } from 'graceful-fs'
import { homedir } from 'os'
import { join, resolve } from 'path'
import { env } from 'process'
import { dirSync } from 'tmp'
import { resolveXdgHome } from 'common/xdg_store'

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
export const userHome = homedir()

const xdgDataHome = resolveXdgHome(
  env.XDG_DATA_HOME,
  join(userHome, '.local', 'share')
)
const xdgCacheHome = resolveXdgHome(
  env.XDG_CACHE_HOME,
  join(userHome, '.cache')
)
const xdgStateHome = resolveXdgHome(
  env.XDG_STATE_HOME,
  join(userHome, '.local', 'state')
)

export const appFolder = join(configFolder, 'heroic')
const useXdgDirectories =
  process.platform === 'linux' && process.env.CI !== 'e2e'
export const heroicDataPath = useXdgDirectories
  ? join(xdgDataHome, 'heroic')
  : appFolder
export const heroicCachePath = useXdgDirectories
  ? join(xdgCacheHome, 'heroic')
  : appFolder
export const heroicStatePath = useXdgDirectories
  ? join(xdgStateHome, 'Heroic')
  : appFolder

export const legacyUserDataPath = app.getPath('userData')
export const legacyToolsPath = join(appFolder, 'tools')
export const toolsPath = join(heroicDataPath, 'tools')
export const runtimePath = join(toolsPath, 'runtimes')
export const defaultUmuPath = join(runtimePath, 'umu', 'umu_run.py')
export const configPath = join(appFolder, 'config.json')
export const gamesConfigPath = join(appFolder, 'GamesConfig')
export const heroicIconFolder = join(heroicDataPath, 'icons')
export const heroicInstallPath = join(userHome, 'Games', 'Heroic')
export const defaultWinePrefixDir = join(
  userHome,
  'Games',
  'Heroic',
  'Prefixes'
)
export const sharedWinePrefix = join(defaultWinePrefixDir, 'shared')
export const defaultWinePrefix = join(defaultWinePrefixDir, 'default')

export const publicDir = resolve(
  __dirname,
  '..',
  app.isPackaged || process.env.CI === 'e2e' ? '' : '../public'
)

// Built preload scripts live next to the main process bundle
// (`build/preload/`). The webview preload is built from
// `src/webviewPreload/index.ts` — see `electron.vite.config.ts`.
const preloadDir = resolve(__dirname, '..', 'preload')

export const mainPreloadPath = join(preloadDir, 'index.js')

export const fakeEpicExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'EpicGamesLauncher.exe')
)

export const galaxyCommunicationExePath = fixAsarPath(
  join(publicDir, 'bin', 'x64', 'win32', 'GalaxyCommunication.exe')
)

export const webviewPreloadPath = fixAsarPath(
  join('file://', preloadDir, 'webviewPreload.js')
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
