import { WineInstallation } from 'common/types'
import * as axios from 'axios'
import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { exec, spawn } from 'child_process'

import { execAsync, getWineFromProton } from './utils'
import { execOptions, heroicToolsPath, userHome } from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import i18next from 'i18next'
import { dirname } from 'path'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'

export const DXVK = {
  getLatest: async () => {
    if (!isOnline()) {
      logWarning('App offline, skipping possible DXVK update.', {
        prefix: LogPrefix.DXVKInstaller
      })
      return
    }

    const tools = [
      {
        name: 'vkd3d',
        url: 'https://api.github.com/repos/bottlesdevs/vkd3d-proton/releases/latest',
        extractCommand: 'tar -xf'
      },
      {
        name: 'dxvk',
        url: 'https://api.github.com/repos/doitsujin/dxvk/releases/latest',
        extractCommand: 'tar -xf'
      }
    ]

    tools.forEach(async (tool) => {
      const {
        data: { assets }
      } = await axios.default.get(tool.url)

      const { name, browser_download_url: downloadUrl } = assets[0]
      const pkg = name.replace('.tar.gz', '').replace('.tar.zst', '')

      const latestVersion = `${heroicToolsPath}/${tool.name}/${name}`
      const pastVersionCheck = `${heroicToolsPath}/${tool.name}/latest_${tool.name}`
      let pastVersion = ''
      if (existsSync(pastVersionCheck)) {
        pastVersion = readFileSync(pastVersionCheck).toString().split('\n')[0]
      }

      if (
        pastVersion === pkg &&
        existsSync(`${heroicToolsPath}/${tool.name}/${pkg}`)
      ) {
        return
      }

      const downloadCommand = `curl -L ${downloadUrl} -o ${latestVersion} --create-dirs`
      const extractCommand = `${tool.extractCommand} ${latestVersion} -C ${heroicToolsPath}/${tool.name}`
      const echoCommand = `echo ${pkg} > ${heroicToolsPath}/${tool.name}/latest_${tool.name}`
      const cleanCommand = `rm ${latestVersion}`

      logInfo([`Updating ${tool.name} to:`, pkg], {
        prefix: LogPrefix.DXVKInstaller
      })

      return execAsync(downloadCommand)
        .then(async () => {
          logInfo(`downloaded ${tool.name}`, {
            prefix: LogPrefix.DXVKInstaller
          })
          logInfo(`extracting ${tool.name}`, {
            prefix: LogPrefix.DXVKInstaller
          })
          exec(echoCommand)
          await execAsync(extractCommand)
            .then(() =>
              logInfo(`extracting ${tool.name} updated!`, {
                prefix: LogPrefix.DXVKInstaller
              })
            )
            .catch((error) => {
              logError([`Extraction of ${tool.name} failed with:`, error], {
                prefix: LogPrefix.DXVKInstaller
              })
            })

          exec(cleanCommand)
        })
        .catch((error) => {
          logWarning([`Error when downloading ${tool.name}`, error], {
            prefix: LogPrefix.DXVKInstaller
          })
          showDialogBoxModalAuto({
            title: i18next.t('box.error.dxvk.title', 'DXVK/VKD3D error'),
            message: i18next.t(
              'box.error.dxvk.message',
              'Error installing DXVK/VKD3D! Check your connection!'
            ),
            type: 'ERROR'
          })
        })
    })
  },

  installRemove: async (
    prefix: string,
    winePath: string,
    tool: 'dxvk' | 'vkd3d',
    action: 'backup' | 'restore'
  ) => {
    const winePrefix = prefix.replace('~', userHome)
    const isValidPrefix = existsSync(`${winePrefix}/.update-timestamp`)

    if (!isValidPrefix) {
      logWarning('DXVK cannot be installed on a Proton or a invalid prefix!', {
        prefix: LogPrefix.DXVKInstaller
      })
      return
    }

    // remove the last part of the path since we need the folder only
    const wineBin = dirname(winePath.replace("'", ''))

    if (!existsSync(`${heroicToolsPath}/${tool}/latest_${tool}`)) {
      logWarning('dxvk not found!', { prefix: LogPrefix.DXVKInstaller })
      await DXVK.getLatest()
    }

    const globalVersion = readFileSync(
      `${heroicToolsPath}/${tool}/latest_${tool}`
    )
      .toString()
      .split('\n')[0]
    const toolPath = `${heroicToolsPath}/${tool}/${globalVersion}`
    const currentVersionCheck = `${winePrefix}/current_${tool}`
    let currentVersion = ''

    if (existsSync(currentVersionCheck)) {
      currentVersion = readFileSync(currentVersionCheck)
        .toString()
        .split('\n')[0]
    }

    const installCommand = `PATH=${wineBin}:$PATH WINEPREFIX='${winePrefix}' bash ${toolPath}/setup*.sh install --symlink`

    if (action === 'restore') {
      logInfo(`Removing ${tool} version information`, {
        prefix: LogPrefix.DXVKInstaller
      })
      const updatedVersionfile = `rm -rf ${currentVersionCheck}`
      const removeCommand = `PATH=${wineBin}:$PATH WINEPREFIX='${winePrefix}' bash ${toolPath}/setup*.sh uninstall --symlink`
      return execAsync(removeCommand, execOptions)
        .then(() => {
          logInfo(`${tool} removed from ${winePrefix}`, {
            prefix: LogPrefix.DXVKInstaller
          })
          return exec(updatedVersionfile)
        })
        .catch((error) => {
          logError(['error when removing DXVK, please try again', error], {
            prefix: LogPrefix.DXVKInstaller
          })
        })
    }

    if (currentVersion === globalVersion) {
      return
    }

    logInfo([`installing ${tool} on...`, prefix], {
      prefix: LogPrefix.DXVKInstaller
    })
    await execAsync(installCommand, { shell: '/bin/bash' })
      .then(() => {
        logInfo(`${tool} installed on ${winePrefix}`, {
          prefix: LogPrefix.DXVKInstaller
        })
        return writeFileSync(currentVersionCheck, globalVersion)
      })
      .catch((error) => {
        logError(
          [
            'error when installing DXVK, please try launching the game again',
            error
          ],
          { prefix: LogPrefix.DXVKInstaller }
        )
      })
  }
}

