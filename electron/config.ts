/* eslint-disable @typescript-eslint/ban-ts-comment */
import { exec } from 'child_process'
import {
  existsSync,
  mkdir,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'
import { userInfo as user } from 'os'

import { AppSettings, UserInfo, WineProps } from './types'
import {
  execAsync
} from './utils'
import {
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicInstallPath,
  heroicToolsPath,
  home,
  userInfo
} from './constants'

// check other wine versions installed
async function getAlternativeWine(): Promise<WineProps[]> {
  // Just add a new string here in case another path is found on another distro
  const steamPaths: string[] = [
    `${home}/.local/share/Steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    '/usr/share/steam'
  ]

  if (!existsSync(`${heroicToolsPath}/wine`)) {
    exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
      return 'done'
    })
  }

  if (!existsSync(`${heroicToolsPath}/proton`)) {
    exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
      return 'done'
    })
  }

  const protonPaths: string[] = [`${heroicToolsPath}/proton/`]
  const foundPaths = steamPaths.filter((path) => existsSync(path))

  const defaultWine = { bin: '', name: '' }
  await execAsync(`which wine`)
    .then(async ({ stdout }) => {
      defaultWine.bin = stdout.split('\n')[0]
      const { stdout: out } = await execAsync(`wine --version`)
      defaultWine.name = `Wine - ${out.split('\n')[0]}`
    })
    .catch(() => console.log('Wine not installed'))

  foundPaths.forEach((path) => {
    protonPaths.push(`${path}/steamapps/common/`)
    protonPaths.push(`${path}/compatibilitytools.d/`)
    return
  })

  const lutrisPath = `${home}/.local/share/lutris`
  const lutrisCompatPath = `${lutrisPath}/runners/wine/`
  const proton: Set<{ bin: string; name: string }> = new Set()
  const altWine: Set<{ bin: string; name: string }> = new Set()
  const customPaths: Set<{ bin: string; name: string }> = new Set()

  protonPaths.forEach((path) => {
    if (existsSync(path)) {
      readdirSync(path).forEach((version) => {
        if (version.toLowerCase().startsWith('proton')) {
          proton.add({
            bin: `'${path}${version}/proton'`,
            name: `Proton - ${version}`
          })
        }
      })
    }
  })

  if (existsSync(lutrisCompatPath)) {
    readdirSync(lutrisCompatPath).forEach((version) => {
      altWine.add({
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
        name: `Wine - ${version}`
      })
    })
  }

  readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
    altWine.add({
      bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
      name: `Wine - ${version}`
    })
  })

  // skips this on new installations to avoid infinite loops
  if (existsSync(heroicConfigPath)) {
    const { customWinePaths } = await getSettings('default')
    if (customWinePaths.length) {
      customWinePaths.forEach((path: string) => {
        if (path.endsWith('proton')) {
          return customPaths.add({
            bin: `'${path}'`,
            name: `Proton Custom - ${path}`
          })
        }
        return customPaths.add({
          bin: `'${path}'`,
          name: `Wine Custom - ${path}`
        })
      })
    }
  }

  return [defaultWine, ...altWine, ...proton, ...customPaths]
}

const isLoggedIn = () => existsSync(userInfo)

const getSettings = async (appName = 'default'): Promise<AppSettings> => {
  const gameConfig = `${heroicGamesConfigPath}${appName}.json`

  const globalConfig = heroicConfigPath
  let settingsPath = gameConfig
  let settingsName = appName

  if (appName === 'default' || !existsSync(gameConfig)) {
    settingsPath = globalConfig
    settingsName = 'defaultSettings'
    if (!existsSync(settingsPath)) {
      await writeDefaultConfig()
      return getSettings('default')
    }
  }

  const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
  return settings[settingsName]
}

export const getUserInfo = (): UserInfo => {
  if (existsSync(userInfo)) {
    return JSON.parse(readFileSync(userInfo, 'utf-8'))
  }
  return { account_id: '', displayName: null }
}

const writeDefaultConfig = async () => {
  if (!existsSync(heroicConfigPath)) {
    const { account_id } = getUserInfo()
    const userName = user().username
    const [defaultWine] = await getAlternativeWine()

    const config = {
      defaultSettings: {
        defaultInstallPath: heroicInstallPath,
        language: 'en',
        maxWorkers: 0,
        otherOptions: '',
        showFps: false,
        useGameMode: false,
        userInfo: {
          epicId: account_id,
          name: userName
        },
        winePrefix: `${home}/.wine`,
        wineVersion: defaultWine
      } as AppSettings
    }

    writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  if (!existsSync(heroicGamesConfigPath)) {
    mkdir(heroicGamesConfigPath, () => {
      return 'done'
    })
  }
}

const writeGameConfig = async (game: string) => {
  if (!existsSync(`${heroicGamesConfigPath}${game}.json`)) {
    const {
      wineVersion,
      winePrefix,
      otherOptions,
      useGameMode,
      showFps,
      userInfo
    } = await getSettings('default')

    const config = {
      [game]: {
        otherOptions,
        showFps,
        useGameMode,
        userInfo,
        winePrefix,
        wineVersion
      }
    }

    writeFileSync(
      `${heroicGamesConfigPath}${game}.json`,
      JSON.stringify(config, null, 2),
      null
    )
  }
}

export {
  getAlternativeWine,
  getSettings,
  isLoggedIn,
  writeDefaultConfig,
  writeGameConfig
}
