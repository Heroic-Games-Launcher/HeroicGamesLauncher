import path from 'node:path'
import { parse } from '@node-steam/vdf'
import { existsSync, readFileSync } from 'graceful-fs'
import { readdir, readFile } from 'node:fs/promises'
import { getSteamLibraries } from 'backend/utils'
import { isOnline } from 'backend/online_monitor'
import {
  AppManifest,
  SteamAppInfo,
  SteamInstallInfo,
  SteamLoginUser
} from 'common/types/steam'
import { libraryCache, steamEnabledUsers } from './electronStores'
import { loadUsers } from './user'
import { GameInfo, LaunchOption } from 'common/types'
import { apiInfoCache } from '../gog/electronStores'
import { logDebug, logError, logWarning } from 'backend/logger'
import { GlobalConfig } from 'backend/config'
import { HeroicVDFParser } from './vdf'
import { CMsgClientLicenseList } from './steammessages'
import { RandomStream } from './xor'
import { steamDBBaseURL } from 'backend/shortcuts/nonesteamgame/constants'

const library = new Map<string, GameInfo>()
const installed = new Map<string, SteamInstallInfo>()

export async function getOwnedPackages(
  steamPath: string,
  userId: string,
  steamId: string
): Promise<number[]> {
  const licenseCache = path.join(
    steamPath,
    'userdata',
    userId,
    'config/licensecache'
  )
  logDebug(['Loading licensecache data', licenseCache])
  try {
    const licenseCacheData = await readFile(licenseCache)
    const stream = new RandomStream()

    const data = stream.decrypt_data(BigInt(steamId), licenseCacheData)
    const licenses = CMsgClientLicenseList.decode(data.subarray(0, -4))
    return licenses.licenses
      .map((license) => license.packageId)
      .filter((pkg) => pkg !== undefined)
  } catch (err) {
    logError([err])
  }
  return []
}

// Built based on https://github.com/SteamDatabase/SteamAppInfo
async function loadAppInfo(steamPath: string): Promise<{
  [appid: string]: SteamAppInfo
}> {
  const appInfoPath = path.join(steamPath, 'appcache', 'appinfo.vdf')
  const data = await readFile(appInfoPath)
  let offset = 0

  let magic = data.readUInt32LE(offset)
  offset += 4
  // const universe = data.readUInt32LE(offset)
  offset += 4
  const version = magic & 0xff
  magic = magic >> 8

  if (version < 39 || version > 41) {
    console.log(`Unknown version ${version}`)
    return {}
  }

  const table = []
  if (version >= 41) {
    const stringTableOffset = data.readBigInt64LE(offset)
    offset += 8
    const position = offset
    offset = Number(stringTableOffset)
    const count = data.readUInt32LE(offset)
    offset += 4
    for (let i = 0; i < count; i++) {
      let pos = offset
      while (true) {
        if (data.at(pos) == 0) {
          break
        }
        pos++
      }
      if (pos != offset) {
        table.push(data.toString('utf-8', offset, pos))
      }
      offset = pos + 1
    }
    offset = position
  }
  const parser = new HeroicVDFParser(table)
  const games: { [appid: string]: SteamAppInfo } = {}
  while (true) {
    const appid = data.readUInt32LE(offset)
    offset += 4
    if (appid === 0) break
    const size = data.readUint32LE(offset)
    offset += 4
    const end = offset + size
    const infoState = data.readUint32LE(offset)
    offset += 4
    const updateTime = data.readUint32LE(offset)
    offset += 4
    const token = data.readBigInt64LE(offset)
    offset += 8
    // const hash = data.subarray(offset, offset + 20)
    offset += 20
    const changeNumber = data.readUint32LE(offset)
    offset += 4

    if (version >= 40) {
      // 20 byte hash
      offset += 20
    }
    const vdfData = data.subarray(offset, end)
    offset = end
    try {
      const parsedData = parser.parse(vdfData)
      games[appid.toString()] = {
        appid,
        infoState,
        updateTime,
        token,
        changeNumber,
        data: parsedData
      }
    } catch (err) {
      console.error('Failed to parse vdf data', err)
    }
  }

  return games
}

async function loadPackageInfo(steamPath: string): Promise<{
  [packageid: string]: unknown
}> {
  const packageInfoPath = path.join(steamPath, 'appcache', 'packageinfo.vdf')
  const data = await readFile(packageInfoPath)
  let offset = 0
  let magic = data.readUInt32LE(offset)
  offset += 4
  // const universe = data.readUInt32LE(offset)
  offset += 4
  const version = magic & 0xff
  magic = magic >> 8
  if (version < 39 || version > 40) {
    console.log(`Unknown version ${version}`)
    return {}
  }

  const parser = new HeroicVDFParser([])
  let packages: {
    [packageid: string]: unknown
  } = {}
  while (true) {
    const subid = data.readUInt32LE(offset)
    offset += 4
    if (subid === 0xffffffff) break
    // const hash = data.subarray(offset, offset + 20)
    offset += 20
    // const changeNumber = data.readUInt32LE()
    offset += 4
    if (version >= 40) {
      // const token = data.readBigUInt64(offset)
      offset += 8
    }
    try {
      const parsedData = parser.parse(data, offset)
      offset = parser.offset
      packages = { ...packages, ...parsedData }
    } catch (err) {
      console.error('Failed to parse vdf data', err)
    }
  }
  return packages
}

