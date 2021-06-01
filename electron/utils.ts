import * as axios from 'axios';
import {
  app,
  dialog,
  net,
  shell
} from 'electron';
import { exec } from 'child_process';
import {
  existsSync,
  stat
} from 'graceful-fs';
import { promisify } from 'util';
import i18next from 'i18next';

import {
  heroicGamesConfigPath,
  icon,
  isWindows
} from './constants';

const execAsync = promisify(exec)
const statAsync = promisify(stat)

const { showErrorBox, showMessageBox } = dialog

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
    const newVersion = tag_name.replace('v', '').replaceAll('.', '')
    const currentVersion = app.getVersion().replaceAll('.', '')

    return newVersion > currentVersion
  } catch (error) {
    console.log('Could not check for new version of heroic')
  }
}

const showAboutWindow = () => {
  app.setAboutPanelOptions({
    applicationName: 'Heroic Games Launcher',
    applicationVersion: `${app.getVersion()} Moria`,
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

async function errorHandler(logPath: string): Promise<void> {
  const noSpaceMsg = 'Not enough available disk space'
  return execAsync(`tail ${logPath} | grep 'disk space'`)
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
      return genericErrorMessage()
    })
    .catch(() => console.log('operation interrupted'))
}

function genericErrorMessage(): void {
  return showErrorBox(
    i18next.t('box.error.generic.title', 'Unknown Error'),
    i18next.t('box.error.generic.message', 'An Unknown Error has occurred')
  )
}

function openUrlOrFile(url: string): Promise<string> {
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
  showAboutWindow,
  statAsync
};
