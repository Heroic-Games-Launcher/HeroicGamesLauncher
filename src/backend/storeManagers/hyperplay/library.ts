import { sendFrontendMessage } from '../../main_window'
import { hpLibraryStore } from './electronStore'
import {
  CallRunnerOptions,
  ExecResult,
  GameInfo,
  HyperPlayInstallInfo,
  HyperPlayRelease,
  InstallPlatform
} from 'common/types'
import axios from 'axios'
import { logInfo, LogPrefix, logError, logWarning } from 'backend/logger/logger'
import { handleArchAndPlatform } from './utils'
import { getGameInfo as getGamesGameInfo } from './games'

export async function addGameToLibrary(appId: string) {
  const currentLibrary = hpLibraryStore.get('games', [])

  // TODO refactor this to constant time check with a set
  // not important for alpha release
  const sameGameInLibrary = currentLibrary.find((val) => {
    return val.app_name === appId
  })

  if (sameGameInLibrary !== undefined) {
    return
  }

  const res = await axios.get<HyperPlayRelease[]>(
    `https://developers.hyperplay.xyz/api/listings?id=${appId}`
  )

  const data = res.data[0]

  const isWebGame = Object.hasOwn(data.releaseMeta.platforms, 'web')

  const gameInfo: GameInfo = {
    app_name: data._id,
    extra: {
      about: {
        description: data.projectMeta.description,
        shortDescription: data.projectMeta.short_description
      },
      reqs: [
        {
          minimum: JSON.stringify(data.projectMeta.systemRequirements),
          recommended: JSON.stringify(data.projectMeta.systemRequirements),
          title: data.projectMeta.name
        }
      ],
      storeUrl: `https://store.hyperplay.xyz/game/${data.projectName}`
    },
    thirdPartyManagedApp: undefined,
    web3: { supported: true },
    runner: 'hyperplay',
    title: data.projectMeta.name,
    art_cover: data.releaseMeta.image,
    art_square: data.projectMeta.main_capsule,
    is_installed: Boolean(data.releaseMeta.platforms.web),
    cloud_save_enabled: false,
    namespace: '',
    developer: data.accountName,
    store_url: `https://store.hyperplay.xyz/game/${data.projectName}`,
    folder_name: data.projectName,
    save_folder: '',
    is_mac_native: false,
    is_linux_native: false,
    canRunOffline: false,
    install: isWebGame ? { platform: 'web' } : {},
    releaseMeta: data.releaseMeta,
    version: data.releaseName
  }

  if (isWebGame) {
    gameInfo.browserUrl = data.releaseMeta.platforms.web.external_url
  }

  hpLibraryStore.set('games', [...currentLibrary, gameInfo])

  sendFrontendMessage('refreshLibrary')
}