export async function getInstalledGames() {
  const steamLibraries = await getSteamLibraries()
  const steamAppsDirs = steamLibraries.map((lib) => path.join(lib, 'steamapps'))

  installed.clear()
  for (const steamApps of steamAppsDirs) {
    if (!existsSync(steamApps)) {
      continue
    }
    const files = await readdir(steamApps)
    let failures = 0
    for (const file of files) {
      if (file.startsWith('appmanifest_')) {
        const data = readFileSync(path.join(steamApps, file), {
          encoding: 'utf-8'
        })
        try {
          const parsedManifest: AppManifest = parse(data).AppState
          installed.set(parsedManifest.appid.toString(), {
            ...parsedManifest,
            install_dir: path.join(
              steamApps,
              'common',
              parsedManifest.installdir
            )
          })
        } catch {
          failures += 1
        }
      }
    }
    if (failures) logWarning(['Error parsing appmanifest of', failures, 'apps'])
  }
}

export async function refresh(): Promise<null> {
  const steamUsers = await loadUsers()
  const { defaultSteamPath } = GlobalConfig.get().getSettings()

  const enabledSteamUsers = steamUsers.reduce((acc, val) => {
    if (steamEnabledUsers.get(val.id, false)) {
      acc.push(val)
    }
    return acc
  }, [] as Array<SteamLoginUser>)
  if (!enabledSteamUsers.length) {
    return null
  }

  libraryCache.get('games', []).forEach((game) => {
    library.set(game.app_name, game)
  })

  await getInstalledGames()
  // Get all user owned games
  if (!isOnline()) {
    logDebug('App offline, skipping steam sync')
    return null
  }

  const [appInfo, packageInfo] = await Promise.all([
    loadAppInfo(defaultSteamPath),
    loadPackageInfo(defaultSteamPath)
  ])
  for (const user of enabledSteamUsers) {
    const accountId = (BigInt(user.id) & BigInt(0xffffffff)).toString()
    logDebug(['Loading owned games for user', user.id])
    const ownedPackages = await getOwnedPackages(
      defaultSteamPath,
      accountId,
      user.id
    )

    if (!ownedPackages?.length) {
      continue
    }
    const apps: string[] = []
    ownedPackages.forEach((packageId) => {
      const packageData = packageInfo[packageId.toString()]
      if (
        typeof packageData === 'object' &&
        packageData !== null &&
        'appids' in packageData &&
        typeof packageData.appids === 'object' &&
        packageData.appids !== null
      )
        apps.push(...Object.values(packageData.appids))
    })

    apiInfoCache.use_in_memory()
    for (const appid of apps) {
      const steamGame = appInfo[appid]
      if (
        typeof steamGame.data !== 'object' ||
        steamGame.data === null ||
        !('common' in steamGame.data) ||
        typeof steamGame.data.common !== 'object' ||
        steamGame.data.common === null ||
        !('name' in steamGame.data.common) ||
        typeof steamGame.data.common.name !== 'string' ||
        !('type' in steamGame.data.common) ||
        typeof steamGame.data.common.type !== 'string' ||
        steamGame.data.common.type.toLowerCase() !== 'game'
      ) {
        continue
      }

      const newGameObject: GameInfo = {
        app_name: steamGame.appid.toString(),
        runner: 'steam',
        art_square: `${steamDBBaseURL}/${steamGame.appid}/library_600x900.jpg`,
        art_cover: `${steamDBBaseURL}/${steamGame.appid}/header.jpg`,
        canRunOffline: false,
        title: steamGame.data?.common?.name,
        is_installed: false,
        install: {
          is_dlc: false
        }
      }

      const installedGame = installed.get(steamGame.appid.toString())
      if (installedGame) {
        newGameObject.is_installed = true
        newGameObject.install.install_path = installedGame.install_dir
        newGameObject.install.install_size = installedGame.SizeOnDisk
      }
      library.set(steamGame.appid.toString(), newGameObject)
    }
    apiInfoCache.commit()
    libraryCache.set('games', Array.from(library.values()))
    logDebug(['Loaded', Array.from(library.values()).length])
  }

  return null
}

export function getGameInfo(appName: string): GameInfo | undefined {
  return library.get(appName)
}

export async function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  options: {
    branch?: string
    build?: string
    lang?: string
    retries?: number
  }
): Promise<undefined> {
  // We can't fetch such info from steam
  return undefined
}

export async function listUpdateableGames(): Promise<string[]> {
  return []
}

export function installState(appName: string, state: boolean) {
  logWarning(`installState not implemented on Steam Library Manager`)
}

export async function changeGameInstallPath(
  appName: string,
  newAppPath: string
) {
  logWarning(`changeGameInstallPath not implemented on Steam Library Manager`)
}

export async function runRunnerCommand() {
  logWarning(`runRunnerCommand not implemented on Steam Library Manager`)
  return null
}

export async function changeVersionPinnedStatus() {}
export function getLaunchOptions(): LaunchOption[] {
  return []
}
