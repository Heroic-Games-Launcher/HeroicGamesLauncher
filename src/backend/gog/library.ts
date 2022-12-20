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
  GOGClientsResponse
} from 'common/types/gog'
import { basename, join } from 'node:path'
import { existsSync, readFileSync } from 'graceful-fs'

import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { getGOGdlBin, getFileSize } from '../utils'
import { fallBackImage, gogdlLogFile } from '../constants'
import {
  apiInfoCache,
  libraryStore,
  installedGamesStore
} from './electronStores'
import { callRunner } from '../launcher'
import {
  createAbortController,
  deleteAbortController
} from '../utils/aborthandler/aborthandler'
import { isOnline } from '../online_monitor'

export class GOGLibrary {
  private static globalInstance: GOGLibrary

  private library: Map<string, GameInfo> = new Map()
  private installedGames: Map<string, InstalledInfo> = new Map()

  private constructor() {
    this.refreshInstalled()
  }
  public async getSaveSyncLocation(
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
    const clientId = this.readInfoFile(appName, install.install_path)?.clientId

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
        { prefix: LogPrefix.Gog }
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
  private async getGamesWithFeatures(
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
          { prefix: LogPrefix.Gog }
        )
      })

    if (!games) {
      return []
    }

    gameArray.push(...games.data.products)
    const numberOfPages = games?.data.totalPages
    for (let page = 2; page <= numberOfPages; page++) {
      logInfo(['Getting data for page', String(page)], {
        prefix: LogPrefix.Gog
      })
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

  public async sync() {
    if (!GOGUser.isLoggedIn()) {
      return
    }
    this.refreshInstalled()
    for (const game of libraryStore.get('games', []) as GameInfo[]) {
      const copyObject = { ...game }
      if (this.installedGames.has(game.app_name)) {
        copyObject.install = this.installedGames.get(game.app_name)!
        copyObject.is_installed = true
      }
      this.library.set(game.app_name, copyObject)
    }

    if (!isOnline()) {
      return
    }

    // This gets games ibrary
    // Handles multiple pages
    const credentials = await GOGUser.getCredentials()
    if (!credentials) {
      return
    }
    const headers = {
      Authorization: 'Bearer ' + credentials.access_token,
      'User-Agent': 'GOGGalaxyClient/2.0.45.61 (GOG Galaxy)'
    }
    logInfo('Getting GOG library', { prefix: LogPrefix.Gog })
    let gameApiArray: Array<GOGGameInfo> = []
    const games = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title',
        { headers }
      )
      .catch((e: AxiosError) => {
        logError(['There was an error getting games library data', e.message], {
          prefix: LogPrefix.Gog
        })
        return null
      })

    if (!games) {
      logError('There was an error Loading games library', {
        prefix: LogPrefix.Gog
      })
      return
    }

    if (games?.data?.products) {
      const numberOfPages = games?.data.totalPages
      logInfo(['Number of library pages:', numberOfPages], {
        prefix: LogPrefix.Gog
      })
      gameApiArray = [...games.data.products]
      for (let page = 2; page <= numberOfPages; page++) {
        logInfo(['Getting data for page', String(page)], {
          prefix: LogPrefix.Gog
        })
        const pageData = await axios.get(
          `https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title&page=${page}`,
          { headers }
        )
        if (pageData.data?.products) {
          gameApiArray = [...gameApiArray, ...pageData.data.products]
        }
      }
    }

    const gamesObjects: GameInfo[] = []
    const gamesArray = libraryStore.get('games', []) as GameInfo[]
    const isConfigCloudSavesReady = libraryStore.get(
      'cloud_saves_enabled',
      false
    )
    const cloudSavesEnabledGames = await this.getGamesWithFeatures(['512'])
    for (const game of gameApiArray as GOGGameInfo[]) {
      let unifiedObject = gamesArray
        ? gamesArray.find((value) => value.app_name === String(game.id))
        : null
      if (!unifiedObject || !isConfigCloudSavesReady) {
        let apiData = apiInfoCache.get(String(game.id)) as {
          isUpdated: boolean
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: any
        }
        if (!apiData) {
          const { data } = await GOGLibrary.getGamesdbData(
            'gog',
            String(game.id)
          )
          apiData = data
          apiInfoCache.set(String(game.id), apiData)
        }
        unifiedObject = await this.gogToUnifiedInfo(
          game,
          apiData,
          cloudSavesEnabledGames
        )
      }
      gamesObjects.push(unifiedObject)
      const installedInfo = this.installedGames.get(String(game.id))
      // If game is installed, verify if installed game supports cloud saves
      if (
        !isConfigCloudSavesReady &&
        !cloudSavesEnabledGames.includes(String(game.id)) &&
        installedInfo &&
        installedInfo?.platform !== 'linux'
      ) {
        const saveLocations = await this.getSaveSyncLocation(
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
      this.library.set(String(game.id), copyObject)
    }
    libraryStore.set('games', gamesObjects)
    libraryStore.set('totalGames', games.data.totalProducts)
    libraryStore.set('totalMovies', games.data.moviesCount)
    libraryStore.set('cloud_saves_enabled', true)
    logInfo('Saved games data', { prefix: LogPrefix.Gog })
  }

  public static get() {
    if (!this.globalInstance) {
      GOGLibrary.globalInstance = new GOGLibrary()
    }
    return this.globalInstance
  }

  public getGameInfo(slug: string): GameInfo | undefined {
    return this.library.get(slug) || this.getInstallAndGameInfo(slug)
  }

  public getInstallAndGameInfo(slug: string): GameInfo | undefined {
    const lib = libraryStore.get('games')

    if (!Array.isArray(lib)) {
      return
    }

    const game: GameInfo = lib.find((value) => value.app_name === slug)

    if (!game) {
      return
    }
    const installedInfo = this.installedGames.get(game.app_name)
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
   * @returns InstallInfo object
   */
  public async getInstallInfo(
    appName: string,
    installPlatform = 'windows',
    lang = 'en-US'
  ): Promise<GogInstallInfo | undefined> {
    const credentials = await GOGUser.getCredentials()
    if (!credentials) {
      logError('No credentials, cannot get install info')
      return
    }
    const gameData = this.library.get(appName)

    if (!gameData) {
      return
    }

    installPlatform = installPlatform.toLowerCase()

    switch (installPlatform) {
      case 'linux':
        installPlatform = 'windows'
        break
      case 'mac':
        installPlatform = 'osx'
        break
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

    const res = await runGogdlCommand(
      commandParts,
      createAbortController(appName),
      {
        logMessagePrefix: 'Getting game metadata'
      }
    )

    deleteAbortController(appName)

    if (!res.stdout || res.abort) {
      return
    }

    const errorMessage = (error: string) => {
      logError(['Failed to get game metadata for', `${appName}:`, error], {
        prefix: LogPrefix.Gog
      })
    }

    if (res.error) {
      errorMessage(res.error)
    }

    let gogInfo
    try {
      gogInfo = JSON.parse(res.stdout)
    } catch (error) {
      logError(['Error when parsing JSON file on getInstallInfo', error], {
        prefix: LogPrefix.Gog
      })
      return
    }

    // some games don't support `en-US`
    if (!gogInfo.languages && gogInfo.languages.includes(lang)) {
      // if the game supports `en-us`, use it, else use the first valid language
      const newLang = gogInfo.languages.includes('en-us')
        ? 'en-us'
        : gogInfo.languages[0]

      // call itself with the new language and return
      const infoWithLang = await this.getInstallInfo(
        appName,
        installPlatform,
        newLang
      )
      return infoWithLang
    }

    let libraryArray = libraryStore.get('games', []) as GameInfo[]
    let gameObjectIndex = libraryArray.findIndex(
      (value) => value.app_name === appName
    )

    if (gameObjectIndex === -1) {
      await this.sync()
      libraryArray = libraryStore.get('games', []) as GameInfo[]
      gameObjectIndex = libraryArray.findIndex(
        (value) => value.app_name === appName
      )
      if (gameObjectIndex === -1) {
        logWarning(['getInstallInfo:', appName, 'not found in libraryStore'], {
          prefix: LogPrefix.Gog
        })
        return
      }
    }

    if (
      !libraryArray[gameObjectIndex]?.gog_save_location &&
      this.installedGames.get(appName) &&
      this.installedGames.get(appName)?.platform !== 'linux'
    ) {
      gameData.gog_save_location = await this.getSaveSyncLocation(
        appName,
        this.installedGames.get(appName)!
      )
    }

    libraryArray[gameObjectIndex].folder_name = gogInfo.folder_name
    libraryArray[gameObjectIndex].gog_save_location =
      gameData?.gog_save_location
    gameData.folder_name = gogInfo.folder_name
    libraryStore.set('games', libraryArray)
    this.library.set(appName, gameData)
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
    return info
  }

  /**
   * Loads installed data and adds it into a Map
   */
  public refreshInstalled() {
    const installedArray =
      (installedGamesStore.get('installed', []) as Array<InstalledInfo>) || []
    this.installedGames.clear()
    installedArray.forEach((value) => {
      if (!value.appName) {
        return
      }
      this.installedGames.set(value.appName, value)
    })
  }

  public changeGameInstallPath(appName: string, newInstallPath: string) {
    const cachedGameData = this.library.get(appName)

    if (!cachedGameData) {
      logError(
        "Changing game install path failed: Game data couldn't be found",
        { prefix: LogPrefix.Gog }
      )
      return
    }

    const installedArray =
      (installedGamesStore.get('installed', []) as Array<InstalledInfo>) || []

    const gameIndex = installedArray.findIndex(
      (value) => value.appName === appName
    )

    installedArray[gameIndex].install_path = newInstallPath
    cachedGameData.install.install_path = newInstallPath
    installedGamesStore.set('installed', installedArray)
  }
  public async importGame(data: GOGImportData, path: string) {
    const gameInfo = await this.getInstallInfo(data.appName)

    if (!gameInfo) {
      return
    }

    const installInfo: InstalledInfo = {
      appName: data.appName,
      install_path: path,
      executable: '',
      install_size: getFileSize(gameInfo.manifest?.disk_size),
      is_dlc: false,
      version: data.versionName,
      platform: data.platform,
      buildId: data.buildId,
      installedWithDLCs: data.installedWithDlcs
    }
    this.installedGames.set(data.appName, installInfo)
    const gameData = this.library.get(data.appName)!
    gameData.install = installInfo
    gameData.is_installed = true
    this.library.set(data.appName, gameData)
    installedGamesStore.set(
      'installed',
      Array.from(this.installedGames.values())
    )
  }

  // This checks for updates of Windows and Mac titles
  // Linux installers need to be checked differently
  public async listUpdateableGames(): Promise<string[]> {
    if (!isOnline()) {
      return []
    }
    const installed = Array.from(this.installedGames.values())
    const updateable: Array<string> = []
    for (const game of installed) {
      if (!game.appName) {
        continue
      }
      // use different check for linux games
      if (game.platform === 'linux') {
        if (
          !(await this.checkForLinuxInstallerUpdate(game.appName, game.version))
        )
          updateable.push(game.appName)
        continue
      }
      const hasUpdate = await this.checkForGameUpdate(
        game.appName,
        game.platform,
        game?.versionEtag
      )
      if (hasUpdate) {
        updateable.push(game.appName)
      }
    }
    logInfo(`Found ${updateable.length} game(s) to update`, {
      prefix: LogPrefix.Gog
    })
    return updateable
  }

  public async checkForLinuxInstallerUpdate(
    appName: string,
    version: string
  ): Promise<boolean> {
    const response = await GOGLibrary.getProductApi(appName, ['downloads'])
    if (!response) return false

    const installers = response.data?.downloads?.installers
    for (const installer of installers) {
      if (installer.os === 'linux') {
        return installer.version === version
      }
    }
    return false
  }

  public async checkForGameUpdate(
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
  public async gogToUnifiedInfo(
    info: GOGGameInfo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gamesdbData: any,
    cloudSavesEnabledGames: string[]
  ): Promise<GameInfo> {
    let developer = ''
    let verticalCover = fallBackImage
    let horizontalCover: string
    let description = ''
    if (gamesdbData?.game) {
      const developers: Array<string> = []
      for (const developer of gamesdbData.game.developers) {
        developers.push(developer.name)
      }
      developer = developers.join(', ')
      if (gamesdbData.game.vertical_cover?.url_format) {
        verticalCover = gamesdbData.game.vertical_cover.url_format
          .replace('{formatter}', '')
          .replace('{ext}', 'jpg')
      }
      horizontalCover = `https:${info.image}.jpg`
      description = gamesdbData.game.summary['*']
    } else {
      logWarning(
        `Unable to get covers from gamesdb for ${info.title}. Trying to get it from api.gog.com`,
        { prefix: LogPrefix.Gog }
      )
      const apiData = await this.getGamesData(String(info.id))
      if (apiData?._links?.boxArtImage) {
        verticalCover = apiData._links.boxArtImage.href
      } else {
        logWarning(
          "Couldn't get info from api.gog.com, Using fallback vertical image",
          { prefix: LogPrefix.Gog }
        )
        verticalCover = fallBackImage
      }
      horizontalCover = `https:${info.image}.jpg`
    }

    const object: GameInfo = {
      runner: 'gog',
      store_url: `https://gog.com${info.url}`,
      developer: developer,
      app_name: String(info.id),
      art_cover: horizontalCover,
      art_square: verticalCover,
      cloud_save_enabled: cloudSavesEnabledGames.includes(String(info.id)),
      extra: {
        about: { description: description, longDescription: '' },
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
  public async getGamesData(appName: string, lang?: string) {
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
  public async createReqsArray(
    appName: string,
    os: 'windows' | 'linux' | 'osx'
  ) {
    if (!isOnline()) {
      return []
    }
    const apiData = await this.getGamesData(appName)
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
  public readInfoFile(
    appName: string,
    installPath?: string
  ): GOGGameDotInfoFile | undefined {
    const gameInfo = this.getGameInfo(appName)
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
      logError(`Error reading ${infoFilePath}, could not complete operation`, {
        prefix: LogPrefix.Gog
      })
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

  public getExecutable(appName: string): string {
    const jsonData = this.readInfoFile(appName)
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
  public static async getGamesdbData(
    store: string,
    game_id: string,
    etag?: string
  ) {
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
      return { isUpdated: false, data: {} }
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
  public static async getProductApi(appName: string, expand?: string[]) {
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
  public static async getLinuxInstallersLanguages(appName: string) {
    const response = await GOGLibrary.getProductApi(appName, ['downloads'])
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
  public static async getLinuxInstallerInfo(appName: string): Promise<
    | {
        version: string
      }
    | undefined
  > {
    const response = await GOGLibrary.getProductApi(appName, ['downloads'])
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
}

/**
 * Runs GOGDL with the given command
 * Note: For more comments, see runLegendaryCommand
 * @param commandParts The command to run, e. g. 'update', 'install'...
 */
export async function runGogdlCommand(
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
