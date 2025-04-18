import { sendFrontendMessage } from '../../main_window'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { GOGUser } from './user'
import {
  GameInfo,
  InstalledInfo,
  GOGImportData,
  ExecResult,
  CallRunnerOptions,
  LaunchOption
} from 'common/types'
import {
  GOGCloudSavesLocation,
  GOGGameDotInfoFile,
  GogInstallInfo,
  GOGGameDotIdFile,
  GOGClientsResponse,
  GamesDBData,
  Library,
  BuildItem,
  GalaxyLibraryEntry,
  ProductsEndpointData,
  GOGDLInstallInfo,
  GOGCredentials,
  GOGv1Manifest,
  GOGv2Manifest
} from 'common/types/gog'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'graceful-fs'
import { app } from 'electron'

import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../../logger/logger'
import { getGOGdlBin, getFileSize, axiosClient } from '../../utils'
import { gogdlConfigPath, gogdlLogFile } from '../../constants'
import {
  libraryStore,
  installedGamesStore,
  installInfoStore,
  apiInfoCache,
  privateBranchesStore
} from './electronStores'
import { callRunner } from '../../launcher'
import { isOnline, runOnceWhenOnline } from '../../online_monitor'
import i18next from 'i18next'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { unzipSync } from 'node:zlib'
import { readdirSync, rmSync, writeFileSync } from 'node:fs'
import { checkForRedistUpdates } from './redist'
import { runGogdlCommandStub } from './e2eMock'

const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

export async function initGOGLibraryManager() {
  await refresh()

  // Based on installed games scan for missing manifests and attempt to pull
  // them
  logInfo('Checking for existing gog manifests', { prefix: LogPrefix.Gog })
  const installedGamesList = Array.from(installedGames.keys())
  const manifestDir = join(gogdlConfigPath, 'manifests')
  if (!existsSync(manifestDir)) {
    await mkdir(manifestDir, { recursive: true })
  }

  runOnceWhenOnline(async () => {
    const credentials = await GOGUser.getCredentials()
    for (const appName of installedGamesList) {
      await createMissingGogdlManifest(appName, credentials)
    }
  })
  runOnceWhenOnline(checkForRedistUpdates)
}

async function createMissingGogdlManifest(
  appName: string,
  credentials?: GOGCredentials
) {
  const manifestDir = join(gogdlConfigPath, 'manifests')

  const manifestPath = join(manifestDir, appName)
  const installedData = installedGames.get(appName)! // It exists for sure
  if (existsSync(manifestPath) || installedData?.platform === 'linux') {
    return
  }
  // Pull the data, read info file from install dir if possible
  const res = await runRunnerCommand(['import', installedData.install_path], {
    abortId: `${appName}-manifest-restore`,
    logMessagePrefix: `Getting data of ${appName}`
  })

  try {
    const importData: GOGImportData = JSON.parse(res.stdout)
    const builds = await getBuilds(
      appName,
      installedData.platform,
      credentials?.access_token
    )
    const buildItems: BuildItem[] = builds.data.items

    // Find our build in the list

    const currentBuild = importData.buildId
      ? buildItems.find((item) => item.build_id === importData.buildId)
      : buildItems.find((item) => !item.branch)
    if (!currentBuild || !currentBuild.urls) {
      logError(`Unable to get current build of ${appName}`, {
        prefix: LogPrefix.Gog
      })
      return
    }

    // Get meta
    const url = currentBuild.urls[0]

    const response = await axiosClient.get(url.url, {
      responseType: 'arraybuffer'
    })
    let manifestDataRaw = response.data.toString()
    if (currentBuild.generation === 2) {
      manifestDataRaw = unzipSync(response.data)
    }
    const manifestData = JSON.parse(manifestDataRaw.toString())

    manifestData.HGLPlatform = importData.platform
    manifestData.HGLInstallLanguage = importData.installedLanguage
    manifestData.HGLdlcs = importData.dlcs.map((dlc) => ({ id: dlc }))

    writeFileSync(manifestPath, JSON.stringify(manifestData), {
      encoding: 'utf8'
    })
  } catch (e) {
    logError(`Unable to get data of ${appName} ${e}`, {
      prefix: LogPrefix.Gog
    })
    return
  }
}

