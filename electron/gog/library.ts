import axios, { AxiosError } from 'axios'
import Store from 'electron-store'
import { GOGUser } from './user'
import { GOGLoginData } from '../types'
import { logError, logInfo } from '../logger'

const userStore = new Store({
  cwd: 'gog_store'
})
const libraryStore = new Store({ cwd: 'gog_store', name: 'library' })

export class GOGLibrary {
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
      libraryStore.set('games', games.data.products)
      libraryStore.set('totalGames', games.data.totalProducts)
      libraryStore.set('totalMovies', games.data.moviesCount)
      logInfo('GOG: Saved games data')
    }
    if (movies) {
      libraryStore.set('movies', movies.data.products)
      logInfo('GOG: Saved movies data')
    }
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
