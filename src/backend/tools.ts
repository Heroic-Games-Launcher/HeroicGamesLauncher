import { WineInstallation } from 'common/types'
import axios from 'axios'
import {
  copyFileSync,
  existsSync,
  readFileSync,
  renameSync,
  writeFile,
  writeFileSync,
  rmSync,
  readdirSync
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
        extractCommand: 'tar -xf',
        os: 'linux'
      },
      {
        name: 'dxvk',
        url: 'https://api.github.com/repos/doitsujin/dxvk/releases/latest',
        extractCommand: 'tar -xf',
        os: 'linux'
      },
      {
        name: 'dxvk-macOS',
        url: 'https://api.github.com/repos/Gcenx/DXVK-macOS/releases/latest',
        extractCommand: 'tar -xf',
        os: 'darwin'
      }
    ]

    tools.forEach(async (tool) => {
      if (tool.os !== process.platform) {
        return
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

    if (action === 'backup' && !isValidPrefix) {
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

    const dlls = readdirSync(`${heroicToolsPath}/${tool}/${globalVersion}/x64`)
    const toolPathx32 = `${heroicToolsPath}/${tool}/${globalVersion}/${
      tool === 'vkd3d' ? 'x86' : 'x32'
    }`
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
      if (existsSync(currentVersionCheck)) {
        rmSync(currentVersionCheck)
      }

      logInfo(`Removing ${tool} files`, {
        prefix: LogPrefix.DXVKInstaller
      })

      // remove the dlls from the prefix
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/system32/${dll}`
          if (existsSync(`${dllPath}.bak`)) {
            const removeDll = `rm ${dllPath}`
            exec(removeDll)
          }

          const dllPath64 = `${winePrefix}/drive_c/windows/syswow64/${dll}`
          if (existsSync(`${dllPath}.bak`)) {
            const removeDll = `rm ${dllPath64}`
            exec(removeDll)
          }
        })
        resolve(true)
      })

      // restore the backup dlls
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/system32/${dll}.bak`
          const dllPath64 = `${winePrefix}/drive_c/windows/syswow64/${dll}.bak`
          logInfo(`Restoring ${dll}`, { prefix: LogPrefix.DXVKInstaller })
          if (existsSync(dllPath)) {
            renameSync(dllPath, `${winePrefix}/drive_c/windows/system32/${dll}`)
          }

          if (!isMac) {
            if (existsSync(dllPath64)) {
              renameSync(
                dllPath64,
                `${winePrefix}/drive_c/windows/syswow64/${dll}`
              )
            }
          }
        })
        resolve(true)
      })

      // unregister the dlls on the wine prefix
      await new Promise((resolve) => {
        dlls.forEach((dll) => {
          const unregisterDll = `WINEPREFIX='${winePrefix}' '${wineBin}' reg delete 'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides' /v ${dll} /f`
          logInfo(`Unregistering ${dll}`, { prefix: LogPrefix.DXVKInstaller })
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
        renameSync(
          `${winePrefix}/drive_c/windows/system32/${dll}`,
          `${winePrefix}/drive_c/windows/system32/${dll}.bak`
        )

        // macOs supports 64 bits only
        if (!isMac) {
          renameSync(
            `${winePrefix}/drive_c/windows/syswow64/${dll}`,
            `${winePrefix}/drive_c/windows/syswow64/${dll}.bak`
          )
        }
      })
      resolve(true)
    })

    // copy the new dlls to the prefix
    await new Promise((resolve) => {
      dlls.forEach(async (dll) => {
        if (!isMac) {
          copyFileSync(
            `${toolPathx32}/${dll}`,
            `${winePrefix}/drive_c/windows/syswow64/${dll}`
          )
        }

        copyFileSync(
          `${toolPathx64}/${dll}`,
          `${winePrefix}/drive_c/windows/system32/${dll}`
        )
      })
      resolve(true)
    })

    // register dlls on the wine prefix
    await new Promise((resolve) => {
      dlls.forEach(async (dll) => {
        await execAsync(
          `WINEPREFIX='${winePrefix}' '${wineBin}' reg add 'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides' /v ${dll} /d native,builtin /f `,
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
      writeFile(currentVersionCheck, globalVersion, (err) => {
        if (err) {
          logError([`Error when writing ${tool} version`, err], {
            prefix: LogPrefix.DXVKInstaller
          })
        }
      })
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