export async function getSaveSyncLocation(
  appName: string,
  install: InstalledInfo
): Promise<GOGCloudSavesLocation[] | undefined> {
  let syncPlatform: 'Windows' | 'MacOS' = 'Windows'
  const platform = install.platform
  switch (platform) {
    case 'windows':
      syncPlatform = 'Windows'
      break
    case 'osx':
      syncPlatform = 'MacOS'
      break
  }

  let clientId

  const manifestPath = join(gogdlConfigPath, 'manifests', appName)
  if (existsSync(manifestPath)) {
    try {
      const dataRaw = readFileSync(manifestPath, { encoding: 'utf-8' })
      const data: GOGv1Manifest | GOGv2Manifest = JSON.parse(dataRaw)
      if (data.version === 2) {
        clientId = data.clientId
      }
    } catch (err) {
      clientId = undefined
      logWarning([
        'Was not able to read clientId from manifest, falling back to info file:',
        err
      ])
      clientId = readInfoFile(appName, install.install_path)?.clientId
    }
  } else {
    clientId = readInfoFile(appName, install.install_path)?.clientId
  }

  if (!clientId) {
    logWarning(
      `No clientId in goggame-${appName}.info file. Cannot resolve save path`
    )
    return
  }

  let response: GOGClientsResponse | undefined
  try {
    response = (
      await axiosClient.get(
        `https://remote-config.gog.com/components/galaxy_client/clients/${clientId}?component_version=2.0.45`
      )
    ).data
  } catch (error) {
    logError(
      ['Failed to get remote config information for', appName, ':', error],
      LogPrefix.Gog
    )
  }
  if (!response) {
    return
  }
  const platformInfo = response.content[syncPlatform]
  const savesInfo = platformInfo.cloudStorage
  if (!savesInfo.enabled) {
    return
  }
  return savesInfo.locations
}

const defaultExecResult = {
  stderr: '',
  stdout: ''
}

async function getGalaxyLibrary(
  page_token?: string
): Promise<Array<GalaxyLibraryEntry>> {
  const credentials = await GOGUser.getCredentials()
  if (!credentials) {
    return []
  }
  const headers = {
    Authorization: `Bearer ${credentials.access_token}`
  }
  const url = new URL(
    `https://galaxy-library.gog.com/users/${credentials.user_id}/releases`
  )
  if (page_token) {
    url.searchParams.set('page_token', page_token)
  }
  const objects: GalaxyLibraryEntry[] = []
  const data = await axios
    .get<Library>(url.toString(), { headers })
    .then(({ data }) => data)
    .catch((e: AxiosError) => {
      logError(
        ['There was an error getting games library data', e.message],
        LogPrefix.Gog
      )
      return null
    })

  const gamesItems = data?.items
  if (gamesItems) {
    objects.push(...gamesItems)
  }

  if (data?.next_page_token) {
    const nextPageGames = await getGalaxyLibrary(data.next_page_token)
    if (nextPageGames.length) {
      objects.push(...nextPageGames)
    } else {
      return []
    }
  }

  return objects
}

async function loadLocalLibrary() {
  for (const game of libraryStore.get('games', [])) {
    const copyObject = { ...game }
    if (installedGames.has(game.app_name)) {
      if (isOnline()) {
        await checkForOfflineInstallerChanges(game.app_name)
      }
      copyObject.install = installedGames.get(game.app_name)!
      copyObject.is_installed = true
    }
    library.set(game.app_name, copyObject)
  }
  installedGamesStore.set('installed', Array.from(installedGames.values()))
}

export async function checkForOfflineInstallerChanges(appName: string) {
  // game could've been updated
  // DLC may've been installed etc..
  const installedGame = installedGames.get(appName)
  if (
    !installedGame ||
    installedGame.platform === 'linux' ||
    !existsSync(installedGame.install_path) ||
    existsSync(join(installedGame.install_path, '.gogdl-resume'))
  ) {
    return
  }

  // Update installed DLCs
  const installedProducts = listInstalledProducts(appName)
  const dlcs = installedProducts.filter((product) => product !== appName).sort()
  const installedDLCs = (installedGame.installedDLCs || []).sort()
  let dlcChanged = installedDLCs.length !== dlcs.length

  if (!dlcChanged) {
    for (const index in installedDLCs) {
      dlcChanged = installedDLCs[index] !== dlcs[index]
      if (dlcChanged) {
        break
      }
    }
  }

  if (dlcChanged) {
    installedGame.installedDLCs = dlcs
    // Update gogdl manifest
    try {
      const manifestPath = join(gogdlConfigPath, 'manifests', appName)
      if (existsSync(manifestPath)) {
        const manifestDataRaw = await readFile(manifestPath, {
          encoding: 'utf8'
        })
        const manifestData = JSON.parse(manifestDataRaw)
        manifestData['HGLdlcs'] = dlcs.map((dlc) => ({ id: dlc }))
        const newData = JSON.stringify(manifestData)
        await writeFile(manifestPath, newData, { encoding: 'utf8' })
      }
    } catch (e) {
      logWarning(['Failed to update gogdl manifest', e], {
        prefix: LogPrefix.Gog
      })
    }
    installedGames.set(appName, installedGame)
  }
  // Check buildId
  const data = readInfoFile(appName)
  if (!data?.buildId) {
    return
  }

  if (data.buildId !== installedGame.buildId) {
    // The game was updated, remove gogdl
    // manifest and re-import it
    const manifestPath = join(gogdlConfigPath, 'manifests', appName)
    if (existsSync(manifestPath)) {
      rmSync(manifestPath)
    }
    const credentials = await GOGUser.getCredentials()
    await createMissingGogdlManifest(appName, credentials)
    installedGame.buildId = data.buildId
  }
  installedGames.set(appName, installedGame)
}

