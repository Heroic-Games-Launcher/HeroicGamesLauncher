import { WineInstallation } from 'common/types'
import axios from 'axios'
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'graceful-fs'
import { exec, spawn } from 'child_process'

import { execAsync, getWineFromProton } from './utils'
import {
  execOptions,
  heroicToolsPath,
  isLinux,
  isMac,
  isWindows,
  userHome
} from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import i18next from 'i18next'
import { dirname } from 'path'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { validWine } from './launcher'

export const DXVK = {
  getLatest: async () => {
    if (isWindows) {
      return
    }
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
      },
      {
        name: 'dxvk-macOS',
        url: 'https://api.github.com/repos/Gcenx/DXVK-macOS/releases/latest',
        extractCommand: 'tar -xf'
      }
    ]

    tools.forEach(async (tool) => {
      if (isMac) {
        if (tool.name !== 'dxvk-macOS') {
          return
        }
      }

      const {
        data: { assets }
      } = await axios.get(tool.url)

      const { name, browser_download_url: downloadUrl } = assets[0]
      const pkg = name.replace('.tar.gz', '').replace('.tar.xz', '')

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

      const downloadCommand = `curl -L ${downloadUrl} -o '${latestVersion}' --create-dirs`
      const extractCommand = `${tool.extractCommand} '${latestVersion}' -C '${heroicToolsPath}/${tool.name}'`
      const echoCommand = `echo ${pkg} > '${heroicToolsPath}/${tool.name}/latest_${tool.name}'`
      const cleanCommand = `rm '${latestVersion}'`

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
              logInfo(`${tool.name} updated!`, {
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
    tool: 'dxvk' | 'vkd3d' | 'dxvk-macOS',
    action: 'backup' | 'restore'
  ): Promise<boolean> => {
    const winePrefix = prefix.replace('~', userHome)
    const isValidPrefix = existsSync(`${winePrefix}/.update-timestamp`)

    if (!isValidPrefix) {
      logWarning('DXVK cannot be installed on a Proton or a invalid prefix!', {
        prefix: LogPrefix.DXVKInstaller
      })
      return false
    }

    tool = isMac ? 'dxvk-macOS' : tool

    // remove the last part of the path since we need the folder only
    const wineBin = winePath.replace("'", '')

    if (!existsSync(`${heroicToolsPath}/${tool}/latest_${tool}`)) {
      logWarning('dxvk not found!', { prefix: LogPrefix.DXVKInstaller })
      await DXVK.getLatest()
    }

    const globalVersion = readFileSync(
      `${heroicToolsPath}/${tool}/latest_${tool}`
    )
      .toString()
      .split('\n')[0]

    const dxvkDlls = ['dxgi', 'd3d11', 'd3d10', 'd3d10_1', 'd3d10core']
    const vkd3dDlls = ['d3d12']
    const dlls = tool.startsWith('dxvk') ? dxvkDlls : vkd3dDlls
    const toolPathx86 = `${heroicToolsPath}/${tool}/${globalVersion}/x86`
    const toolPathx64 = `${heroicToolsPath}/${tool}/${globalVersion}/x64`
    const currentVersionCheck = `${winePrefix}/current_${tool}`
    let currentVersion = ''

    if (existsSync(currentVersionCheck)) {
      currentVersion = readFileSync(currentVersionCheck)
        .toString()
        .split('\n')[0]
    }

    if (action === 'restore') {
      logInfo(`Removing ${tool} version information`, {
        prefix: LogPrefix.DXVKInstaller
      })
      const updatedVersionfile = `rm -rf ${currentVersionCheck}`
      exec(updatedVersionfile)

      logInfo(`Removing ${tool} files`, {
        prefix: LogPrefix.DXVKInstaller
      })

      // remove the dlls from the prefix
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/system32/${dll}.dll`
          if (existsSync(dllPath)) {
            const removeDll = `rm ${dllPath}`
            exec(removeDll)
          }

          const dllPath64 = `${winePrefix}/drive_c/windows/syswow64/${dll}.dll`
          if (existsSync(dllPath64)) {
            const removeDll = `rm ${dllPath64}`
            exec(removeDll)
          }
        })
        resolve(true)
      })

      // restore the backup dlls
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/system32/${dll}.dll.bak`
          if (existsSync(dllPath)) {
            console.log('restoring', dllPath)
            const restoreDll = `mv ${dllPath} ${winePrefix}/drive_c/windows/system32/${dll}.dll`
            exec(restoreDll)
          }

          const dllPath64 = `${winePrefix}/drive_c/windows/syswow64/${dll}.dll.bak`
          if (existsSync(dllPath64)) {
            if (isMac) {
              return
            }
            const restoreDll = `mv ${dllPath64} ${winePrefix}/drive_c/windows/syswow64/${dll}.dll`
            exec(restoreDll)
          }
        })
        resolve(true)
      })

      // unregister the dlls on the wine prefix
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const unregisterDll = `WINEPREFIX=${winePrefix} '${wineBin}' reg delete 'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides' /v ${dll} /f`
          console.log(`unregistering ${dll}`)
          exec(unregisterDll)
        })
        resolve(true)
      })

      return true
    }

    logInfo([`installing ${tool} on...`, prefix], {
      prefix: LogPrefix.DXVKInstaller
    })
    // backup current dlls on the prefix
    if (currentVersion === globalVersion) {
      logInfo(`${tool} already installed!`, {
        prefix: LogPrefix.DXVKInstaller
      })
      return true
    }

    logInfo(`Backing up current ${tool} dlls`, {
      prefix: LogPrefix.DXVKInstaller
    })

    await new Promise((resolve) => {
      dlls.forEach(async (dll) => {
        if (existsSync(`${winePrefix}/drive_c/windows/system32/${dll}.dll`)) {
          renameSync(
            `${winePrefix}/drive_c/windows/system32/${dll}.dll`,
            `${winePrefix}/drive_c/windows/system32/${dll}.dll.bak`
          )
        }
        if (existsSync(`${winePrefix}/drive_c/windows/syswow64/${dll}.dll`)) {
          // macOs supports 64 bits only
          if (isMac) {
            return
          }
          renameSync(
            `${winePrefix}/drive_c/windows/syswow64/${dll}.dll`,
            `${winePrefix}/drive_c/windows/syswow64/${dll}.dll.bak`
          )
        }
      })
      resolve(true)
    })

    // copy the new dlls to the prefix
    await new Promise((resolve) => {
      dlls.forEach(async (dll) => {
        if (existsSync(`${toolPathx86}/${dll}.dll`)) {
          if (isMac) {
            return
          }
          copyFileSync(
            `${toolPathx86}/${dll}.dll`,
            `${winePrefix}/drive_c/windows/syswow64/${dll}.dll`
          )
        }
        if (existsSync(`${toolPathx64}/${dll}.dll`)) {
          copyFileSync(
            `${toolPathx64}/${dll}.dll`,
            `${winePrefix}/drive_c/windows/system32/${dll}.dll`
          )
        }
      })
      resolve(true)
    })

    // register dlls on the wine prefix
    await new Promise((resolve) => {
      dlls.forEach(async (dll) => {
        await execAsync(
          `WINEPREFIX=${winePrefix} '${wineBin}' reg add 'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides' /v ${dll} /d native,builtin /f `,
          execOptions
        )
          .then(() => {
            logInfo(`${dll} registered!`, {
              prefix: LogPrefix.DXVKInstaller
            })
          })
          .catch((error) => {
            logError([`Error when registering ${dll}`, error], {
              prefix: LogPrefix.DXVKInstaller
            })
          })
      })
      exec(`echo ${globalVersion} > ${currentVersionCheck}`)
      resolve(true)
    })
    return true
  }
}

export const Winetricks = {
  download: async () => {
    if (!isLinux) {
      return
    }

    const url =
      'https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks'
    const path = `${heroicToolsPath}/winetricks`

    if (!isOnline()) {
      return
    }

    try {
      logInfo('Downloading Winetricks', { prefix: LogPrefix.WineTricks })
      const res = await axios.get(url, { timeout: 1000 })
      const file = res.data
      writeFileSync(path, file)
      return exec(`chmod +x ${path}`)
    } catch (error) {
      return logWarning(['Error Downloading Winetricks', error], {
        prefix: LogPrefix.WineTricks
      })
    }
  },
  run: async (
    wineVersion: WineInstallation,
    baseWinePrefix: string,
    event: Electron.IpcMainInvokeEvent
  ) => {
    if (!(await validWine(wineVersion))) {
      return
    }

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
