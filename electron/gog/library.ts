/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from 'axios'
import Store from 'electron-store'
import { GOGUser } from './user'
import { GOGLoginData, GOGGameInfo, GameInfo } from '../types'
import { logError, logInfo } from '../logger'

const userStore = new Store({
  cwd: 'gog_store'
})
const gamesDbCacheStore = new Store({ cwd: 'gog_store', name: 'gamesdb_cache' })
const libraryStore = new Store({ cwd: 'gog_store', name: 'library' })

export class GOGLibrary {
  private static library: Map<string, null | GameInfo> = new Map()

  public static async sync() {
    if (!GOGUser.isLoggedIn()) {
      return
    }
    if (GOGUser.isTokenExpired()) {
      await GOGUser.refreshToken()
    }
    // This gets games and movies library
    // In the future handle multiple pages
    const credentials: GOGLoginData = userStore.get(
      'credentials'
    ) as GOGLoginData
    const headers = { Authorization: 'Bearer ' + credentials.access_token }
    logInfo('Getting GOG library')
    const games = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=1&totalPages=1&sortBy=title',
        { headers: headers }
      )
      .catch((e: AxiosError) => {
        logError(
          'GOG: There was an error getting games library data',
          e.message
        )
        return null
      })

    const movies = await axios
      .get(
        'https://embed.gog.com/account/getFilteredProducts?mediaType=2&totalPages=1&sortBy=title',
        { headers: headers }
      )
      .catch((e: AxiosError) => {
        logError(
          'GOG: There was an error getting movies library data',
          e.message
        )
        return null
      })

    if (games) {
      const gamesObjects: GameInfo[] = []
      for (const game of games.data.products as GOGGameInfo[]) {
        let gamesDbData = gamesDbCacheStore.get(game.slug)
        if (!gamesDbData) {
          const fetchedData = await this.get_gamesdb_data(
            'gog',
            String(game.id),
            ''
          )
          if (fetchedData.data?.id) {
            gamesDbCacheStore.set(game.slug, fetchedData.data)
          }
          gamesDbData = fetchedData.data
        }
        const gameInfoObject = this.gogToUnifiedInfo(game, gamesDbData)
        gamesObjects.push(gameInfoObject)
        this.library.set(game.slug, gameInfoObject)
      }
      libraryStore.set('games', gamesObjects)
      libraryStore.set('totalGames', games.data.totalProducts)
      libraryStore.set('totalMovies', games.data.moviesCount)
      logInfo('GOG: Saved games data')
    }
    if (movies) {
      libraryStore.set('movies', movies.data.products)
      logInfo('GOG: Saved movies data')
    }
  }

  public static getGameInfo(slug: string): GameInfo {
    const info = this.library.get(slug)
    if (!info) {
      return null
    }
    return info
  }

  /**
   * Convert GOGGameInfo object to GameInfo
   * That way it will be easly accessible on frontend
   */
  public static gogToUnifiedInfo(info: GOGGameInfo, gamesdb: any): GameInfo {
    const developersArray: any[] = []
    let developer: string
    let verticalCover: string
    let horizontalCover: string
    if (gamesdb.game) {
      developer = developersArray.join(', ')
      verticalCover = gamesdb.game.vertical_cover.url_format
        .replace('{formatter}', '')
        .replace('{ext}', 'webp')

      // horizontalCover = gamesdb.game.background.url_format
      //   .replace('{formatter}', '')
      //   .replace('{ext}', 'webp')
    } else {
      horizontalCover = `https:${info.image}.webp`
      verticalCover = horizontalCover
    }
    horizontalCover = `https:${info.image}.webp`

    const object: GameInfo = {
      store: 'gog',
      developer: developer || '',
      app_name: info.slug,
      art_logo: null,
      art_cover: horizontalCover,
      art_square: verticalCover,
      cloud_save_enabled: false,
      compatible_apps: [],
      extra: undefined,
      folder_name: '',
      install: {
        version: '',
        is_dlc: false,
        install_size: '',
        install_path: '',
        executable: '',
        platform: ''
      },
      is_game: true,
      is_installed: false,
      is_ue_asset: false,
      is_ue_plugin: false,
      is_ue_project: false,
      namespace: '',
      save_folder: '',
      title: info.title,
      canRunOffline: true,
      is_mac_native: info.worksOn.Mac,
      is_linux_native: info.worksOn.Linux
    }

    return object
  }

  /**
   * This function can be also with outher stores
   * This endpoint doesn't require user to be authenticated.
   * @param store Indicates a store we have game_id from like: epic, itch, humble, gog, uplay
   * @param game_id ID of a game
   * @param etag (optional) value returned in response, works as checksum so we can check if we have up to date data
   */
  public static async get_gamesdb_data(
    store: string,
    game_id: string,
    etag: string
  ) {
    const url = `https://gamesdb.gog.com/platforms/${store}/external_releases/${game_id}`
    const headers = {
      'If-None-Match': etag
    }

    const response = await axios.get(url, { headers }).catch(() => {
      return null
    })
    if (!response) return { isUpdated: false, data: {} }
    const isUpdated = response.status != 304
    let data = null
    if (isUpdated) {
      data = response.data
      data.etag = response.headers.etag
    }
    return {
      isUpdated,
      data
    }
  }
}