export async function refresh(): Promise<ExecResult> {
  if (!GOGUser.isLoggedIn()) {
    return defaultExecResult
  }
  refreshInstalled()
  await loadLocalLibrary()
  const redistGameInfo: GameInfo = {
    app_name: 'gog-redist',
    runner: 'gog',
    title: 'Galaxy Common Redistributables',
    canRunOffline: true,
    install: { is_dlc: true },
    is_installed: true,
    art_cover:
      'https://images.gog-statics.com/516af877f6a03199526d1ce5a76358b8f85f6b828764cf46c820f77ae8832fc5.jpg',
    art_square:
      'https://cdn2.steamgriddb.com/file/sgdb-cdn/grid/5fa80a0fb5ff0b2aaca6730ba213219b.png'
  }

  library.set('gog-redist', redistGameInfo)

  if (!isOnline()) {
    return defaultExecResult
  }

  // This gets games ibrary
  // Handles multiple pages
  const credentials = await GOGUser.getCredentials()
  if (!credentials) {
    return defaultExecResult
  }
  logInfo('Getting GOG library', LogPrefix.Gog)
  const gameApiArray: GalaxyLibraryEntry[] = await getGalaxyLibrary()
  if (!gameApiArray.length) {
    logError('There was an error Loading games library', LogPrefix.Gog)
    return defaultExecResult
  }

  const filteredApiArray = gameApiArray.filter(
    (entry) => entry.platform_id === 'gog'
  )

  const gamesObjects: GameInfo[] = [redistGameInfo]
  apiInfoCache.use_in_memory() // Prevent blocking operations
  for (const game of filteredApiArray) {
    let retries = 5
    while (retries > 0) {
      let gdbData
      try {
        const { data } = await getGamesdbData(
          'gog',
          game.external_id,
          false,
          game.certificate,
          credentials.access_token
        )
        gdbData = data
      } catch {
        retries -= 1
        logError(
          `Error getting gamesdb data for ${game.external_id} retries: ${retries}/5`,
          LogPrefix.Gog
        )
        await new Promise((resolve) => setTimeout(resolve, 2000))
        continue
      }

      const unifiedObject = await gogToUnifiedInfo(gdbData)
      if (unifiedObject.app_name) {
        const oldData = library.get(unifiedObject.app_name)
        if (oldData) {
          unifiedObject.folder_name = oldData.folder_name
        }
        gamesObjects.push(unifiedObject)
      }
      const installedInfo = installedGames.get(String(game.external_id))
      // If game is installed, verify if installed game supports cloud saves
      if (installedInfo && installedInfo?.platform !== 'linux') {
        const saveLocations = await getSaveSyncLocation(
          unifiedObject.app_name,
          installedInfo
        )

        if (saveLocations) {
          unifiedObject.cloud_save_enabled = true
          unifiedObject.gog_save_location = saveLocations
        }
      }
      // Create new object to not write install data into library store
      const copyObject = Object.assign({}, unifiedObject)
      if (installedInfo) {
        copyObject.is_installed = true
        copyObject.install = installedInfo
      }
      library.set(copyObject.app_name, copyObject)
      break
    }
  }

  apiInfoCache.commit() // Sync cache to drive
  libraryStore.set('games', gamesObjects)
  logInfo('Saved games data', LogPrefix.Gog)

  return defaultExecResult
}

export function getGameInfo(slug: string): GameInfo | undefined {
  return library.get(slug) || getInstallAndGameInfo(slug)
}

export function getInstallAndGameInfo(slug: string): GameInfo | undefined {
  const lib = libraryStore.get('games', [])
  const game = lib.find((value) => value.app_name === slug)

  if (!game) {
    return
  }
  const installedInfo = installedGames.get(game.app_name)
  if (installedInfo) {
    game.is_installed = true
    game.install = installedInfo
  }

  return game
}

/**
 * Gets data metadata about game using gogdl info for current system,
 * gogdl data for linux contains different fields than windows and mac
 * this is handled but some fields may be unexepectedly empty, so watch out
 * Contains data like download size
 * @param appName
 * @param installPlatform
 * @param options object with a `branch` ('null' if undefined) and `build` properties
 * @returns InstallInfo object
 */
