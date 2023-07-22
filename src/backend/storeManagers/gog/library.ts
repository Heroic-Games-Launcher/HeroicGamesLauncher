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
  ProductsEndpointData
} from 'common/types/gog'
import { basename, join } from 'node:path'
import { existsSync, readFileSync } from 'graceful-fs'
import { app } from 'electron'

import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import { getGOGdlBin, getFileSize } from '../../utils'
import { gogdlLogFile } from '../../constants'
import {
  libraryStore,
  installedGamesStore,
  installInfoStore,
  apiInfoCache
} from './electronStores'
import { callRunner } from '../../launcher'
import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { isOnline } from '../../online_monitor'
import i18next from 'i18next'

const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

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
  const clientId = readInfoFile(appName, install.install_path)?.clientId

  if (!clientId) {
    logWarning(
      `No clientId in goggame-${appName}.info file. Cannot resolve save path`
    )
    return
  }

  let response: GOGClientsResponse | undefined
  try {
    response = (
      await axios.get(
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
    }
  }

  return objects
}

export async function refresh(): Promise<ExecResult> {
  if (!GOGUser.isLoggedIn()) {
    return defaultExecResult
  }
  refreshInstalled()
  for (const game of libraryStore.get('games', [])) {
    const copyObject = { ...game }
    if (installedGames.has(game.app_name)) {
      copyObject.install = installedGames.get(game.app_name)!
      copyObject.is_installed = true
    }
    library.set(game.app_name, copyObject)
  }

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

  const gamesObjects: GameInfo[] = []
  apiInfoCache.use_in_memory() // Prevent blocking operations
  const promises = filteredApiArray.map(async (game): Promise<GameInfo> => {
    let retries = 5
    while (retries > 0) {
      const { data } = await getGamesdbData(
        'gog',
        game.external_id,
        false,
        game.certificate,
        credentials.access_token
      ).catch(() => ({
        data: null
      }))
      const product = await getProductApi(game.external_id).catch(() => null)
      if (!data) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        retries -= 1
        continue
      }
      const unifiedObject = await gogToUnifiedInfo(data, product?.data)
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
      return copyObject
    }
    throw new Error('Exceeeded max number of retries')
  })

  // Await in chunks of 10
  const chunks: Array<Array<Promise<GameInfo>>> = []
  while (promises.length) {
    chunks.push(promises.splice(0, 10))
  }

  for (const chunk of chunks) {
    const settled = await Promise.allSettled(chunk)
    const fulfilled = settled
      .filter((promise) => promise.status === 'fulfilled')
      //@ts-expect-error Typescript is confused about this filter statement, it's correct however
      .map((promise: PromiseFulfilledResult<GameInfo>) => promise.value)

    fulfilled.forEach((data: GameInfo) => {
      if (data?.app_name) {
        sendFrontendMessage('pushGameToLibrary', data)
        library.set(data.app_name, data)
      }
    })
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
 * when os is Linux: gets Windows build data.
 * Contains data like download size
 * @param appName
 * @param installPlatform
 * @param lang
 * @returns InstallInfo object
 */
export async function getInstallInfo(
  appName: string,
  installPlatform = 'windows',
  lang = 'en-US'
): Promise<GogInstallInfo | undefined> {
  installPlatform = installPlatform.toLowerCase()
  if (installPlatform === 'linux') {
    installPlatform = 'windows'
  }
  if (installPlatform === 'mac') {
    installPlatform = 'osx'
  }

  if (installInfoStore.has(`${appName}_${installPlatform}`)) {
    const cache = installInfoStore.get(`${appName}_${installPlatform}`)
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
  const gameData = library.get(appName)

  if (!gameData) {
    logError('Game data falsy in getInstallInfo', LogPrefix.Gog)
    return
  }

  // We can't calculate install sizes for Linux-native games, so call gogdl info with "windows"
  const commandParts = [
    'info',
    appName,
    '--token',
    `"${credentials.access_token}"`,
    `--lang=${lang}`,
    '--os',
    installPlatform === 'linux' ? 'windows' : installPlatform
  ]

  const res = await runRunnerCommand(
    commandParts,
    createAbortController(appName),
    {
      logMessagePrefix: 'Getting game metadata'
    }
  )

  deleteAbortController(appName)

  if (!res.stdout || res.abort) {
    logError(
      `stdout = ${!!res.stdout} and res.abort = ${!!res.abort} in getInstallInfo`,
      LogPrefix.Gog
    )
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

  let gogInfo
  try {
    gogInfo = JSON.parse(res.stdout)
  } catch (error) {
    logError(
      ['Error when parsing JSON file on getInstallInfo', error],
      LogPrefix.Gog
    )
    return
  }

  // some games don't support `en-US`
  if (!gogInfo.languages && gogInfo.languages.includes(lang)) {
    // if the game supports `en-us`, use it, else use the first valid language
    const newLang = gogInfo.languages.includes('en-us')
      ? 'en-us'
      : gogInfo.languages[0]

    // call itself with the new language and return
    const infoWithLang = await getInstallInfo(appName, installPlatform, newLang)
    return infoWithLang
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
  const info: GogInstallInfo = {
    game: {
      app_name: appName,
      title: gameData.title,
      owned_dlc: gogInfo.dlcs,
      version: gogInfo.versionName,
      launch_options: [],
      buildId: gogInfo!.buildId
    },
    manifest: {
      disk_size: Number(gogInfo.disk_size),
      download_size: Number(gogInfo.download_size),
      app_name: appName,
      languages: gogInfo.languages,
      versionEtag: gogInfo.versionEtag
    }
  }
  installInfoStore.set(`${appName}_${installPlatform}`, info)
  if (!info) {
    logWarning(
      [
        'Failed to get Install Info for',
        `${appName}`,
        `using ${installPlatform} as platform,`,
        'returning empty object'
      ],
      LogPrefix.Gog
    )
    // @ts-expect-error TODO: Handle this better
    return {}
  }
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
    installedWithDLCs: data.installedWithDlcs
  }
  installedGames.set(data.appName, installInfo)
  const gameData = library.get(data.appName)!
  gameData.install = installInfo
  gameData.is_installed = true
  library.set(data.appName, gameData)
  installedGamesStore.set('installed', Array.from(installedGames.values()))
}

// This checks for updates of Windows and Mac titles
// Linux installers need to be checked differently
export async function listUpdateableGames(): Promise<string[]> {
  if (!isOnline()) {
    return []
  }
  const installed = Array.from(installedGames.values())
  const updateable: Array<string> = []
  for (const game of installed) {
    if (!game.appName) {
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
      game?.versionEtag
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

export async function getMetaResponse(
  appName: string,
  platform: string,
  etag?: string
) {
  const buildData = await axios.get(
    `https://content-system.gog.com/products/${appName}/os/${platform}/builds?generation=2`
  )
  const headers = etag
    ? {
        'If-None-Match': etag
      }
    : undefined
  const metaUrl =
    buildData.data?.items?.find((build: BuildItem) => !build.branch)?.link ||
    buildData.data?.items[0]?.link
  const metaResponse = await axios.get(metaUrl, {
    headers,
    validateStatus: (status) => status === 200 || status === 304
  })
  return { status: metaResponse.status, etag: metaResponse.headers.etag }
}

export async function checkForGameUpdate(
  appName: string,
  platform: string,
  etag?: string
) {
  const metaResponse = await getMetaResponse(appName, platform, etag)

  return metaResponse.status === 200
}

/**
 * Convert GamesDBData and ProductEndpointData objects to GameInfo
 * That way it will be easly accessible on frontend
 */
export async function gogToUnifiedInfo(
  info: GamesDBData | undefined,
  galaxyProductInfo: ProductsEndpointData | undefined
): Promise<GameInfo> {
  if (
    !info ||
    info.type !== 'game' ||
    !info.game.visible_in_library ||
    (galaxyProductInfo && galaxyProductInfo.game_type === 'pack')
  ) {
    // @ts-expect-error TODO: Handle this somehow
    return {}
  }
  const object: GameInfo = {
    runner: 'gog',
    store_url: galaxyProductInfo?.links.product_card,
    developer: info.game.developers.map((dev) => dev.name).join(', '),
    app_name: String(info.external_id),
    art_cover:
      info.game?.logo?.url_format
        ?.replace('{formatter}', '')
        .replace('{ext}', 'jpg') || `https:${galaxyProductInfo?.images.logo2x}`,
    art_square: info.game.vertical_cover.url_format
      .replace('{formatter}', '')
      .replace('{ext}', 'jpg'),
    cloud_save_enabled: false,
    extra: {
      about: { description: info.summary['*'], shortDescription: '' },
      reqs: [],
      storeUrl: galaxyProductInfo?.links.product_card
    },
    folder_name: '',
    install: {
      is_dlc: false
    },
    installable:
      (galaxyProductInfo?.content_system_compatibility.osx ||
        galaxyProductInfo?.content_system_compatibility.windows ||
        galaxyProductInfo?.content_system_compatibility.linux) ??
      false,
    is_installed: false,
    namespace: galaxyProductInfo?.slug,
    save_folder: '',
    title: galaxyProductInfo?.title ?? info.game.title['en-US'] ?? '',
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

  const response: AxiosResponse | null = await axios.get(url).catch(() => {
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
      `Error reading ${infoFilePath}, could not complete operation`,
      LogPrefix.Gog
    )
  }
  if (!infoFileData) {
    return
  }

  if (!infoFileData.buildId) {
    const idFilePath = join(basename(infoFilePath), `goggame-${appName}.id`)
    if (existsSync(idFilePath)) {
      try {
        const { buildId }: GOGGameDotIdFile = JSON.parse(
          readFileSync(idFilePath, 'utf-8')
        )
        infoFileData.buildId = buildId
      } catch (error) {
        logError(
          `Error reading ${idFilePath}, not adding buildId to game metadata`
        )
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
 * @param access_token (optional) GOG Galaxy access token
 * @returns object {isUpdated, data}, where isUpdated is true when Etags match
 */
export async function getGamesdbData(
  store: string,
  game_id: string,
  forceUpdate?: boolean,
  certificate?: string,
  access_token?: string
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
    ...(access_token ? { Authorization: `Bearer ${access_token}` } : {})
  }

  const response = await axios
    .get<GamesDBData>(url, { headers: headers })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get GamesDB data for ${game_id}`,
          error.response?.data.error_description
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
  expand?: string[]
): Promise<AxiosResponse<ProductsEndpointData> | null> {
  expand = expand ?? []
  const language = i18next.language
  const url = new URL(`https://api.gog.com/products/${appName}`)
  url.searchParams.set('locale', language)
  if (expand.length > 0) {
    url.searchParams.set('expand', expand.join(','))
  }
  // `https://api.gog.com/products/${appName}?locale=${language}${expandString}`
  const response = await axios
    .get<ProductsEndpointData>(url.toString())
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
      possibleLanguages.push(installer.language as string)
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
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getGOGdlBin()
  const authConfig = join(app.getPath('userData'), 'gog_store', 'auth.json')
  return callRunner(
    ['--auth-config-path', authConfig, ...commandParts],
    { name: 'gog', logPrefix: LogPrefix.Gog, bin, dir },
    abortController,
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
