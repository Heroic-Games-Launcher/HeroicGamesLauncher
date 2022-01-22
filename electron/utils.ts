import * as axios from 'axios'
import { app, dialog, net, shell } from 'electron'
import { exec } from 'child_process'
import { existsSync, rm, stat } from 'graceful-fs'
import { promisify } from 'util'
import i18next from 'i18next'
import prettyBytes from 'pretty-bytes'
import si from 'systeminformation'
import Store from 'electron-store'

import { GlobalConfig } from './config'
import { heroicGamesConfigPath, home, icon, legendaryBin } from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

const { showErrorBox, showMessageBox } = dialog

/**
 * Compares 2 SemVer strings following "major.minor.patch".
 * Checks if target is newer than base.
 */
function semverGt(target: string, base: string) {
  const [bmajor, bminor, bpatch] = base.split('.').map(Number)
  const [tmajor, tminor, tpatch] = target.split('.').map(Number)

  let isGE = false
  // A pretty nice piece of logic if you ask me. :P
  isGE ||= tmajor > bmajor
  isGE ||= tmajor === bmajor && tminor > bminor
  isGE ||= tmajor === bmajor && tminor === bminor && tpatch > bpatch
  return isGE
}

async function isOnline() {
  return net.isOnline()
}

async function isEpicOffline() {
  const epicStatusApi = 'https://status.epicgames.com/api/v2/status.json'
  const { data } = await axios.default.get(epicStatusApi)
  const {
    status: { indicator }
  } = data
  return indicator === 'major'
}

export const getLegendaryVersion = async () => {
  const { altLegendaryBin } = await GlobalConfig.get().getSettings()
  try {
    if (altLegendaryBin && !altLegendaryBin.includes('legendary')) {
      return 'invalid'
    }
    const { stdout } = await execAsync(`${legendaryBin} --version`)
    return stdout
      .split('legendary version')[1]
      .replaceAll('"', '')
      .replaceAll(', codename', '')
      .replaceAll('\n', '')
  } catch (error) {
    logError(`${error}`, LogPrefix.Legendary)
    return 'invalid'
  }
}

export const getHeroicVersion = () => {
  const VERSION_NUMBER = app.getVersion()
  const BETA_VERSION_NAME = 'Caesar Clown'
  const STABLE_VERSION_NAME = 'Roronoa Zoro'
  const isBetaorAlpha =
    VERSION_NUMBER.includes('alpha') || VERSION_NUMBER.includes('beta')
  const VERSION_NAME = isBetaorAlpha ? BETA_VERSION_NAME : STABLE_VERSION_NAME

  return `${VERSION_NUMBER} ${VERSION_NAME}`
}

async function checkForUpdates() {
  const { checkForUpdatesOnStartup } = await GlobalConfig.get().getSettings()
  logInfo('checking for heroic updates', LogPrefix.Backend)
  if (!checkForUpdatesOnStartup) {
    logInfo('skipping heroic updates', LogPrefix.Backend)
    return
  }
  if (!(await isOnline())) {
    logWarning('Version check failed, app is offline.', LogPrefix.Backend)
    return false
  }
  try {
    const {
      data: { tag_name }
    } = await axios.default.get(
      'https://api.github.com/repos/flavioislima/HeroicGamesLauncher/releases/latest'
    )
    const newVersion = tag_name.replace('v', '')
    const currentVersion = app.getVersion()
    return semverGt(newVersion, currentVersion)
  } catch (error) {
    logError('Could not check for new version of heroic', LogPrefix.Backend)
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: getHeroicVersion(),
    copyright: 'GPL V3',
    iconPath: icon,
    website: 'https://heroicgameslauncher.com'
  })
  return app.showAboutPanel()
}

const handleExit = async () => {
  const isLocked = existsSync(`${heroicGamesConfigPath}/lock`)

  if (isLocked) {
    const { response } = await showMessageBox({
      buttons: [i18next.t('box.no'), i18next.t('box.yes')],
      message: i18next.t(
        'box.quit.message',
        'There are pending operations, are you sure?'
      ),
      title: i18next.t('box.quit.title', 'Exit')
    })

    if (response === 0) {
      return
    }
    return app.exit()
  }
  app.exit()
}

export const getSystemInfo = async () => {
  const heroicVersion = getHeroicVersion()
  const legendaryVersion = await getLegendaryVersion()

  // get CPU and RAM info
  const { manufacturer, brand, speed, governor } = await si.cpu()
  const { total, available } = await si.mem()

  // get OS information
  const { distro, kernel, arch, platform } = await si.osInfo()

  // get GPU information
  const { controllers } = await si.graphics()
  const graphicsCards = String(
    controllers.map(
      ({ name, model, vram, driverVersion }, i) =>
        `GPU${i}: ${name ? name : model} VRAM: ${vram}MB DRIVER: ${
          driverVersion ?? ''
        } \n`
    )
  )
    .replaceAll(',', '')
    .replaceAll('\n', '')

  const isLinux = platform === 'linux'
  const xEnv = isLinux
    ? (await execAsync('echo $XDG_SESSION_TYPE')).stdout.replaceAll('\n', '')
    : ''

  return `
  Heroic Version: ${heroicVersion}
  Legendary Version: ${legendaryVersion}
  OS: ${distro} KERNEL: ${kernel} ARCH: ${arch}
  CPU: ${manufacturer} ${brand} @${speed} ${
    governor ? `GOVERNOR: ${governor}` : ''
  }
  RAM: Total: ${prettyBytes(total)} Available: ${prettyBytes(available)}
  GRAPHICS: ${graphicsCards}
  ${isLinux ? `PROTOCOL: ${xEnv}` : ''}
  `
}