export async function getInstallInfo(
  appName: string,
  installPlatform = 'windows',
  options?: { branch?: string; build?: string }
): Promise<GogInstallInfo | undefined> {
  const branch = options?.branch || 'null'
  const build = options?.build

  installPlatform = installPlatform.toLowerCase()
  if (installPlatform === 'mac') {
    installPlatform = 'osx'
  }

  const privateBranchPassword = privateBranchesStore.get(appName, '')

  const installInfoStoreKey = `${appName}_${installPlatform}_${branch}_${build}_${privateBranchPassword}`

  if (installInfoStore.has(installInfoStoreKey)) {
    const cache = installInfoStore.get(installInfoStoreKey)
    if (cache) {
      logInfo(
        [
          'Got install info from cache for',
          appName,
          'on',
          installPlatform,
          'platform'
        ],
        LogPrefix.Gog
      )
      return cache
    }
  }

  if (!isOnline) {
    logWarning('App offline, unable to get install info')
    return
  }

  const credentials = await GOGUser.getCredentials()
  if (!credentials) {
    logError('No credentials, cannot get install info', LogPrefix.Gog)
    return
  }
  const gameData = getGameInfo(appName)

  if (!gameData) {
    logError('Game data falsy in getInstallInfo', LogPrefix.Gog)
    return
  }

  // We can't calculate install sizes for Linux-native games, so call gogdl info with "windows"
  const commandParts = [
    'info',
    appName,
    '--os',
    installPlatform,
    ...(branch !== 'null' ? ['--branch', branch] : []),
    ...(build ? ['--build', build] : [])
  ]

  if (privateBranchPassword.length) {
    commandParts.push('--password', privateBranchPassword)
  }

  const res = await runRunnerCommand(commandParts, {
    abortId: appName,
    logMessagePrefix: 'Getting game metadata'
  })

  if (!res.stdout || res.abort) {
    logError(
      `stdout = ${!!res.stdout} and res.abort = ${!!res.abort} in getInstallInfo`,
      LogPrefix.Gog
    )
    if (res.stderr.includes("Game doesn't support content system api")) {
      return {
        game: {
          app_name: appName,
          title: gameData.title,
          launch_options: [],
          owned_dlc: [],
          version: '',
          branches: [],
          buildId: ''
        },
        manifest: {
          app_name: appName,
          disk_size: 0,
          download_size: 0,
          languages: [],
          versionEtag: '',
          dependencies: [],
          perLangSize: { '*': { download_size: 0, disk_size: 0 } }
        }
      }
    }
    return
  }

  const errorMessage = (error: string) => {
    logError(
      ['Failed to get game metadata for', `${appName}:`, error],
      LogPrefix.Gog
    )
  }

  if (res.error) {
    errorMessage(res.error)
  }

  let gogInfo: GOGDLInstallInfo
  try {
    gogInfo = JSON.parse(res.stdout)
  } catch (error) {
    logError(
      ['Error when parsing JSON file on getInstallInfo', error],
      LogPrefix.Gog
    )
    return
  }

  let libraryArray = libraryStore.get('games', [])
  let gameObjectIndex = libraryArray.findIndex(
    (value) => value.app_name === appName
  )

  if (gameObjectIndex === -1) {
    await refresh()
    libraryArray = libraryStore.get('games', [])
    gameObjectIndex = libraryArray.findIndex(
      (value) => value.app_name === appName
    )
    if (gameObjectIndex === -1) {
      logWarning(
        ['getInstallInfo:', appName, 'not found in libraryStore'],
        LogPrefix.Gog
      )
      return
    }
  }

  if (
    !libraryArray[gameObjectIndex]?.gog_save_location &&
    installedGames.get(appName) &&
    installedGames.get(appName)?.platform !== 'linux'
  ) {
    gameData.gog_save_location = await getSaveSyncLocation(
      appName,
      installedGames.get(appName)!
    )
  }

  libraryArray[gameObjectIndex].folder_name = gogInfo.folder_name
  libraryArray[gameObjectIndex].gog_save_location = gameData?.gog_save_location
  gameData.folder_name = gogInfo.folder_name
  libraryStore.set('games', libraryArray)
  library.set(appName, gameData)

  let language = gogInfo.languages[0]
  const foundPreffered = i18next.languages.find((plang) =>
    gogInfo.languages.some((alang) => alang.startsWith(plang))
  )
  if (foundPreffered) {
    const foundAvailable = gogInfo.languages.find((alang) =>
      alang.startsWith(foundPreffered)
    )
    if (foundAvailable) {
      language = foundAvailable
    }
  }

  // Calculate highest possible size (with DLCs) for display on game page
  const download_size = gogInfo.download_size
    ? gogInfo.download_size
    : (gogInfo.size['*']?.download_size || 0) + // Universal depot
      (gogInfo.size[language]?.download_size || 0) + // Language depot
      gogInfo.dlcs.reduce(
        (acc, dlc) =>
          acc +
          (dlc.size['*']?.download_size || 0) + // Universal
          (dlc.size[language]?.download_size || 0), // Lanuage
        0
      )
  const disk_size = gogInfo.disk_size
    ? gogInfo.disk_size
    : (gogInfo.size['*']?.disk_size || 0) +
      (gogInfo.size[language]?.disk_size || 0) +
      gogInfo.dlcs.reduce(
        (acc, dlc) =>
          acc +
          (dlc.size['*']?.disk_size || 0) +
          (dlc.size[language]?.disk_size || 0),
        0
      )

  const info: GogInstallInfo = {
    game: {
      app_name: appName,
      title: gameData.title,
      owned_dlc: gogInfo.dlcs.map((dlc) => ({
        app_name: dlc.id,
        title: dlc.title,
        perLangSize: dlc.size
      })),
      version: gogInfo.versionName,
      launch_options: [],
      branches: gogInfo.available_branches,
      buildId: gogInfo.buildId
    },
    manifest: {
      download_size: download_size,
      disk_size: disk_size,
      perLangSize: gogInfo.size,
      app_name: appName,
      languages: gogInfo.languages,
      versionEtag: gogInfo.versionEtag,
      builds: gogInfo?.builds?.items,
      dependencies: gogInfo.dependencies
    }
  }
  installInfoStore.set(installInfoStoreKey, info)
  return info
}