export const getInstallInfo = async (
  appName: string,
  platformToInstall: InstallPlatform
): Promise<HyperPlayInstallInfo | undefined> => {
  const gameInfo = getGamesGameInfo(appName)
  if (!gameInfo || !gameInfo.releaseMeta) {
    return undefined
  }

  logInfo(`Getting install info for ${gameInfo.title}`, LogPrefix.HyperPlay)

  const requestedPlatform = handleArchAndPlatform(
    platformToInstall,
    gameInfo.releaseMeta
  )

  const info = gameInfo.releaseMeta.platforms[requestedPlatform]

  if (!info) {
    logError(
      `No install info for ${appName} and ${requestedPlatform}`,
      LogPrefix.HyperPlay
    )
    return undefined
  }
  const download_size = info.downloadSize
  const install_size = info.installSize
  return {
    game: info,
    manifest: {
      download_size,
      install_size,
      disk_size: install_size,
      url: info.external_url
    }
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */

export function installState(appName: string, state: boolean) {
  logWarning(`installState not implemented on HyperPlay Library Manager`)
}

/**
 * Refreshes the game info for a game
 * @param appId the id of the game
 * @returns void
 **/
export async function refreshHPGameInfo(appId: string): Promise<void> {
  const gameIdUrl = `https://developers.hyperplay.xyz/api/listings?id=${appId}`
  const currentLibrary = hpLibraryStore.get('games', []) as GameInfo[]
  const gameIndex = currentLibrary.findIndex((val) => val.app_name === appId)
  if (gameIndex === -1) {
    return
  }
  const currentInfo = currentLibrary[gameIndex]
  const res = await axios.get<HyperPlayRelease>(gameIdUrl)
  const data = res.data[0] as HyperPlayRelease
  const gameInfo: GameInfo = {
    ...currentInfo,
    extra: {
      ...currentInfo.extra,
      about: {
        description: data.projectMeta.description,
        shortDescription: data.projectMeta.short_description
      },
      reqs: [
        {
          minimum: JSON.stringify(data.projectMeta.systemRequirements),
          recommended: JSON.stringify(data.projectMeta.systemRequirements),
          title: data.projectMeta.name
        }
      ]
    },
    art_square:
      data.projectMeta.main_capsule ||
      data.releaseMeta.image ||
      currentInfo.art_square,
    art_cover:
      data.releaseMeta.image ||
      data.projectMeta.main_capsule ||
      currentInfo.art_cover,
    releaseMeta: data.releaseMeta
  }
  currentLibrary[gameIndex] = gameInfo
  return hpLibraryStore.set('games', currentLibrary)
}

const defaultExecResult = {
  stderr: '',
  stdout: ''
}

/**
 * Refreshes the entire library
 * this is a very expensive operation
 * and should be used sparingly
 * it is recommended to use `refreshHPGameInfo` instead
 * if you only want to refresh a single game
 * this is only used when the user clicks the refresh button
 * in the library
 **/
export async function refresh() {
  const currentLibrary = hpLibraryStore.get('games', []) as GameInfo[]
  const currentLibraryIds = currentLibrary.map((val) => val.app_name)
  for (const gameId of currentLibraryIds) {
    try {
      await refreshHPGameInfo(gameId)
    } catch (err) {
      logError(
        `Could not refresh HyperPlay Game with appId = ${gameId}`,
        LogPrefix.HyperPlay
      )
    }
  }
  return defaultExecResult
}

export function getGameInfo(
  appName: string,
  forceReload?: boolean
): GameInfo | undefined {
  logWarning(`getGameInfo not implemented on HyperPlay Library Manager`)
  return undefined
}

export async function updateAllLibraryReleaseData() {
  const allListingsResponse = await axios.get(
    'https://developers.hyperplay.xyz/api/listings'
  )
  interface listingMapType {
    [key: string]: HyperPlayRelease
  }
  const listingMap: listingMapType = {}
  const allListingsRemote = allListingsResponse.data as HyperPlayRelease[]

  allListingsRemote.forEach((element) => {
    listingMap[element._id] = element
  })

  const updateableGames: string[] = []
  const currentHpLibrary = hpLibraryStore.get('games', [])
  currentHpLibrary.map((localReleaseData, index) => {
    const remoteReleaseData = listingMap[localReleaseData.app_name]
    //copy remote data to local release data in library
    throw 'ERROR updateAllLibraryReleaseData NOT IMPLEMENTED!'
  })
}

/* returns array of app names (i.e. _id's) for game releases that are out of date
 * a game's app name is only returned if the game is installed
 * since library release data is updated on each app launch
 */
export async function listUpdateableGames(): Promise<string[]> {
  logWarning(`listUpdateableGames not implemented on HyperPlay Library Manager`)
  const allListingsResponse = await axios.get(
    'https://developers.hyperplay.xyz/api/listings'
  )
  interface listingMapType {
    [key: string]: HyperPlayRelease
  }
  const listingMap: listingMapType = {}
  const allListingsRemote = allListingsResponse.data as HyperPlayRelease[]

  allListingsRemote.forEach((element) => {
    listingMap[element._id] = element
  })

  const updateableGames: string[] = []
  const currentHpLibrary = hpLibraryStore.get('games', [])
  currentHpLibrary.map((val) => {
    if (val.version === undefined) {
      updateableGames.push(val.app_name)
    }
    if (
      gameIsInstalled(val) &&
      val.install.version !== listingMap[val.app_name].releaseName
    ) {
      updateableGames.push(val.app_name)
    }
  })

  function gameIsInstalled(val: GameInfo) {
    return Object.keys(val.install).length > 0
  }

  return updateableGames
}

export async function runRunnerCommand(
  commandParts: string[],
  abortController: AbortController,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  logWarning(`runRunnerCommand not implemented on HyperPlay Library Manager`)
  return { stdout: '', stderr: '' }
}

export async function changeGameInstallPath(
  appName: string,
  newPath: string
): Promise<void> {
  logWarning(
    `changeGameInstallPath not implemented on HyperPlay Library Manager`
  )
}
