import { ExecResult, GameSettings, Runner, WineCommandArgs } from 'common/types'

import {
  existsSync,
  readFileSync,
  writeFile,
  writeFileSync,
  readdirSync,
  copyFile,
  rm,
  mkdirSync,
  rmSync
} from 'graceful-fs'

import { spawn } from 'child_process'
import {
  axiosClient,
  downloadFile,
  execAsync,
  extractFiles,
  getWineFromProton
} from '../utils'
import {
  execOptions,
  toolsPath,
  isMac,
  isWindows,
  userHome,
  isLinux
} from '../constants'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import i18next from 'i18next'
import { dirname, join } from 'path'
import { isOnline } from '../online_monitor'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import {
  prepareWineLaunch,
  runWineCommand,
  setupEnvVars,
  setupWineEnvVars,
  validWine
} from '../launcher'
import { chmod, readFile } from 'fs/promises'
import {
  any_gpu_supports_version,
  get_nvngx_path,
  get_vulkan_instance_version
} from '../utils/graphics/vulkan'
import { lt as semverLt } from 'semver'
import { createAbortController } from '../utils/aborthandler/aborthandler'
import { gameManagerMap } from '../storeManagers'
import { sendFrontendMessage } from '../main_window'
import {
  DAYS,
  downloadFile as downloadFileInet
} from '../utils/inet/downloader'
import { getUmuPath, isUmuSupported } from 'backend/utils/compatibility_layers'

interface Tool {
  name: string
  url: string
  os: string
  strip?: number
}