/**
 * Loads installed data and adds it into a Map
 */
export function refreshInstalled() {
  const installedArray = installedGamesStore.get('installed', [])
  installedGames.clear()
  installedArray.forEach((value) => {
    if (!value.appName) {
      return
    }
    installedGames.set(value.appName, value)
  })
}

export async function changeGameInstallPath(
  appName: string,
  newInstallPath: string
) {
  const cachedGameData = library.get(appName)

  if (
    !cachedGameData ||
    !cachedGameData.install ||
    !cachedGameData.folder_name
  ) {
    logError(
      "Changing game install path failed: Game data couldn't be found",
      LogPrefix.Gog
    )
    return
  }

  const installedArray = installedGamesStore.get('installed', [])

  const gameIndex = installedArray.findIndex(
    (value) => value.appName === appName
  )

  if (cachedGameData.install.platform === 'osx') {
    newInstallPath = join(newInstallPath, cachedGameData.folder_name)
  }

  installedArray[gameIndex].install_path = newInstallPath
  cachedGameData.install.install_path = newInstallPath
  installedGamesStore.set('installed', installedArray)
}

export async function importGame(data: GOGImportData, executablePath: string) {
  const gameInfo = await getInstallInfo(data.appName)

  if (!gameInfo) {
    return
  }

  const installInfo: InstalledInfo = {
    appName: data.appName,
    install_path: executablePath,
    executable: executablePath,
    install_size: getFileSize(gameInfo.manifest?.disk_size),
    is_dlc: false,
    version: data.versionName,
    platform: data.platform,
    buildId: data.buildId,
    language: data.installedLanguage,
    installedDLCs: data.dlcs,
    installedWithDLCs: !!data.dlcs.length
  }
  installedGames.set(data.appName, installInfo)
  const gameData = library.get(data.appName)!
  gameData.install = installInfo
  gameData.is_installed = true
  library.set(data.appName, gameData)
  installedGamesStore.set('installed', Array.from(installedGames.values()))
  refreshInstalled()
  await createMissingGogdlManifest(data.appName)
  await checkForRedistUpdates()
  sendFrontendMessage('pushGameToLibrary', gameData)
}

// This checks for updates of Windows and Mac titles
// Linux installers need to be checked differently
export async function listUpdateableGames(): Promise<string[]> {
  if (!isOnline() || !GOGUser.isLoggedIn()) {
    return []
  }
  const credentials = await GOGUser.getCredentials()
  const installed = Array.from(installedGames.values())
  const updateable: Array<string> = []
  for (const game of installed) {
    if (!game.appName) {
      continue
    }

    if (game.pinnedVersion) {
      logWarning(
        ['Game', game.appName, 'has pinned version, update check skipped'],
        { prefix: LogPrefix.Gog }
      )
      continue
    }
    // use different check for linux games
    if (game.platform === 'linux') {
      if (!(await checkForLinuxInstallerUpdate(game.appName, game.version)))
        updateable.push(game.appName)
      continue
    }
    const hasUpdate = await checkForGameUpdate(
      game.appName,
      game.platform,
      game?.versionEtag,
      credentials?.access_token
    )
    if (hasUpdate) {
      updateable.push(game.appName)
    }
  }
  logInfo(`Found ${updateable.length} game(s) to update`, LogPrefix.Gog)
  return updateable
}

export async function checkForLinuxInstallerUpdate(
  appName: string,
  version: string
): Promise<boolean> {
  const response = await getProductApi(appName, ['downloads'])
  if (!response) return false

  const installers = response.data?.downloads?.installers ?? []
  for (const installer of installers) {
    if (installer.os === 'linux') {
      return installer.version === version
    }
  }
  return false
}

export async function getBuilds(
  appName: string,
  platform: string,
  access_token?: string
) {
  const url = new URL(
    `https://content-system.gog.com/products/${appName}/os/${platform}/builds?generation=2&_version=2`
  )
  const password = privateBranchesStore.get(appName, '')

  if (password.length) {
    url.searchParams.set('password', password)
  }

  const headers: Record<string, string> = {}
  if (access_token) {
    headers.Authorization = `Bearer ${access_token}`
  }

  return axiosClient.get(url.toString(), { headers })
}

