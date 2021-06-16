import * as axios from 'axios'
import {
  app,
  dialog,
  net,
  shell
} from 'electron'
import { exec } from 'child_process'
import {
  existsSync,
  stat
} from 'graceful-fs'
import { promisify } from 'util'
import i18next from 'i18next'

import {
  heroicGamesConfigPath,
  icon,
  isWindows
} from './constants'

const execAsync = promisify(exec)
const statAsync = promisify(stat)

const { showErrorBox, showMessageBox } = dialog

/**
 * Compares 2 SemVer strings following "major.minor.patch".
 * Checks if target is newer than base.
 */
function semverGt(target : string, base : string) {
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

async function checkForUpdates() {
  if (isWindows) {
    return
  }
  if (!(await isOnline())) {
    console.log('Version check failed, app is offline.')
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
    console.log('Could not check for new version of heroic')
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: `${app.getVersion()} Arlong`,
    copyright: 'GPL V3',
    iconPath: icon,
    website: 'https://github.com/flavioislima/HeroicGamesLauncher'
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

type ErrorHandlerMessage = {
  error?: {stderr: string, stdout: string}
  logPath?: string
}

async function errorHandler({error, logPath}: ErrorHandlerMessage): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  const noCredentialsError = 'No saved credentials'
  if (logPath){
    execAsync(`tail ${logPath} | grep 'disk space'`)
      .then(({ stdout }) => {
        if (stdout.includes(noSpaceMsg)) {
          console.log(noSpaceMsg)
          return showErrorBox(
            i18next.t('box.error.diskspace.title', 'No Space'),
            i18next.t(
              'box.error.diskspace.message',
              'Not enough available disk space'
            )
          )
        }
      })
      .catch(() => console.log('operation interrupted'))
  }
  if (error){
    if (error.stderr.includes(noCredentialsError)){
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

async function openUrlOrFile(url: string): Promise<string> {
  if (process.platform === 'darwin'){
    try {
      await execAsync(`open ${url}`)
    } catch (error) {
      dialog.showErrorBox(i18next.t('box.error.log.title', 'Log Not Found'), i18next.t('box.error.log.message', 'No Log was found for this game'))
    }
  }
  if (process.platform === 'linux'){
    try {
      await execAsync(`xdg-open '${url}'`)
    } catch (error) {
      dialog.showErrorBox(i18next.t('box.error.log.title', 'Log Not Found'), i18next.t('box.error.log.message', 'No Log was found for this game'))
    }
  }
  return shell.openPath(url)
}

export {
  checkForUpdates,
  errorHandler,
  execAsync,
  genericErrorMessage,
  handleExit,
  isOnline,
  openUrlOrFile,
  semverGt,
  showAboutWindow,
  statAsync
}
