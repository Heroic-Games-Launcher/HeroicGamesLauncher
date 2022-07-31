import { WineInstallation } from 'common/types'
import * as axios from 'axios'
import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { exec, spawn } from 'child_process'

import {
  execAsync,
  getWineFromProton,
  isOnline,
  showErrorBoxModalAuto
} from './utils'
import { execOptions, heroicToolsPath, userHome } from './constants'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import i18next from 'i18next'
import { dirname } from 'path'

export const DXVK = {
  getLatest: async () => {
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

      logInfo([`Updating ${tool.name} to:`, pkg], LogPrefix.DXVKInstaller)

      return execAsync(downloadCommand)
        .then(async () => {
          logInfo(`downloaded ${tool.name}`, LogPrefix.DXVKInstaller)
          logInfo(`extracting ${tool.name}`, LogPrefix.DXVKInstaller)
          exec(echoCommand)
          await execAsync(extractCommand)
            .then(() =>
              logInfo(
                `extracting ${tool.name} updated!`,
                LogPrefix.DXVKInstaller
              )
            )
            .catch((error) => {
              logError(
                `Extraction of ${tool.name} failed with: ${error}`,
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
          showErrorBoxModalAuto(
            i18next.t('box.error.dxvk.title', 'DXVK/VKD3D error'),
            i18next.t(
              'box.error.dxvk.message',
              'Error installing DXVK/VKD3D! Check your connection!'
            )
          )
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
      logWarning(
        'DXVK cannot be installed on a Proton or a invalid prefix!',
        LogPrefix.DXVKInstaller
      )
      return
    }

    // remove the last part of the path since we need the folder only
    const wineBin = dirname(winePath.replace("'", ''))

    if (!existsSync(`${heroicToolsPath}/${tool}/latest_${tool}`)) {
      logWarning('dxvk not found!', LogPrefix.DXVKInstaller)
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
      logInfo(`Removing ${tool} version information`, LogPrefix.DXVKInstaller)
      const updatedVersionfile = `rm -rf ${currentVersionCheck}`
      const removeCommand = `PATH=${wineBin}:$PATH WINEPREFIX='${winePrefix}' bash ${toolPath}/setup*.sh uninstall --symlink`
      return execAsync(removeCommand, execOptions)
        .then(() => {
          logInfo(`${tool} removed from ${winePrefix}`, LogPrefix.DXVKInstaller)
          return exec(updatedVersionfile)
        })
        .catch((error) => {
          logError(
            ['error when removing DXVK, please try again', `${error}`],
            LogPrefix.DXVKInstaller
          )
        })
    }

    if (currentVersion === globalVersion) {
      return
    }

    logInfo([`installing ${tool} on...`, prefix], LogPrefix.DXVKInstaller)
    await execAsync(installCommand, { shell: '/bin/bash' })
      .then(() => {
        logInfo(`${tool} installed on ${winePrefix}`, LogPrefix.DXVKInstaller)
        return writeFileSync(currentVersionCheck, globalVersion)
      })
      .catch((error) => {
        logError(
          [
            'error when installing DXVK, please try launching the game again',
            `${error}`
          ],
          LogPrefix.DXVKInstaller
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
        logInfo('Downloaded Winetricks', LogPrefix.Backend)
      })
      .catch(() => {
        logWarning('Error Downloading Winetricks', LogPrefix.Backend)
      })
  },
  run: async (wineVersion: WineInstallation, baseWinePrefix: string) => {
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

    logInfo(
      `Running WINEPREFIX='${winePrefix}' PATH='${winepath}':$PATH ${winetricks} -q`,
      LogPrefix.WineTricks
    )

    const child = spawn(winetricks, ['-q'], { env: envs })

    child.stdout.on('data', (data: Buffer) => {
      logInfo(data.toString(), LogPrefix.WineTricks)
    })

    child.stderr.on('data', (data: Buffer) => {
      logError(data.toString(), LogPrefix.WineTricks)
    })

    child.on('error', (error) => {
      logError(`Winetricks throwed Error: ${error}`, LogPrefix.WineTricks)
    })
  }
}