export async function getMetaResponse(
  appName: string,
  platform: string,
  etag?: string,
  access_token?: string
) {
  const buildData = await getBuilds(appName, platform, access_token)
  const headers = etag
    ? {
        'If-None-Match': etag
      }
    : undefined
  const metaUrls =
    buildData.data?.items?.find((build: BuildItem) => !build.branch)?.urls ||
    buildData.data?.items[0]?.urls ||
    []

  for (const metaUrl of metaUrls) {
    try {
      const metaResponse = await axiosClient.get(metaUrl.url, {
        headers,
        validateStatus: (status) => status === 200 || status === 304
      })

      return { status: metaResponse.status, etag: metaResponse.headers.etag }
    } catch (e) {
      logDebug(
        `Failed to obtain manifest from CDN for ${appName}, ignoring ${e}`,
        {
          prefix: LogPrefix.Gog
        }
      )
      continue
    }
  }

  return { status: 304, etag: etag }
}

export async function checkForGameUpdate(
  appName: string,
  platform: string,
  etag?: string,
  access_token?: string
) {
  const metaResponse = await getMetaResponse(
    appName,
    platform,
    etag,
    access_token
  )

  return metaResponse.status === 200 && metaResponse.etag !== etag
}

/**
 * Convert GamesDBData and ProductEndpointData objects to GameInfo
 * That way it will be easly accessible on frontend
 */
export async function gogToUnifiedInfo(
  info: GamesDBData | undefined
): Promise<GameInfo> {
  if (!info || info.type !== 'game' || !info.game.visible_in_library) {
    // @ts-expect-error TODO: Handle this somehow
    return {}
  }
  const background = info.game.background?.url_format
    .replace('{formatter}', '')
    .replace('{ext}', 'webp')

  const art_cover =
    info.game?.logo?.url_format
      ?.replace('{formatter}', '')
      .replace('{ext}', 'jpg') ?? background

  const icon = (
    info.game?.square_icon?.url_format || info.game?.icon?.url_format
  )
    ?.replace('{formatter}', '')
    .replace('{ext}', 'jpg')

  const object: GameInfo = {
    runner: 'gog',
    developer: info.game.developers.map((dev) => dev.name).join(', '),
    app_name: String(info.external_id),
    art_cover,
    art_square:
      info.game.vertical_cover?.url_format
        .replace('{formatter}', '')
        .replace('{ext}', 'jpg') || art_cover, // fallback to art_cover if undefined
    art_background: background,
    cloud_save_enabled: false,
    art_icon: icon,
    extra: {
      about: { description: info.summary['*'], shortDescription: '' },
      reqs: [],
      genres: info.game.genres.map((genre) => genre.name['*'])
    },
    folder_name: '',
    install: {
      is_dlc: false
    },
    is_installed: false,
    save_folder: '',
    title: ((info.title['*'] || info.game.title['*']) ?? '').trim(),
    canRunOffline: true,
    is_mac_native: Boolean(
      info.supported_operating_systems.find((os) => os.slug === 'osx')
    ),
    is_linux_native: Boolean(
      info.supported_operating_systems.find((os) => os.slug === 'linux')
    ),
    thirdPartyManagedApp: undefined
  }

  return object
}
/**
 * Fetches data from gog about game
 * https://api.gog.com/v2/games
 * @param appName
 * @param lang optional language (falls back to english if is not supported)
 * @returns plain API response
 */
export async function getGamesData(appName: string, lang?: string) {
  const url = `https://api.gog.com/v2/games/${appName}?locale=${
    lang || 'en-US'
  }`

  const response: AxiosResponse | null = await axiosClient
    .get(url)
    .catch(() => {
      return null
    })
  if (!response) {
    return null
  }

  return response.data
}
/**
 * Creates Array based on returned from API
 * If no recommended data is present it just stays empty
 * There always should be minumum requirements
 * @param apiData
 * @param os
 * @returns parsed data used when rendering requirements on GamePage
 */
export async function createReqsArray(
  appName: string,
  os: 'windows' | 'linux' | 'osx'
) {
  if (!isOnline()) {
    return []
  }
  const apiData = await getGamesData(appName)
  if (!apiData) {
    return []
  }
  const operatingSystems = apiData._embedded.supportedOperatingSystems
  let requirements = operatingSystems.find(
    (value: { operatingSystem: { name: string } }) =>
      value.operatingSystem.name === os
  )

  if (!requirements) {
    return []
  } else {
    requirements = requirements.systemRequirements
  }
  if (requirements.length === 0) {
    return []
  }
  const minimum = requirements[0]
  const recommended = requirements.length > 1 ? requirements[1] : null
  const returnValue = []
  for (let i = 0; i < minimum.requirements.length; i++) {
    const object = {
      title: minimum.requirements[i].name.replace(':', ''),
      minimum: minimum.requirements[i].description,
      recommended: recommended && recommended.requirements[i]?.description
    }
    if (!object.minimum) {
      continue
    }
    returnValue.push(object)
  }
  return returnValue
}

