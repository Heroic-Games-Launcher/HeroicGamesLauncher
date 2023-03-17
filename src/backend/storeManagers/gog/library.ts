import { sendFrontendMessage } from '../../main_window'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { GOGUser } from './user'
import {
  GOGGameInfo,
  GameInfo,
  InstalledInfo,
  GOGImportData,
  ExecResult,
  CallRunnerOptions
} from 'common/types'
import {
  GOGCloudSavesLocation,
  GOGGameDotInfoFile,
  GogInstallInfo,
  GOGGameDotIdFile,
  GOGClientsResponse,
  GamesDBData,
  Library
} from 'common/types/gog'
import { basename, dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'graceful-fs'

import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import { getGOGdlBin, getFileSize } from '../../utils'
import { fallBackImage, gogdlLogFile } from '../../constants'
import {
  apiInfoCache,
  libraryStore,
  installedGamesStore,
  gogInstallInfoStore
} from './electronStores'
import { callRunner } from '../../launcher'
import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { isOnline } from '../../online_monitor'

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
  return savesInfo.locations
}
/**
 * Returns ids of games with requested features ids
 * @param features
 * @returns
 */
async function getGamesWithFeatures(
  features: string[] = ['512']
): Promise<string[]> {
  const credentials = await GOGUser.getCredentials()
  if (!credentials) {
    return []
  }

  const headers = {
    Authorization: 'Bearer ' + credentials.access_token,
    'User-Agent': 'GOGGalaxyClient/2.0.45.61 (GOG Galaxy)'
  }
  const gameArray = []
  const games = await axios
    .get(
      `https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title&feature=${features.join()}`,
      { headers }
    )
    .catch((e: AxiosError) => {
      logError(
        [
          'There was an error getting games with features',
          `${features}`,
          `${e.message}`
        ],
        LogPrefix.Gog
      )
    })

  if (!games) {
    return []
  }

  gameArray.push(...games.data.products)
  const numberOfPages = games?.data.totalPages
  for (let page = 2; page <= numberOfPages; page++) {
    logInfo(['Getting data for page', String(page)], LogPrefix.Gog)
    const pageData = await axios.get(
      `https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title&page=${page}&features=${features.join()}`,
      { headers }
    )
    if (pageData.data?.products) {
      gameArray.push(...pageData.data.products)
    }
  }

  return gameArray.map((value) => String(value.id))
}

