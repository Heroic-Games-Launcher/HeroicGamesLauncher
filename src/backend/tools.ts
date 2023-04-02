import { GameSettings, WineInstallation } from 'common/types'
import axios from 'axios'
import {
  existsSync,
  readFileSync,
  writeFile,
  writeFileSync,
  readdirSync,
  copyFile,
  rm
} from 'graceful-fs'
import { exec, spawn } from 'child_process'

import { execAsync, getWineFromProton } from './utils'
import {
  execOptions,
  heroicToolsPath,
  isMac,
  isWindows,
  userHome
} from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import i18next from 'i18next'
import { dirname, join } from 'path'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { runWineCommand, validWine } from './launcher'
import { chmod } from 'fs/promises'

export const DXVK = {
  getLatest: async () => {
    if (isWindows) {
      return
    }
    if (!isOnline()) {
      logWarning(
        'App offline, skipping possible DXVK update.',
        LogPrefix.DXVKInstaller
      )
      return
    }

    const tools = [
      {
        name: 'vkd3d',
        url: 'https://api.github.com/repos/Heroic-Games-Launcher/vkd3d-proton/releases/latest',
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
        name: 'dxvk-nvapi',
        url: 'https://api.github.com/repos/jp7677/dxvk-nvapi/releases/latest',
        extractCommand: 'tar --one-top-level -xf',
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

      logInfo([`Updating ${tool.name} to:`, pkg], LogPrefix.DXVKInstaller)

      return execAsync(downloadCommand)
        .then(async () => {
          logInfo(`downloaded ${tool.name}`, LogPrefix.DXVKInstaller)
          logInfo(`extracting ${tool.name}`, LogPrefix.DXVKInstaller)
          exec(echoCommand)
          await execAsync(extractCommand)
            .then(() =>
              logInfo(`${tool.name} updated!`, LogPrefix.DXVKInstaller)
            )
            .catch((error) => {
              logError(
                [`Extraction of ${tool.name} failed with:`, error],
                LogPrefix.DXVKInstaller
              )
            })

          exec(cleanCommand)
        })
        .catch((error) => {
          logWarning(
            [`Error when downloading ${tool.name}`, error],
            LogPrefix.DXVKInstaller
          )
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
    gameSettings: GameSettings,
    tool: 'dxvk' | 'dxvk-nvapi' | 'vkd3d' | 'dxvk-macOS',
    action: 'backup' | 'restore'
  ): Promise<boolean> => {
    const prefix = gameSettings.winePrefix
    const winePrefix = prefix.replace('~', userHome)
    const isValidPrefix = existsSync(`${winePrefix}/.update-timestamp`)

    if (!isValidPrefix) {
      logWarning(
        'DXVK cannot be installed on a Proton or a invalid prefix!',
        LogPrefix.DXVKInstaller
      )
      // will return true anyway because otherwise the toggle will be stuck and the prefix might just not be crated yet.
      return true
    }

    tool = isMac ? 'dxvk-macOS' : tool

    if (!existsSync(`${heroicToolsPath}/${tool}/latest_${tool}`)) {
      logWarning('dxvk not found!', LogPrefix.DXVKInstaller)
      await DXVK.getLatest()
    }

    const globalVersion = readFileSync(
      `${heroicToolsPath}/${tool}/latest_${tool}`
    )
      .toString()
      .split('\n')[0]

    const toolPathx32 = `${heroicToolsPath}/${tool}/${globalVersion}/${
      tool === 'vkd3d' ? 'x86' : 'x32'
    }`
    const dlls32 = readdirSync(toolPathx32)
    const toolPathx64 = `${heroicToolsPath}/${tool}/${globalVersion}/x64`
    const dlls64 = readdirSync(toolPathx64)
    const currentVersionCheck = `${winePrefix}/current_${tool}`
    let currentVersion = ''

    if (existsSync(currentVersionCheck)) {
      currentVersion = readFileSync(currentVersionCheck)
        .toString()
        .split('\n')[0]
    }

    if (action === 'restore') {
      logInfo(`Removing ${tool} version information`, LogPrefix.DXVKInstaller)
      if (existsSync(currentVersionCheck)) {
        rm(currentVersionCheck, { force: true }, (err) => {
          if (err) {
            logError(
              [`Error removing ${tool} version information`, err],
              LogPrefix.DXVKInstaller
            )
          }
        })
      }

      logInfo(`Removing ${tool} files`, LogPrefix.DXVKInstaller)

      // remove the dlls from the prefix
      await new Promise((resolve) => {
        dlls64.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/system32/${dll}`
          if (existsSync(`${dllPath}.bak`)) {
            const removeDll = `rm ${dllPath}`
            exec(removeDll)
          }
        })
        dlls32.forEach((dll) => {
          const dllPath = `${winePrefix}/drive_c/windows/syswow64/${dll}`
          if (existsSync(`${dllPath}.bak`)) {
            const removeDll = `rm ${dllPath}`
            exec(removeDll)
          }
        })
        resolve(true)
      })
      // run wineboot -u restore the old dlls
      const restoreDlls = ['wineboot', '-u']
      logInfo('Restoring old dlls', LogPrefix.DXVKInstaller)
      await runWineCommand({
        gameSettings,
        commandParts: restoreDlls,
        wait: true,
        protonVerb: 'waitforexitandrun'
      })

      // unregister the dlls on the wine prefix
      dlls64.forEach(async (dll) => {
        dll = dll.replace('.dll', '')
        const unregisterDll = [
          'reg',
          'delete',
          'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
          '/v',
          dll,
          '/f'
        ]
        await runWineCommand({
          gameSettings,
          commandParts: unregisterDll,
          wait: true,
          protonVerb: 'waitforexitandrun'
        })
      })
      dlls32.forEach(async (dll) => {
        dll = dll.replace('.dll', '')
        const unregisterDll = [
          'reg',
          'delete',
          'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
          '/v',
          dll,
          '/f'
        ]
        await runWineCommand({
          gameSettings,
          commandParts: unregisterDll,
          wait: true,
          protonVerb: 'waitforexitandrun'
        })
      })
      return true
    }

    logInfo([`installing ${tool} on...`, prefix], LogPrefix.DXVKInstaller)

    if (currentVersion === globalVersion) {
      logInfo(`${tool} already installed!`, LogPrefix.DXVKInstaller)
      return true
    }

    // copy the new dlls to the prefix
    dlls32.forEach((dll) => {
      if (!isMac) {
        copyFile(
          `${toolPathx32}/${dll}`,
          `${winePrefix}/drive_c/windows/syswow64/${dll}`,
          (err) => {
            if (err) {
              logError(
                [`Error when copying ${dll}`, err],
                LogPrefix.DXVKInstaller
              )
            }
          }
        )
      }
    })
    dlls64.forEach((dll) => {
      copyFile(
        `${toolPathx64}/${dll}`,
        `${winePrefix}/drive_c/windows/system32/${dll}`,
        (err) => {
          if (err) {
            logError(
              [`Error when copying ${dll}`, err],
              LogPrefix.DXVKInstaller
            )
          }
        }
      )
    })

    // register dlls on the wine prefix
    dlls64.forEach(async (dll) => {
      // remove the .dll extension otherwise will fail
      dll = dll.replace('.dll', '')
      const registerDll = [
        'reg',
        'add',
        'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
        '/v',
        dll,
        '/d',
        'native,builtin',
        '/f'
      ]
      await runWineCommand({
        gameSettings,
        commandParts: registerDll,
        wait: true,
        protonVerb: 'waitforexitandrun'
      })
    })
    dlls32.forEach(async (dll) => {
      // remove the .dll extension otherwise will fail
      dll = dll.replace('.dll', '')
      const registerDll = [
        'reg',
        'add',
        'HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides',
        '/v',
        dll,
        '/d',
        'native,builtin',
        '/f'
      ]
      await runWineCommand({
        gameSettings,
        commandParts: registerDll,
        wait: true,
        protonVerb: 'waitforexitandrun'
      })
    })

    writeFile(currentVersionCheck, globalVersion, (err) => {
      if (err) {
        logError(
          [`Error when writing ${tool} version`, err],
          LogPrefix.DXVKInstaller
        )
      }
    })
    return true
  }
}

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