/* Get product ids installed in for given game
 */
export function listInstalledProducts(appName: string): string[] {
  const installedData = installedGames.get(appName)
  if (!installedData) {
    return []
  }

  let root = installedData.install_path
  if (installedData.platform === 'osx') {
    root = join(root, 'Contents', 'Resources')
  }
  if (!existsSync(root)) {
    return []
  }

  const files = readdirSync(root)
  return files.reduce((acc, file) => {
    const matcher = file.match(/goggame-(\d+)\.info/)
    if (matcher) {
      acc.push(matcher[1])
    }
    return acc
  }, [] as string[])
}

/**
 * Reads goggame-appName.info file and returns JSON object of it
 * @param appName
 */
export function readInfoFile(
  appName: string,
  installPath?: string
): GOGGameDotInfoFile | undefined {
  const gameInfo = getGameInfo(appName)
  if (!gameInfo) {
    return
  }

  installPath = installPath ?? gameInfo?.install.install_path
  if (!installPath) {
    return
  }

  const infoFileName = `goggame-${appName}.info`
  let infoFilePath = join(installPath, infoFileName)

  if (gameInfo.install.platform === 'osx') {
    // Since mac games can only be installed on mac we don't need to check for current platfrom
    infoFilePath = join(installPath, 'Contents', 'Resources', infoFileName)
  }

  if (!existsSync(infoFilePath)) {
    return
  }

  let infoFileData: GOGGameDotInfoFile | undefined
  try {
    infoFileData = JSON.parse(readFileSync(infoFilePath, 'utf-8'))
  } catch (error) {
    logError(
      [`Error reading ${infoFilePath}, could not complete operation:`, error],
      LogPrefix.Gog
    )
  }
  if (!infoFileData) {
    return
  }

  if (!infoFileData.buildId) {
    const idFilePath = join(dirname(infoFilePath), `goggame-${appName}.id`)
    if (existsSync(idFilePath)) {
      try {
        const { buildId }: GOGGameDotIdFile = JSON.parse(
          readFileSync(idFilePath, 'utf-8')
        )
        infoFileData.buildId = buildId
      } catch (error) {
        logError([
          `Error reading ${idFilePath}, not adding buildId to game metadata:`,
          error
        ])
      }
    }
  }

  return infoFileData
}

export function getExecutable(appName: string): string {
  const jsonData = readInfoFile(appName)
  if (!jsonData) {
    throw new Error('No game metadata, cannot get executable')
  }
  const playTasks = jsonData.playTasks

  let primary = playTasks.find((task) => task.isPrimary)

  if (!primary) {
    primary = playTasks[0]
    if (!primary) {
      throw new Error('No play tasks in game metadata')
    }
  }

  if (primary.type === 'URLTask') {
    throw new Error(
      'Primary play task is an URL task, not sure what to do here'
    )
  }

  const workingDir = primary.workingDir

  if (workingDir) {
    return join(workingDir, primary.path)
  }
  return primary.path
}

/**
 * This function can be also used with outher stores
 * This endpoint doesn't require user to be authenticated.
 * @param store Indicates a store we have game_id from, like: epic, itch, humble, gog, uplay
 * @param game_id ID of a game
 * @param forceUpdate (optional) force data update check
 * @param certificate (optional) Galaxy library certificate
 * @param accessToken (optional) GOG Galaxy access token
 * multiple entries)
 * @returns object {isUpdated, data}, where isUpdated is true when Etags match
 */
