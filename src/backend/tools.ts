import { WineInstallation } from 'common/types'
import axios from 'axios'
import { existsSync, writeFileSync } from 'graceful-fs'
import { spawn } from 'child_process'

import { execAsync, getWineFromProton } from './utils'
import { execOptions, heroicToolsPath, isMac, isWindows } from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import i18next from 'i18next'
import { dirname, join } from 'path'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { validWine } from './launcher'
import { chmod } from 'fs/promises'

export const Winetricks = {
  download: async () => {
    if (isWindows) {
      return
    }

    const linuxUrl =
      'https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks'
    const macUrl =
      'https://raw.githubusercontent.com/The-Wineskin-Project/winetricks/macOS/src/winetricks'
    const url = isMac ? macUrl : linuxUrl
    const path = `${heroicToolsPath}/winetricks`

    if (!isOnline()) {
      return
    }

    try {
      logInfo('Downloading Winetricks', LogPrefix.WineTricks)
      const res = await axios.get(url, { timeout: 1000 })
      const file = res.data
      writeFileSync(path, file)
      await chmod(path, 0o755)
      return
    } catch (error) {
      return logWarning(
        ['Error Downloading Winetricks', error],
        LogPrefix.WineTricks
      )
    }
  },
  runWithArgs: async (
    wineVersion: WineInstallation,
    baseWinePrefix: string,
    args: string[],
    event?: Electron.IpcMainInvokeEvent
  ) => {
    if (!(await validWine(wineVersion))) {
      return
    }
    const winetricks = `${heroicToolsPath}/winetricks`

    if (!existsSync(winetricks)) {
      await Winetricks.download()
    }

    return new Promise<void>((resolve) => {
      const { winePrefix, wineBin } = getWineFromProton(
        wineVersion,
        baseWinePrefix
      )

      const winepath = dirname(wineBin)

      const linuxEnvs = {
        ...process.env,
        WINEPREFIX: winePrefix,
        PATH: `${winepath}:${process.env.PATH}`
      }

      const wineServer = join(winepath, 'wineserver')

      const macEnvs = {
        ...process.env,
        WINEPREFIX: winePrefix,
        WINESERVER: wineServer,
        WINE: wineBin,
        WINE64: wineBin,
        PATH: `/opt/homebrew/bin:${process.env.PATH}`
      }

      const envs = isMac ? macEnvs : linuxEnvs

      const executeMessages: string[] = []
      let progressUpdated = false
      const appendMessage = (message: string) => {
        // Don't store more than 100 messages, to not
        // fill the storage and make render still fast
        if (executeMessages.length > 100) {
          executeMessages.shift()
        }
        executeMessages.push(message)
        progressUpdated = true
      }
      const sendProgress =
        event &&
        setInterval(() => {
          if (progressUpdated) {
            event.sender.send('progressOfWinetricks', executeMessages)
            progressUpdated = false
          }
        }, 1000)

      // check if winetricks dependencies are installed
      const dependencies = ['7z', 'cabextract', 'zenity', 'unzip', 'curl']
      dependencies.forEach(async (dependency) => {
        try {
          await execAsync(`which ${dependency}`, { ...execOptions, env: envs })
        } catch (error) {
          appendMessage(
            `${dependency} not installed! Winetricks might fail to install some packages or even open`
          )
          logWarning(
            [
              `${dependency} not installed! Winetricks might fail to install some packages or even open`
            ],
            LogPrefix.WineTricks
          )
        }
      })

      logInfo(
        `Running WINEPREFIX='${winePrefix}' PATH='${winepath}':$PATH ${winetricks} --force -q`,
        LogPrefix.WineTricks
      )

      const child = spawn(winetricks, args, { env: envs })

      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (data: string) => {
        logInfo(data, LogPrefix.WineTricks)
        appendMessage(data)
      })

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (data: string) => {
        logError(data, LogPrefix.WineTricks)
        appendMessage(data)
      })

      child.on('error', (error) => {
        logError(['Winetricks threw Error:', error], LogPrefix.WineTricks)
        showDialogBoxModalAuto({
          event,
          title: i18next.t('box.error.winetricks.title', 'Winetricks error'),
          message: i18next.t('box.error.winetricks.message', {
            defaultValue:
              'Winetricks returned the following error during execution:{{newLine}}{{error}}',
            newLine: '\n',
            error: `${error}`
          }),
          type: 'ERROR'
        })
        clearInterval(sendProgress)
        resolve()
      })

      child.on('exit', () => {
        clearInterval(sendProgress)
        resolve()
      })

      child.on('close', () => {
        clearInterval(sendProgress)
        resolve()
      })
    })
  },
  run: async (
    wineVersion: WineInstallation,
    baseWinePrefix: string,
    event: Electron.IpcMainInvokeEvent
  ) => {
    await Winetricks.runWithArgs(
      wineVersion,
      baseWinePrefix,
      ['--force', '-q'],
      event
    )
  }
}
