import * as axios from 'axios'
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import {
  existsSync,
  readFileSync
} from 'graceful-fs'

import { execAsync, isOnline } from './utils'
import {
  heroicToolsPath,
  home
} from './constants'
import { logError, logInfo, logWarning } from './logger'


export const DXVK = {
  getLatest: async () => {
    if (!(await isOnline())) {
      logWarning('App offline, skipping possible DXVK update.')
      return
    }
    const {
      data: { assets }
    } = await axios.default.get(
      'https://api.github.com/repos/lutris/dxvk/releases/latest'
    )
    const current = assets[0]
    const pkg = current.name
    const name = pkg.replace('.tar.gz', '')
    const downloadUrl = current.browser_download_url

    const dxvkLatest = `${heroicToolsPath}/DXVK/${pkg}`
    const pastVersionCheck = `${heroicToolsPath}/DXVK/latest_dxvk`
    let pastVersion = ''

    if (existsSync(pastVersionCheck)) {
      pastVersion = readFileSync(pastVersionCheck).toString().split('\n')[0]
    }

    if (pastVersion === name) {
      return
    }

    const downloadCommand = `curl -L ${downloadUrl} -o ${dxvkLatest} --create-dirs`
    const extractCommand = `tar -zxf ${dxvkLatest} -C ${heroicToolsPath}/DXVK/`
    const echoCommand = `echo ${name} > ${heroicToolsPath}/DXVK/latest_dxvk`
    const cleanCommand = `rm ${dxvkLatest}`

    logInfo('Updating DXVK to:', name)

    return execAsync(downloadCommand)
      .then(async () => {
        logInfo('downloaded DXVK')
        logInfo('extracting DXVK')
        exec(echoCommand)
        await execAsync(extractCommand)
        logInfo('DXVK updated!')
        exec(cleanCommand)
      })
      .catch(() => logError('Error when downloading DXVK'))
  },

  install: async (prefix: string) => {
    if (!prefix) {
      return
    }
    const winePrefix = prefix.replace('~', home)

    if (!existsSync(`${heroicToolsPath}/DXVK/latest_dxvk`)) {
      logError('dxvk not found!')
      await DXVK.getLatest()
    }

    const globalVersion = readFileSync(`${heroicToolsPath}/DXVK/latest_dxvk`)
      .toString()
      .split('\n')[0]
    const dxvkPath = `${heroicToolsPath}/DXVK/${globalVersion}/`
    const currentVersionCheck = `${winePrefix}/current_dxvk`
    let currentVersion = ''

    if (existsSync(currentVersionCheck)) {
      currentVersion = readFileSync(currentVersionCheck)
        .toString()
        .split('\n')[0]
    }

    if (currentVersion === globalVersion) {
      return
    }

    const installCommand = `WINEPREFIX='${winePrefix}' bash ${dxvkPath}setup_dxvk.sh install`
    const echoCommand = `echo '${globalVersion}' > ${currentVersionCheck}`

    logInfo(`installing DXVK on...`, installCommand)
    await execAsync(`WINEPREFIX='${winePrefix}' wineboot`)
    await execAsync(installCommand, { shell: '/bin/bash' })
      .then(() => exec(echoCommand))
      .catch(() =>
        logError(
          'error when installing DXVK, please try launching the game again'
        )
      )
  }
}