export async function getGamesdbData(
  store: string,
  game_id: string,
  forceUpdate?: boolean,
  certificate?: string,
  accessToken?: string
): Promise<{ isUpdated: boolean; data?: GamesDBData | undefined }> {
  const pieceId = `${store}_${game_id}`
  const cachedData = !forceUpdate ? apiInfoCache.get(pieceId) : null
  if (cachedData && cachedData?.id && !forceUpdate) {
    return { isUpdated: false, data: apiInfoCache.get(pieceId) }
  }
  const url = `https://gamesdb.gog.com/platforms/${store}/external_releases/${game_id}`
  const headers = {
    ...(cachedData?.etag ? { 'If-None-Match': cachedData.etag } : {}),
    ...(certificate ? { 'X-GOG-Library-Cert': certificate } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  }

  const response = await axiosClient
    .get<GamesDBData>(url, { headers: headers })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get GamesDB data for ${game_id}`,
          error.response?.data
        ],
        LogPrefix.ExtraGameInfo
      )
      if (error.response?.status === 404) {
        return null
      }
      throw new Error('connection error', { cause: error })
    })

  if (!response) {
    return { isUpdated: false }
  }
  const resEtag = response.headers?.etag
  const isUpdated = cachedData?.etag === resEtag
  const data = response.data

  data.etag = resEtag
  apiInfoCache.set(pieceId, data)
  return {
    isUpdated,
    data
  }
}

/**
 * Handler of https://api.gog.com/products/ endpoint
 * @param appName id of game
 * @param expand expanded results to be returned
 * @returns raw axios response, or null if there was a error
 */
export async function getProductApi(
  appName: string,
  expand?: string[],
  accessToken?: string
): Promise<AxiosResponse<ProductsEndpointData> | null> {
  expand = expand ?? []
  const language = i18next.language
  const url = new URL(`https://api.gog.com/products/${appName}`)
  url.searchParams.set('locale', language)
  if (expand.length > 0) {
    url.searchParams.set('expand', expand.join(','))
  }

  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  // `https://api.gog.com/products/${appName}?locale=${language}${expandString}`
  const response = await axiosClient
    .get<ProductsEndpointData>(url.toString(), { headers })
    .catch(() => null)

  return response
}

/**
 * Gets array of possible installer languages
 * @param appName
 */
export async function getLinuxInstallersLanguages(appName: string) {
  const response = await getProductApi(appName, ['downloads'])
  if (response) {
    const installers = response.data?.downloads?.installers ?? []
    const linuxInstallers = installers.filter((value) => value.os === 'linux')
    const possibleLanguages: string[] = []

    for (const installer of linuxInstallers) {
      possibleLanguages.push(installer.language)
    }

    return possibleLanguages
  } else {
    return ['en-US']
  }
}

/**
 * For now returns a version (we can extend it later)
 * @param appName
 * @returns
 */
export async function getLinuxInstallerInfo(appName: string): Promise<
  | {
      version: string
    }
  | undefined
> {
  const response = await getProductApi(appName, ['downloads'])
  if (!response) {
    return
  }
  const installers = response.data?.downloads?.installers ?? []

  for (const installer of installers) {
    if (installer.os === 'linux')
      return {
        version: installer.version
      }
  }
  return
}

/**
 * Runs GOGDL with the given command
 * Note: For more comments, see runLegendaryCommand
 * @param commandParts The command to run, e. g. 'update', 'install'...
 */
export async function runRunnerCommand(
  commandParts: string[],
  options?: CallRunnerOptions
): Promise<ExecResult> {
  if (process.env.CI === 'e2e') {
    return runGogdlCommandStub(commandParts)
  }

  const { dir, bin } = getGOGdlBin()
  const authConfig = join(app.getPath('userData'), 'gog_store', 'auth.json')

  if (!options) {
    options = {}
  }
  if (!options.env) {
    options.env = {}
  }
  options.env.GOGDL_CONFIG_PATH = dirname(gogdlConfigPath)

  return callRunner(
    ['--auth-config-path', authConfig, ...commandParts],
    { name: 'gog', logPrefix: LogPrefix.Gog, bin, dir },
    {
      ...options,
      verboseLogFile: gogdlLogFile
    }
  )
}

/* eslint-disable @typescript-eslint/no-unused-vars */

export function installState(appName: string, state: boolean) {
  logWarning(`installState not implemented on GOG Library Manager`)
}

export function getLaunchOptions(appName: string): LaunchOption[] {
  const newLaunchOptions: LaunchOption[] = []
  const infoFile = readInfoFile(appName)
  infoFile?.playTasks.forEach((task, index) => {
    if (
      task.type === 'FileTask' &&
      !task?.isHidden &&
      task.category !== 'document'
    ) {
      newLaunchOptions.push({
        name: task?.name || infoFile.name,
        parameters: `--prefer-task ${index}` // gogdl parameter to launch specific task
      })
    }
  })
  if (newLaunchOptions.length < 2) {
    return []
  }

  return newLaunchOptions
}

export function changeVersionPinnedStatus(appName: string, status: boolean) {
  const game = library.get(appName)
  const installed = installedGames.get(appName)
  if (!game || !installed) {
    return
  }
  game.install.pinnedVersion = status
  installed.pinnedVersion = status
  library.set(appName, game)
  installedGames.set(appName, installed)

  const installedArray = installedGamesStore.get('installed', [])

  const index = installedArray.findIndex((iGame) => iGame.appName === appName)

  if (index > -1) {
    installedArray.splice(index, 1, installed)
  }
  installedGamesStore.set('installed', installedArray)
  sendFrontendMessage('pushGameToLibrary', game)
}

export function setCyberpunkModConfig(props: {
  enabled: boolean
  modsToLoad: string[]
}) {
  const cpId = '1423049311'
  const game = library.get(cpId)
  const installed = installedGames.get(cpId)
  if (!game || !installed) {
    return
  }

  installed.cyberpunk = {
    modsEnabled: props.enabled,
    modsToLoad: props.modsToLoad
  }

  game.install = installed
  const installedArray = installedGamesStore.get('installed', [])

  const index = installedArray.findIndex((iGame) => iGame.appName === cpId)

  if (index > -1) {
    installedArray.splice(index, 1, installed)
  }

  library.set(cpId, game)
  installedGames.set(cpId, installed)
  installedGamesStore.set('installed', installedArray)
  sendFrontendMessage('pushGameToLibrary', game)
}
