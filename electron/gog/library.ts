import axios, { AxiosError, AxiosResponse } from 'axios'
import { GOGUser } from './user'
import {
  GOGGameInfo,
  GameInfo,
  InstallInfo,
  InstalledInfo,
  GOGImportData,
  ExecResult,
  CallRunnerOptions,
  GOGCloudSavesLocation
} from '../types'
import { join } from 'node:path'
import { existsSync, readFileSync } from 'graceful-fs'

import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import { getGOGdlBin, getFileSize, isOnline } from '../utils'
import { fallBackImage } from '../constants'
import {
  apiInfoCache,
  libraryStore,
  installedGamesStore
} from './electronStores'
import { callRunner } from '../launcher'

export class GOGLibrary {
  private static globalInstance: GOGLibrary = null
  private library: Map<string, null | GameInfo> = new Map()
  private installedGames: Map<string, null | InstalledInfo> = new Map()

  private constructor() {
    this.refreshInstalled()
  }
  public async getSaveSyncLocation(
    appName: string,
    install: InstalledInfo
  ): Promise<GOGCloudSavesLocation[] | null> {
    let syncPlatform = 'Windows'
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
      return null
    }
    const response = await axios
      .get(
        `https://remote-config.gog.com/components/galaxy_client/clients/${clientId}?component_version=2.0.45`
      )
      .catch((error) => {
        logError(
          ['Failed to get remote config information for', appName, `${error}`],
          LogPrefix.Gog
        )
        return null
      })
    if (!response) {
      return null
    }
    const platformInfo = response.data.content[syncPlatform]
    const savesInfo = platformInfo.cloudStorage
    if (!savesInfo.enabled) {
      return null
    }

    const locations = savesInfo.locations

