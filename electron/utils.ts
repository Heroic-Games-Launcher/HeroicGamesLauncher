import * as axios from 'axios'
import { app, dialog, net, shell } from 'electron'
import { exec } from 'child_process'
import { existsSync, stat } from 'graceful-fs'
import { promisify } from 'util'
import i18next from 'i18next'
import prettyBytes from 'pretty-bytes'
import si from 'systeminformation'

import { GlobalConfig } from './config'
import { heroicGamesConfigPath, icon, legendaryBin } from './constants'
import { logError, logInfo, logWarning } from './logger'

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
    return 'invalid'
  }
}

async function checkForUpdates() {
  const { checkForUpdatesOnStartup } = await GlobalConfig.get().getSettings()
  logInfo('checking for heroic updates')
  if (!checkForUpdatesOnStartup) {
    logInfo('skipping heroic updates')
    return
  }
  if (!(await isOnline())) {
    logWarning('Version check failed, app is offline.')
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
    logError('Could not check for new version of heroic')
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: `${app.getVersion()} Caesar Clown`,
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
  const heroicVersion = app.getVersion()
  const legendaryVersion = await getLegendaryVersion()

  // get CPU and RAM info
  const { manufacturer, brand, speed, governor } = await si.cpu()
  const { total, available } = await si.mem()

  // get OS information
  const { distro, kernel, arch } = await si.osInfo()

  // get GPU information
  const { controllers } = await si.graphics()
  const graphicsCards = controllers.map(
    ({ name, model, vram, driverVersion }, i) =>
      `GPU${i}: ${name ? name : model} VRAM: ${vram}MB DRIVER: ${
        driverVersion ?? ''
      } \n`
  )

  return `
  Heroic Version: ${heroicVersion}
  Legendary Version: ${legendaryVersion}
  OS: ${distro} KERNEL: ${kernel} ARCH: ${arch}
  CPU: ${manufacturer} ${brand} @${speed} ${
    governor ? `GOVERNOR: ${governor}` : ''
  }
  RAM: Total: ${prettyBytes(total)} Available: ${prettyBytes(available)}
  GRAPHICS: ${graphicsCards}
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
          logError(noSpaceMsg)
          return showErrorBox(
            i18next.t('box.error.diskspace.title', 'No Space'),
            i18next.t(
              'box.error.diskspace.message',
              'Not enough available disk space'
            )
          )
        }
      })
      .catch(() => logInfo('operation interrupted'))
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
  const regexp = new RegExp('[:|/|*|?|<|>|\\|&|{|}|%|$|@|`|!|+]')
  return text.replaceAll(regexp, '')
}

async function openUrlOrFile(url: string): Promise<string> {
  if (process.platform === 'darwin') {
    try {
      await execAsync(`open ${url}`)
    } catch (error) {
      dialog.showErrorBox(
        i18next.t('box.error.log.title', 'Log Not Found'),
        i18next.t('box.error.log.message', 'No Log was found for this game')
      )
    }
  }
  if (process.platform === 'linux') {
    try {
      await execAsync(`xdg-open '${url}'`)
    } catch (error) {
      dialog.showErrorBox(
        i18next.t('box.error.log.title', 'Log Not Found'),
        i18next.t('box.error.log.message', 'No Log was found for this game')
      )
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
        logInfo(`Command '${command}' found. Version: '${commandVersion}'`)
        if (!all_fullfil) {
          return true
        }
        found = true
      } else {
        logWarning(
          `Command ${command} version '${commandVersion}' not supported.`
        )
        if (all_fullfil) {
          return false
        }
      }
    } catch {
      logWarning(`${command} command not found`)
      if (all_fullfil) {
        return false
      }
    }
  }
  return found
}

export {
  checkCommandVersion,
  checkForUpdates,
  errorHandler,
  execAsync,
  genericErrorMessage,
  handleExit,
  isOnline,
  openUrlOrFile,
  semverGt,
  showAboutWindow,
  statAsync,
  removeSpecialcharacters
}