export const Winetricks = {
  download: async () => {
    const url =
      'https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks'
    const path = `${heroicToolsPath}/winetricks`
    const downloadCommand = `curl -L ${url} -o ${path} --create-dirs`

    if (!isOnline()) {
      return
    }

    return execAsync(downloadCommand)
      .then(() => {
        exec(`chmod +x ${path}`)
        logInfo('Downloaded Winetricks', { prefix: LogPrefix.WineTricks })
      })
      .catch(() => {
        logWarning('Error Downloading Winetricks', {
          prefix: LogPrefix.WineTricks
        })
      })
  },
  run: async (
    wineVersion: WineInstallation,
    baseWinePrefix: string,
    event: Electron.IpcMainInvokeEvent
  ) => {
    return new Promise<void>((resolve) => {
      const winetricks = `${heroicToolsPath}/winetricks`

      const { winePrefix, wineBin } = getWineFromProton(
        wineVersion,
        baseWinePrefix
      )

      const winepath = dirname(wineBin)

      const envs = {
        ...process.env,
        WINEPREFIX: winePrefix,
        PATH: `${winepath}:${process.env.PATH}`
      }

      const executeMessages = [] as string[]
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
      const sendProgress = setInterval(() => {
        if (progressUpdated) {
          event.sender.send('progressOfWinetricks', executeMessages)
          progressUpdated = false
        }
      }, 1000)

      logInfo(
        `Running WINEPREFIX='${winePrefix}' PATH='${winepath}':$PATH ${winetricks} -q`,
        { prefix: LogPrefix.WineTricks }
      )

      const child = spawn(winetricks, ['-q'], { env: envs })

      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (data: string) => {
        logInfo(data, { prefix: LogPrefix.WineTricks })
        appendMessage(data)
      })

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (data: string) => {
        logError(data, { prefix: LogPrefix.WineTricks })
        appendMessage(data)
      })

      child.on('error', (error) => {
        logError(['Winetricks threw Error:', error], {
          prefix: LogPrefix.WineTricks
        })
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
  }
}