    return locations
  }
  /**
   * Returns ids of games with requested features ids
   * @param features
   * @returns
   */
  private async getGamesWithFeatures(features: string[] = ['512']) {
    const credentials = await GOGUser.getCredentials()
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
        return null
      })

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

  public async sync() {
    if (!GOGUser.isLoggedIn()) {
      return
    }
    this.refreshInstalled()

    if (!isOnline()) {
      for (const game of libraryStore.get('games', []) as GameInfo[]) {
        const copyObject = { ...game }
        if (this.installedGames.has(game.app_name)) {
          copyObject.install = this.installedGames.get(game.app_name)
          copyObject.is_installed = true
        }
        this.library.set(game.app_name, copyObject)
      }
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
    logInfo('Getting GOG library', LogPrefix.Gog)
    let gameApiArray: Array<GOGGameInfo> = []
    const games = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=1&sortBy=title',
        { headers }
      )
      .catch((e: AxiosError) => {
        logError(
          ['There was an error getting games library data', e.message],
          LogPrefix.Gog
        )
        return null
      })

    if (!games) {
      logError('There was an error Loading games library', LogPrefix.Gog)
      return
    }

    if (games?.data?.products) {
      const numberOfPages = games?.data.totalPages
      logInfo(['Number of library pages:', numberOfPages], LogPrefix.Gog)
      gameApiArray = [...games.data.products]
      for (let page = 2; page <= numberOfPages; page++) {
        logInfo(['Getting data for page', String(page)], LogPrefix.Gog)
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
    logInfo('Saved games data', LogPrefix.Gog)
  }

  public static get() {
    if (this.globalInstance === null) {
      GOGLibrary.globalInstance = new GOGLibrary()
    }
    return this.globalInstance
  }

  public getGameInfo(slug: string): GameInfo {
    return this.library.get(slug) || this.getInstallAndGameInfo(slug) || null
  }

  public getInstallAndGameInfo(slug: string): GameInfo {
    const lib = libraryStore.get('games')

    if (!Array.isArray(lib)) {
      return
    }

    const game: GameInfo = lib.find((value) => value.app_name === slug)

    if (!game) return null
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
  public async getInstallInfo(appName: string, installPlatform = 'windows') {
    const credentials = await GOGUser.getCredentials()
    if (!credentials) {
      logError('No credentials, cannot get install info')
      return
    }
    const gameData = this.library.get(appName)

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
      '--lang=en-US',
      '--os',
      installPlatform
    ]

    logInfo('Getting game metadata.', LogPrefix.Gog)

    const res = await runGogdlCommand(commandParts)
    if (res.error) {
      logError(
        ['Failed to get game metadata for', `${appName}:`, res.error],
        LogPrefix.Gog
      )
    }

    const gogInfo = JSON.parse(res.stdout)
    const libraryArray = libraryStore.get('games', []) as GameInfo[]
    const gameObjectIndex = libraryArray.findIndex(
      (value) => value.app_name === appName
    )
    if (
      !libraryArray[gameObjectIndex].gog_save_location &&
      this.installedGames.get(appName) &&
      this.installedGames.get(appName)?.platform !== 'linux'
    ) {
      gameData.gog_save_location = await this.getSaveSyncLocation(
        appName,
        this.installedGames.get(appName)
      )
    }
    libraryArray[gameObjectIndex].folder_name = gogInfo.folder_name
    libraryArray[gameObjectIndex].gog_save_location = gameData.gog_save_location
    gameData.folder_name = gogInfo.folder_name
    libraryStore.set('games', libraryArray)
    this.library.set(appName, gameData)
    const info: InstallInfo = {
      game: {
        app_name: appName,
        title: gameData.title,
        owned_dlc: gogInfo.dlcs,
        version: gogInfo.versionName,
        launch_options: [],
        platform_versions: null,
        buildId: gogInfo.buildId
      },
      manifest: {
        disk_size: Number(gogInfo.disk_size),
        download_size: Number(gogInfo.download_size),
        app_name: appName,
        install_tags: [],
        launch_exe: '',
        prerequisites: null,
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
      this.installedGames.set(value.appName, value)
    })
  }

  public changeGameInstallPath(appName: string, newInstallPath: string) {
    const cachedGameData = this.library.get(appName)

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
    const installInfo: InstalledInfo = {
      appName: data.appName,
      install_path: path,
      executable: '',
      install_size: getFileSize(
        (await this.getInstallInfo(data.appName)).manifest.disk_size
      ),
      is_dlc: false,
      version: data.versionName,
      platform: data.platform,
      buildId: data.buildId,
      installedWithDLCs: data.installedWithDlcs
    }
    this.installedGames.set(data.appName, installInfo)
    const gameData = this.library.get(data.appName)
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
        game?.versionEtag,
        game.platform
      )
      if (hasUpdate) {
        updateable.push(game.appName)
      }
    }
    logInfo(`Found ${updateable.length} game(s) to update`, LogPrefix.Gog)
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
  }

  public async checkForGameUpdate(
    appName: string,
    etag: string,
    platform: string
  ) {
    const buildData = await axios.get(
      `https://content-system.gog.com/products/${appName}/os/${platform}/builds?generation=2`
    )
    const metaUrl = buildData.data?.items[0]?.link
    const headers = etag
      ? {
          'If-None-Match': etag
        }
      : null
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
    let developer: string
    let verticalCover = fallBackImage
    let horizontalCover: string
    let description: string
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
        LogPrefix.Gog
      )
      const apiData = await this.getGamesData(String(info.id))
      if (apiData?._links?.boxArtImage) {
        verticalCover = apiData._links.boxArtImage.href
      } else {
        logWarning(
          "Couldn't get info from api.gog.com, Using fallback vertical image",
          LogPrefix.Gog
        )
        verticalCover = fallBackImage
      }
      horizontalCover = `https:${info.image}.jpg`
    }

    const object: GameInfo = {
      runner: 'gog',
      store_url: `https://gog.com${info.url}`,
      developer: developer || '',
      app_name: String(info.id),
      art_logo: null,
      art_cover: horizontalCover,
      art_square: verticalCover,
      cloud_save_enabled: cloudSavesEnabledGames.includes(String(info.id)),
      compatible_apps: [],
      extra: {
        about: { description: description, shortDescription: '' },
        reqs: []
      },
      folder_name: '',
      install: {
        version: null,
        executable: '',
        install_path: '',
        install_size: '',
        is_dlc: false,
        platform: ''
      },
      is_game: true,
      is_installed: false,
      is_ue_asset: false,
      is_ue_plugin: false,
      is_ue_project: false,
      namespace: info.slug,
      save_folder: '',
      title: info.title,
      canRunOffline: true,
      is_mac_native: info.worksOn.Mac,
      is_linux_native: info.worksOn.Linux
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
    const url = `https://api.gog.com/v2/games/${appName}${
      lang ?? '?locale=' + lang
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
  public async createReqsArray(
    appName: string,
    os: 'windows' | 'linux' | 'osx'
  ) {
    if (!isOnline()) {
      return []
    }
    const apiData = await this.getGamesData(appName)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readInfoFile(appName: string, installPath?: string): any {
    const gameInfo = this.getGameInfo(appName)
    if (!gameInfo) {
      return
    }
    const infoFileName = `goggame-${appName}.info`
    let infoFilePath = join(
      installPath ? installPath : gameInfo.install.install_path,
      infoFileName
    )

    if (gameInfo.install.platform === 'osx') {
      // Since mac games can only be installed on mac we don't need to check for current platfrom
      infoFilePath = join(
        installPath ? installPath : gameInfo.install.install_path,
        'Contents',
        'Resources',
        infoFileName
      )
    }

    if (existsSync(infoFilePath)) {
      const fileData = readFileSync(infoFilePath, { encoding: 'utf-8' })

      try {
        const jsonData = JSON.parse(fileData)
        return jsonData
      } catch (error) {
        logError(
          `Error reading ${fileData}, could not complete operation`,
          LogPrefix.Gog
        )
      }
    }
    return {}
  }

  public getExecutable(appName: string): string {
    const jsonData = this.readInfoFile(appName)
    const playTasks = jsonData.playTasks

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const primary = playTasks.find((value: any) => value?.isPrimary)

    const workingDir = primary?.workingDir

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
    const headers = {
      'If-None-Match': etag
    }

    const response = await axios
      .get(url, { headers: etag ? headers : {} })
      .catch(() => {
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
   * @returns raw axios response null when there was a error
   */
  public static async getProductApi(appName: string, expand?: string[]) {
    const isExpanded = expand?.length > 0
    let expandString = '?expand='
    if (isExpanded) {
      expandString += expand.join(',')
    }
    const url = `https://api.gog.com/products/${appName}${
      isExpanded ? expandString : ''
    }`
    const response: AxiosResponse = await axios.get(url).catch(() => null)

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
      const possibleLanguages = []

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
  public static async getLinuxInstallerInfo(appName: string): Promise<{
    version: string
  } | null> {
    const response = await GOGLibrary.getProductApi(appName, ['downloads'])
    if (response) {
      const installers = response.data?.downloads?.installers

      for (const installer of installers) {
        if (installer.os === 'linux')
          return {
            version: installer.version
          }
      }
    } else {
      logError("Couldn't get installer info")
      return null
    }
  }
}

/**
 * Runs GOGDL with the given command
 * Note: For more comments, see runLegendaryCommand
 * @param commandParts The command to run, e. g. 'update', 'install'...
 */
export async function runGogdlCommand(
  commandParts: string[],
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const { dir, bin } = getGOGdlBin()
  return callRunner(
    commandParts,
    { name: 'gog', logPrefix: LogPrefix.Gog, bin, dir },
    options
  )
}