async function installOrUpdateTool(tool: Tool) {
  if (tool.os !== process.platform) return

  const {
    data: { assets }
  } = await axiosClient.get(tool.url)

  const { name, browser_download_url: downloadUrl } = assets[0]
  const latestVersion = name.replace('.tar.gz', '').replace('.tar.xz', '')
  const latestVersionArchivePath = `${toolsPath}/${tool.name}/${name}`

  const installedVersionStorage = `${toolsPath}/${tool.name}/latest_${tool.name}`
  let installedVersion = ''
  if (existsSync(installedVersionStorage)) {
    installedVersion = readFileSync(installedVersionStorage)
      .toString()
      .split('\n')[0]
  }

  const alreadyUpToDate =
    installedVersion === latestVersion &&
    existsSync(join(toolsPath, tool.name, installedVersion))
  if (alreadyUpToDate) return

  mkdirSync(join(toolsPath, tool.name), { recursive: true })

  logInfo([`Updating ${tool.name} to:`, latestVersion], LogPrefix.DXVKInstaller)

  try {
    await downloadFile({
      url: downloadUrl,
      dest: latestVersionArchivePath,
      abortSignal: createAbortController(tool.name).signal
    })
  } catch (error) {
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
    return
  }

  logInfo(`Downloaded ${tool.name}, extracting...`, LogPrefix.DXVKInstaller)

  const extractDestination = join(toolsPath, tool.name, latestVersion)
  mkdirSync(extractDestination, { recursive: true })
  const extractResult = await extractFiles({
    path: latestVersionArchivePath,
    destination: extractDestination,
    strip: tool.strip ?? 1
  })
  rmSync(latestVersionArchivePath)

  if (extractResult.status === 'done') {
    writeFileSync(installedVersionStorage, latestVersion)
    logInfo(`${tool.name} updated!`, LogPrefix.DXVKInstaller)
  }
}

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

    const tools: Tool[] = [
      {
        name: 'vkd3d',
        url: getVkd3dUrl(),
        os: 'linux'
      },
      {
        name: 'dxvk',
        url: getDxvkUrl(),
        os: 'linux'
      },
      {
        name: 'dxvk-nvapi',
        url: 'https://api.github.com/repos/jp7677/dxvk-nvapi/releases/latest',
        os: 'linux',
        strip: 0
      },
      {
        name: 'dxvk-macOS',
        url: 'https://api.github.com/repos/Gcenx/DXVK-macOS/releases/latest',
        os: 'darwin'
      }
    ]

    await Promise.all(tools.map(installOrUpdateTool))
  },

  installRemove: async (
    gameSettings: GameSettings,
    tool: 'dxvk' | 'dxvk-nvapi' | 'vkd3d' | 'dxvk-macOS',
    action: 'backup' | 'restore'
  ): Promise<boolean> => {
    if (gameSettings.wineVersion.bin.includes('toolkit')) {
      // we don't want to install dxvk on the toolkit prefix since it breaks Apple's implementation
      logWarning(
        'Skipping DXVK install on Game Porting Toolkit prefix!',
        LogPrefix.DXVKInstaller
      )
      return true
    }

    if (isMac && tool !== 'dxvk') {
      return true
    }

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

    const is64bitPrefix = existsSync(`${winePrefix}/drive_c/windows/syswow64`)

    if (!is64bitPrefix) {
      logWarning('32-bit prefix detected!', LogPrefix.DXVKInstaller)
    }

    if (!existsSync(`${toolsPath}/${tool}/latest_${tool}`)) {
      logWarning('dxvk not found!', LogPrefix.DXVKInstaller)
      await DXVK.getLatest()
    }

    const globalVersion = readFileSync(`${toolsPath}/${tool}/latest_${tool}`)
      .toString()
      .split('\n')[0]

    const toolPathx32 = `${toolsPath}/${tool}/${globalVersion}/${
      tool === 'vkd3d' ? 'x86' : 'x32'
    }`
    const dlls32 = readdirSync(toolPathx32)
    const toolPathx64 = `${toolsPath}/${tool}/${globalVersion}/x64`
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

      logInfo('Removing DLL overrides', LogPrefix.DXVKInstaller)

      // unregister the dlls on the wine prefix
      if (is64bitPrefix) {
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
            protonVerb: 'run'
          })
        })
      }
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
          protonVerb: 'run'
        })
      })

      logInfo('Removing DXVK DLLs', LogPrefix.DXVKInstaller)

      // removing DXVK dlls
      let dllsToRemove
      if (is64bitPrefix) {
        dllsToRemove = dlls64.map(
          (dll) => `${winePrefix}/drive_c/windows/system32/${dll}`
        )
        dllsToRemove.concat(
          dlls32.map((dll) => `${winePrefix}/drive_c/windows/syswow64/${dll}`)
        )
      } else {
        dllsToRemove = dlls32.map(
          (dll) => `${winePrefix}/drive_c/windows/system32/${dll}`
        )
      }
      dllsToRemove.forEach((dllFile) => {
        try {
          rmSync(dllFile)
        } catch (err) {
          logError([`Error removing ${dllFile}`, err], LogPrefix.DXVKInstaller)
        }
      })

      // Restore stock Wine libraries
      logInfo('Restoring Wine stock DLLs', LogPrefix.DXVKInstaller)

      await runWineCommand({
        gameSettings,
        commandParts: ['wineboot', '-u'],
        wait: true,
        protonVerb: 'run'
      })
      return true
    }

    logInfo([`installing ${tool} on...`, prefix], LogPrefix.DXVKInstaller)

    if (currentVersion === globalVersion) {
      logInfo(`${tool} already installed!`, LogPrefix.DXVKInstaller)
      return true
    }

    // copy the new dlls to the prefix
    if (is64bitPrefix) {
      dlls32.forEach((dll) => {
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
    } else {
      dlls32.forEach((dll) => {
        copyFile(
          `${toolPathx32}/${dll}`,
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
    }

    // register dlls on the wine prefix
    if (is64bitPrefix) {
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
          protonVerb: 'run'
        })
      })
    }
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
        protonVerb: 'run'
      })
    })

    //locate and copy nvngx.dll to support DLSS on Nvidia GPUs
    if (tool === 'dxvk-nvapi' && action === 'backup') {
      try {
        let nvngx_path = get_nvngx_path()
        if (nvngx_path.length !== 0) {
          nvngx_path += '/nvidia/wine'
          const copyDlls = ['nvngx.dll', '_nvngx.dll']
          copyDlls.forEach((dll) => {
            copyFile(
              `${nvngx_path}/${dll}`,
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
          const regModNvngx = [
            'reg',
            'add',
            'HKEY_LOCAL_MACHINE\\SOFTWARE\\NVIDIA Corporation\\Global\\NGXCore',
            '/v',
            'FullPath',
            '/d',
            'C:\\windows\\system32',
            '/f'
          ]
          await runWineCommand({
            gameSettings,
            commandParts: regModNvngx,
            wait: true,
            protonVerb: 'run'
          })
        } else {
          logWarning(
            'Could not find nvngx.dll for DLSS!',
            LogPrefix.DXVKInstaller
          )
        }
      } catch (err) {
        logError([`Error when finding nvngx.dll`, err], LogPrefix.DXVKInstaller)
      }
    }

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

let installingComponent = ''
export const Winetricks = {
  download: async () => {
    if (isWindows) {
      return
    }

    const url =
      'https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks'
    const path = `${toolsPath}/winetricks`

    if (!isOnline()) {
      return
    }

    try {
      logInfo('Downloading Winetricks', LogPrefix.WineTricks)
      await downloadFileInet(url, {
        writeToFile: path,
        maxCache: 7 * DAYS,
        axiosConfig: { responseType: 'text' }
      })
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
    runner: Runner,
    appName: string,
    args: string[],
    returnOutput = false
  ) => {
    const gameSettings = await gameManagerMap[runner].getSettings(appName)

    const { wineVersion } = gameSettings

    if (!(await validWine(wineVersion))) {
      return
    }

    let winetricks = `${toolsPath}/winetricks`
    const gui = args.includes('--gui')

    if (!existsSync(winetricks)) {
      await Winetricks.download()
    }

    if (await isUmuSupported(gameSettings)) {
      winetricks = await getUmuPath()

      if (args.includes('-q')) {
        args.splice(args.indexOf('-q'), 1)
      }

      if (gui) {
        args.splice(args.indexOf('--gui'), 1)
        args.unshift('')
      } else {
        args.unshift('winetricks')
      }
    }

    const { winePrefix, wineVersion: alwaysWine_wineVersion } =
      await getWineFromProton(gameSettings)
    return new Promise<string[] | null>((resolve) => {
      const wineBin = alwaysWine_wineVersion.bin
      // We have to run Winetricks with an actual `wine` binary, meaning we
      // might need to set some environment variables differently than normal
      // (e.g. `WINEESYNC=1` vs `PROTON_NO_ESYNC=0`).
      // These settings will be a copy of the normal game settings, but with
      // their wineVersion set to one always of the type `wine`
      const settingsWithWineVersion = {
        ...gameSettings,
        wineVersion: alwaysWine_wineVersion
      }

      const winepath = dirname(wineBin)

      const linuxEnvs = {
        ...process.env,
        ...setupEnvVars(settingsWithWineVersion),
        ...setupWineEnvVars(settingsWithWineVersion, appName),
        WINEPREFIX: winePrefix,
        PATH: `${winepath}:${process.env.PATH}`,
        GAMEID: gui ? 'winetricks-gui' : 'umu-0',
        UMU_RUNTIME_UPDATE: '0'
      }

      const wineServer = join(winepath, 'wineserver')

      const macEnvs = {
        ...process.env,
        // FIXME: Do we want to use `settingsWithWineVersion` here?
        ...setupEnvVars(gameSettings),
        ...setupWineEnvVars(gameSettings, appName),
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
      const sendProgress = setInterval(() => {
        if (progressUpdated) {
          sendFrontendMessage('progressOfWinetricks', {
            messages: executeMessages,
            installingComponent
          })
          progressUpdated = false
        }
      }, 1000)

      // check if winetricks dependencies are installed
      const dependencies = ['7z', 'cabextract', 'zenity', 'unzip', 'curl']
      dependencies.forEach(async (dependency) => {
        try {
          await execAsync(`which ${dependency}`, { ...execOptions, env: envs })
        } catch {
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

      logInfo(`Running ${winetricks} ${args.join(' ')}`, LogPrefix.WineTricks)

      const child = spawn(winetricks, args, { env: envs })

      const output: string[] = []

      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (data: string) => {
        if (returnOutput) {
          output.push(data)
        } else {
          appendMessage(data)
          logInfo(data, LogPrefix.WineTricks)
        }
      })

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', (data: string) => {
        logError(data, LogPrefix.WineTricks)
        appendMessage(data)
      })

      child.on('error', (error) => {
        logError(['Winetricks threw Error:', error], LogPrefix.WineTricks)
        showDialogBoxModalAuto({
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
        resolve(returnOutput ? output : null)
      })

      child.on('exit', () => {
        sendFrontendMessage('progressOfWinetricks', {
          messages: ['Done'],
          installingComponent
        })
        clearInterval(sendProgress)
        resolve(returnOutput ? output : null)
      })

      child.on('close', () => {
        clearInterval(sendProgress)
        resolve(returnOutput ? output : null)
      })
    })
  },
  run: async (runner: Runner, appName: string) => {
    await Winetricks.runWithArgs(runner, appName, ['-q', '--gui'])
  },
  listAvailable: async (runner: Runner, appName: string) => {
    try {
      const dlls: string[] = []
      const outputDlls = await Winetricks.runWithArgs(
        runner,
        appName,
        ['dlls', 'list'],
        true
      )
      if (outputDlls) {
        // the output is an array of strings, the first word is the component name
        outputDlls.forEach((component: string) =>
          dlls.push(component.split(' ', 1)[0])
        )
      }

      const fonts: string[] = []
      const outputFonts = await Winetricks.runWithArgs(
        runner,
        appName,
        ['fonts', 'list'],
        true
      )
      if (outputFonts) {
        // the output is an array of strings, the first word is the font name
        outputFonts.forEach((font: string) => fonts.push(font.split(' ', 1)[0]))
      }
      return [...dlls, ...fonts]
    } catch {
      return []
    }
  },
  listInstalled: async (runner: Runner, appName: string) => {
    const gameSettings = await gameManagerMap[runner].getSettings(appName)
    const { winePrefix } = await getWineFromProton(gameSettings)
    const winetricksLogPath = join(winePrefix, 'winetricks.log')
    try {
      const winetricksLog = await readFile(winetricksLogPath, 'utf8')
      return winetricksLog.split('\n').filter(Boolean)
    } catch {
      return []
    }
  },
  install: async (runner: Runner, appName: string, component: string) => {
    sendFrontendMessage('installing-winetricks-component', component)
    try {
      installingComponent = component
      await Winetricks.runWithArgs(runner, appName, ['-q', component])
    } finally {
      installingComponent = ''
      sendFrontendMessage('installing-winetricks-component', '')
    }
  }
}

/**
 * Figures out the right DXVK version to use, taking the user's hardware
 * (specifically their Vulkan support) into account
 */
function getDxvkUrl(): string {
  if (!isLinux) {
    return ''
  }

  if (any_gpu_supports_version([1, 3, 0])) {
    const instance_version = get_vulkan_instance_version()
    if (instance_version && semverLt(instance_version.join('.'), '1.3.0')) {
      // FIXME: How does the instance version matter? Even with 1.2, newer DXVK seems to work fine
      logWarning(
        'Vulkan 1.3 is supported by GPUs in this system, but instance version is outdated',
        LogPrefix.DXVKInstaller
      )
    }
    return 'https://api.github.com/repos/doitsujin/dxvk/releases/latest'
  }
  if (any_gpu_supports_version([1, 1, 0])) {
    logInfo(
      'The GPU(s) in this system only support Vulkan 1.1/1.2, falling back to DXVK 1.10.3',
      LogPrefix.DXVKInstaller
    )
    return 'https://api.github.com/repos/doitsujin/dxvk/releases/tags/v1.10.3'
  }
  logWarning(
    'No GPU with Vulkan 1.1 support found, DXVK will not work',
    LogPrefix.DXVKInstaller
  )
  // FIXME: We currently lack a "Don't download at all" option here, but
  //        that would also need bigger changes in the frontend
  return 'https://api.github.com/repos/doitsujin/dxvk/releases/latest'
}

/**
 * Figures out the right VKD3D version to use, taking the user's hardware
 * (specifically their Vulkan support) into account
 */
function getVkd3dUrl(): string {
  if (!isLinux) {
    return ''
  }

  if (any_gpu_supports_version([1, 3, 0])) {
    const instance_version = get_vulkan_instance_version()
    if (instance_version && semverLt(instance_version.join('.'), '1.3.0')) {
      // FIXME: How does the instance version matter? Even with 1.2, newer VKD3D seems to work fine
      logWarning(
        'Vulkan 1.3 is supported by GPUs in this system, but instance version is outdated',
        LogPrefix.DXVKInstaller
      )
    }
    return 'https://api.github.com/repos/Heroic-Games-Launcher/vkd3d-proton/releases/latest'
  }
  if (any_gpu_supports_version([1, 1, 0])) {
    logInfo(
      'The GPU(s) in this system only support Vulkan 1.1/1.2, falling back to VKD3D 2.6',
      LogPrefix.DXVKInstaller
    )
    return 'https://api.github.com/repos/Heroic-Games-Launcher/vkd3d-proton/releases/tags/v2.6'
  }
  logWarning(
    'No GPU with Vulkan 1.1 support found, VKD3D will not work',
    LogPrefix.DXVKInstaller
  )
  // FIXME: We currently lack a "Don't download at all" option here, but
  //        that would also need bigger changes in the frontend
  return 'https://api.github.com/repos/Heroic-Games-Launcher/vkd3d-proton/releases/latest'
}

export async function runWineCommandOnGame(
  runner: Runner,
  appName: string,
  { commandParts, wait = false, protonVerb, startFolder }: WineCommandArgs
): Promise<ExecResult> {
  if (gameManagerMap[runner].isNative(appName)) {
    logError('runWineCommand called on native game!', LogPrefix.Gog)
    return { stdout: '', stderr: '' }
  }
  const { folder_name, install } = gameManagerMap[runner].getGameInfo(appName)
  const gameSettings = await gameManagerMap[runner].getSettings(appName)

  await prepareWineLaunch(runner, appName)

  return runWineCommand({
    gameSettings,
    installFolderName: folder_name,
    gameInstallPath: install.install_path,
    commandParts,
    wait,
    protonVerb,
    startFolder
  })
}