const defaultExecResult = {
  stderr: '',
  stdout: ''
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
  const headers = {
    Authorization: 'Bearer ' + credentials.access_token,
    'User-Agent': 'GOGGalaxyClient/2.0.45.61 (GOG Galaxy)'
  }
  logInfo('Getting GOG library', LogPrefix.Gog)
  const gameApiArray: GOGGameInfo[] = []
  const games: Library | null = await axios
    .get(
      'https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title',
      { headers }
    )
    .then(({ data }) => data)
    .catch((e: AxiosError) => {
      logError(
        ['There was an error getting games library data', e.message],
        LogPrefix.Gog
      )
      return null
    })

  if (!games) {
    logError('There was an error Loading games library', LogPrefix.Gog)
    return defaultExecResult
  }

  if (games.products.length) {
    const numberOfPages = games.totalPages
    logInfo(['Number of library pages:', numberOfPages], LogPrefix.Gog)
    gameApiArray.push(...games.products)
    for (let page = 2; page <= numberOfPages; page++) {
      logInfo(['Getting data for page', String(page)], LogPrefix.Gog)
      const pageData: Library | null = await axios
        .get(
          `https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title&page=${page}`,
          { headers }
        )
        .then(({ data }) => data)
        .catch((e) => {
          logError(
            [
              'There was an error getting games library data for page',
              page,
              e.message
            ],
            {
              prefix: LogPrefix.Gog
            }
          )
          return null
        })
      if (pageData && pageData.products.length) {
        gameApiArray.push(...pageData.products)
      }
    }
  }

  const gamesObjects: GameInfo[] = []
  const gamesArray = libraryStore.get('games', [])
  const isConfigCloudSavesReady = libraryStore.get('cloud_saves_enabled', false)
  const cloudSavesEnabledGames = await getGamesWithFeatures(['512'])
  for (const game of gameApiArray) {
    let unifiedObject = gamesArray
      ? gamesArray.find((value) => value.app_name === String(game.id))
      : null
    if (!unifiedObject || !isConfigCloudSavesReady) {
      unifiedObject = await gogToUnifiedInfo(game, cloudSavesEnabledGames)
    }
    gamesObjects.push(unifiedObject)
    const installedInfo = installedGames.get(String(game.id))
    // If game is installed, verify if installed game supports cloud saves
    if (
      !isConfigCloudSavesReady &&
      !cloudSavesEnabledGames.includes(String(game.id)) &&
      installedInfo &&
      installedInfo?.platform !== 'linux'
    ) {
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
    library.set(String(game.id), copyObject)
  }
  libraryStore.set('games', gamesObjects)
  libraryStore.set('totalGames', games.totalProducts)
  libraryStore.set('totalMovies', games.moviesCount)
  libraryStore.set('cloud_saves_enabled', true)
  logInfo('Saved games data', LogPrefix.Gog)

  // fetch images async
  fetchImages()
  return defaultExecResult
}

export async function fetchImages() {
  if (!GOGUser.isLoggedIn()) {
    return
  }

  const lib = libraryStore.get('games', [])

  // only process games with no image
  const gamesWithNoImage = lib.filter(
    (game) => game.art_square === fallBackImage
  )
  let changed = false // flag to only save and notify the frontend if something changed

  // split games in chunks of 20 to fetch info in parallel
  const chunks: GameInfo[][] = []
  while (gamesWithNoImage.length) {
    chunks.push(gamesWithNoImage.splice(0, 20))
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (game) => {
      // try gamesdb.gog.com
      const { isUpdated, data } = await getGamesdbData(
        'gog',
        String(game.app_name)
      )

      if (data) {
        // if data available, update the game in memory
        let newImageUrl = data?.game?.vertical_cover?.url_format
        if (newImageUrl && newImageUrl !== game.art_square) {
          newImageUrl = newImageUrl
            .replace('{formatter}', '')
            .replace('{ext}', 'jpg')
          apiInfoCache.set(String(game.app_name), { isUpdated, data })
          game.art_square = newImageUrl
          game.developer = data.game.developers
            .map((dev) => dev.name)
            .join(', ')
          if (game.extra !== undefined && game.extra.about !== undefined)
            game.extra.about.description = data.game.summary['*']
          changed = true
        }
      } else {
        // if no data, try api api.gog.com
        const apiData = await getGamesData(String(game.app_name))
        if (apiData?._links?.boxArtImage) {
          game.art_square = apiData._links.boxArtImage.href
          changed = true
        }
      }

      return game
    })

    // update lib array with the upated games from the current chunk
    const results = await Promise.all(promises)
    results.forEach((game) => {
      const index = lib.findIndex((g) => g.app_name === game.app_name)
      if (index !== -1) {
        lib[index] = game
      }
    })
  }

  // if any game changed, store the new updated array and notify the frontend
  // without this it may end up in an infinite loop since the frontend triggers
  // another refresh
  if (changed) {
    libraryStore.set('games', lib)
    sendFrontendMessage('refreshLibrary')
  }
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
  if (gogInstallInfoStore.has(`${appName}_${installPlatform}`)) {
    const cache = gogInstallInfoStore.get_nodefault(
      `${appName}_${installPlatform}`
    )
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

  const commandParts = [
    'info',
    appName,
    '--token',
    `"${credentials.access_token}"`,
    `--lang=${lang}`,
    '--os',
    installPlatform
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
  gogInstallInfoStore.set(`${appName}_${installPlatform}`, info)
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

  if (!cachedGameData) {
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
    install_path: dirname(executablePath),
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

  const installers = response.data?.downloads?.installers
  for (const installer of installers) {
    if (installer.os === 'linux') {
      return installer.version === version
    }
  }
  return false
}

export async function checkForGameUpdate(
  appName: string,
  platform: string,
  etag?: string
) {
  const buildData = await axios.get(
    `https://content-system.gog.com/products/${appName}/os/${platform}/builds?generation=2`
  )
  const metaUrl = buildData.data?.items[0]?.link
  const headers = etag
    ? {
        'If-None-Match': etag
      }
    : undefined
  const metaResponse = await axios.get(metaUrl, {
    headers,
    validateStatus: (status) => status === 200 || status === 304
  })

  return metaResponse.status === 200
}

/**
 * Convert GOGGameInfo object to GameInfo
 * That way it will be easly accessible on frontend
 */
export async function gogToUnifiedInfo(
  info: GOGGameInfo,
  cloudSavesEnabledGames: string[]
): Promise<GameInfo> {
  const object: GameInfo = {
    runner: 'gog',
    store_url: `https://gog.com${info.url}`,
    developer: '',
    app_name: String(info.id),
    art_cover: info.image,
    art_square: fallBackImage,
    cloud_save_enabled: cloudSavesEnabledGames.includes(String(info.id)),
    extra: {
      about: { description: '', shortDescription: '' },
      reqs: [],
      storeUrl: `https://gog.com${info.url}`
    },
    folder_name: '',
    install: {
      is_dlc: false
    },
    is_installed: false,
    namespace: info.slug,
    save_folder: '',
    title: info.title,
    canRunOffline: true,
    is_mac_native: info.worksOn.Mac,
    is_linux_native: info.worksOn.Linux,
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
  const url = `https://api.gog.com/v2/games/${appName}?locale=${lang || 'en'}`

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
 * @param etag (optional) value returned in response, works as checksum so we can check if we have up to date data
 * @returns object {isUpdated, data}, where isUpdated is true when Etags match
 */
export async function getGamesdbData(
  store: string,
  game_id: string,
  etag?: string
): Promise<{ isUpdated: boolean; data?: GamesDBData | undefined }> {
  const url = `https://gamesdb.gog.com/platforms/${store}/external_releases/${game_id}`
  const headers = etag
    ? {
        'If-None-Match': etag
      }
    : undefined

  const response = await axios.get(url, { headers: headers }).catch(() => {
    return null
  })
  if (!response) {
    return { isUpdated: false }
  }
  const resEtag = response.headers.etag
  const isUpdated = etag === resEtag
  const data = response.data

  data.etag = resEtag
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
export async function getProductApi(appName: string, expand?: string[]) {
  expand = expand ?? []
  const expandString = expand.length ? '?expand=' + expand.join(',') : ''
  const url = `https://api.gog.com/products/${appName}${expandString}`
  const response = await axios.get(url).catch(() => null)

  return response
}

/**
 * Gets array of possible installer languages
 * @param appName
 */
export async function getLinuxInstallersLanguages(appName: string) {
  const response = await getProductApi(appName, ['downloads'])
  if (response) {
    const installers = response.data?.downloads?.installers
    const linuxInstallers = installers.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (value: any) => value.os === 'linux'
    )
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
  const installers = response.data?.downloads?.installers

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
  return callRunner(
    commandParts,
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
