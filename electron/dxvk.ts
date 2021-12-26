import * as axios from 'axios'
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import { existsSync, readFileSync } from 'graceful-fs'

import { execAsync, isOnline } from './utils'
import { execOptions, heroicToolsPath, home } from './constants'
import { logError, logInfo, logWarning } from './logger'

export const DXVK = {
  getLatest: async () => {
    if (!(await isOnline())) {
      logWarning('App offline, skipping possible DXVK update.')
      return
    }

    const tools = [
      {
        name: 'dxvk',
        url: 'https://api.github.com/repos/lutris/dxvk/releases/latest',
        extractCommand: 'tar -zxf'
      }
    ]

    tools.forEach(async (tool) => {
      const {
        data: { assets }
      } = await axios.default.get(tool.url)

      const { name, browser_download_url: downloadUrl } = assets[0]
      const pkg = name.replace('.tar.gz', '')

      const latestVersion = `${heroicToolsPath}/${tool.name}/${name}`
      const pastVersionCheck = `${heroicToolsPath}/${tool.name}/latest_${tool.name}`
      let pastVersion = ''
      if (existsSync(pastVersionCheck)) {
        pastVersion = readFileSync(pastVersionCheck).toString().split('\n')[0]
      }

      if (pastVersion === pkg) {
        return
      }
      const downloadCommand = `curl -L ${downloadUrl} -o ${latestVersion} --create-dirs`
      const extractCommand = `${tool.extractCommand} ${latestVersion} -C ${heroicToolsPath}/${tool.name}`
      const echoCommand = `echo ${pkg} > ${heroicToolsPath}/${tool.name}/latest_${tool.name}`
      const cleanCommand = `rm ${latestVersion}`

      logInfo(`Updating ${tool.name} to:`, pkg)

      return execAsync(downloadCommand)
        .then(async () => {
          logInfo(`downloaded ${tool.name}`)
          logInfo(`extracting ${tool.name}`)
          exec(echoCommand)
          await execAsync(extractCommand)
          logInfo(`extracting ${tool.name} updated!`)
          exec(cleanCommand)
        })
        .catch((error) =>
          logError(`Error when downloading ${tool.name}`, error)
        )
    })
  },

  installRemove: async (
    prefix: string,
    winePath: string,
    tool: 'dxvk' | 'vkd3d',
    action: 'backup' | 'restore'
  ) => {
    const winePrefix = prefix.replace('~', home)
    const isValidPrefix = existsSync(`${winePrefix}/.update-timestamp`)

    if (!isValidPrefix) {
      logWarning('DXVK cannot be installed on a Proton or a invalid prefix!')
      return
    }

    // remove the last part of the path since we need the folder only
    const winePathSplit = winePath.replaceAll("'", '').split('/')
    winePathSplit.pop()
    const wineBin = winePathSplit.join('/').concat('/')

    if (!existsSync(`${heroicToolsPath}/${tool}/latest_${tool}`)) {
      logError('dxvk not found!')
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

    const installCommand = `PATH=${wineBin}:$PATH WINEPREFIX='${winePrefix}' bash ${toolPath}/setup_dxvk.sh install --symlink`
    const updatedVersionfile = `echo '${globalVersion}' > ${currentVersionCheck}`

    if (action === 'restore') {
      logInfo(`Removing ${tool} version information`)
      const updatedVersionfile = `rm -rf ${currentVersionCheck}`
      const removeCommand = `PATH=${wineBin}:$PATH WINEPREFIX='${winePrefix}' bash ${toolPath}/setup_dxvk.sh uninstall --symlink`
      return execAsync(removeCommand, execOptions)
        .then(() => {
          logInfo(`${tool} removed from ${winePrefix}`)
          return exec(updatedVersionfile)
        })
        .catch((error) => {
          logError(error)
          logError('error when removing DXVK, please try again')
        })
    }

    if (currentVersion === globalVersion) {
      return
    }

    logInfo(`installing ${tool} on...`, prefix)
    await execAsync(installCommand, { shell: '/bin/bash' })
      .then(() => {
        logInfo(`${tool} installed on ${winePrefix}`)
        return exec(updatedVersionfile)
      })
      .catch((error) => {
        logError(error)
        logError(
          'error when installing DXVK, please try launching the game again'
        )
      })
  }
}