type ErrorHandlerMessage = {
  error?: { stderr: string; stdout: string }
  logPath?: string
}

async function errorHandler({
  error,
  logPath
}: ErrorHandlerMessage): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  const noCredentialsError = 'No saved credentials'
  if (logPath) {
    execAsync(`tail ${logPath} | grep 'disk space'`)
      .then(({ stdout }) => {
        if (stdout.includes(noSpaceMsg)) {
          logError(noSpaceMsg, LogPrefix.Backend)
          return showErrorBox(
            i18next.t('box.error.diskspace.title', 'No Space'),
            i18next.t(
              'box.error.diskspace.message',
              'Not enough available disk space'
            )
          )
        }
      })
      .catch(() => logInfo('operation interrupted', LogPrefix.Backend))
  }
  if (error) {
    if (error.stderr.includes(noCredentialsError)) {
      return showErrorBox(
        i18next.t('box.error.credentials.title', 'Expired Credentials'),
        i18next.t(
          'box.error.credentials.message',
          'Your Crendentials have expired, Logout and Login Again!'
        )
      )
    }
  }
}

function genericErrorMessage(): void {
  return showErrorBox(
    i18next.t('box.error.generic.title', 'Unknown Error'),
    i18next.t('box.error.generic.message', 'An Unknown Error has occurred')
  )
}

function removeSpecialcharacters(text: string): string {
  const regexp = new RegExp('[:|/|*|?|<|>|\\|&|{|}|%|$|@|`|!|™|+]', 'gi')
  return text.replaceAll(regexp, '')
}

async function openUrlOrFile(url: string): Promise<string | void> {
  if (process.platform === 'darwin') {
    try {
      await execAsync(`open ${url}`)
    } catch (error) {
      dialog.showErrorBox(
        i18next.t('box.error.log.title', 'Log Not Found'),
        i18next.t('box.error.log.message', 'No Log was found for this game')
      )
      return
    }
  }
  if (process.platform === 'linux') {
    try {
      const fixedURL = url.replace('~', home)
      await execAsync(`xdg-open '${fixedURL}'`)
    } catch (error) {
      dialog.showErrorBox(
        i18next.t('box.error.log.title', 'Log Not Found'),
        i18next.t('box.error.log.message', 'No Log was found for this game')
      )
      return
    }
  }
  return shell.openPath(url)
}

/**
 * Checks given commands if they fullfil the given minimum version requirement.
 * @param commands      string list of commands to check.
 * @param version       minimum version to check against
 * @param all_fullfil   Can be set to false if only one command should fullfil
 *                      version requirement. (default: true)
 * @returns true if verrsion fullfil, else false
 */
async function checkCommandVersion(
  commands: string[],
  version: string,
  all_fullfil = true
): Promise<boolean> {
  let found = false
  for (const command of commands) {
    try {
      const { stdout } = await execAsync(command + ' --version')
      const commandVersion = stdout
        ? stdout.match(/(\d+\.)(\d+\.)(\d+)/g)[0]
        : null

      if (semverGt(commandVersion, version) || commandVersion === version) {
        logInfo(
          `Command '${command}' found. Version: '${commandVersion}'`,
          LogPrefix.Backend
        )
        if (!all_fullfil) {
          return true
        }
        found = true
      } else {
        logWarning(
          `Command ${command} version '${commandVersion}' not supported.`,
          LogPrefix.Backend
        )
        if (all_fullfil) {
          return false
        }
      }
    } catch {
      logWarning(`${command} command not found`, LogPrefix.Backend)
      if (all_fullfil) {
        return false
      }
    }
  }
  return found
}

function clearCache() {
  const installCache = new Store({
    cwd: 'lib-cache',
    name: 'installInfo'
  })
  const libraryCache = new Store({
    cwd: 'lib-cache',
    name: 'library'
  })
  const gameInfoCache = new Store({
    cwd: 'lib-cache',
    name: 'gameinfo'
  })
  installCache.clear()
  libraryCache.clear()
  gameInfoCache.clear()
}

function resetHeroic() {
  const heroicFolder = `${app.getPath('appData')}/heroic`
  rm(heroicFolder, { recursive: true, force: true }, () => {
    app.relaunch()
    app.quit()
  })
}

export {
  checkCommandVersion,
  checkForUpdates,
  errorHandler,
  execAsync,
  genericErrorMessage,
  handleExit,
  isOnline,
  isEpicOffline,
  openUrlOrFile,
  semverGt,
  showAboutWindow,
  statAsync,
  removeSpecialcharacters,
  clearCache,
  resetHeroic
}
