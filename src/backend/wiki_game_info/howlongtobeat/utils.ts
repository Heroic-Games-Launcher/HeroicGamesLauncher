import axios from 'axios'
import { logError, logInfo, LogPrefix } from 'backend/logger'

// this is a subset of the HowLongToBeatEntry type without some fields
export interface HeroicHowLongToBeatEntry {
  completionist: number
  mainStory: number
  mainExtra: number
  // Optional additional data from HowLongToBeat
  gameId?: number
  gameName?: string
  gameImageUrl?: string
  gameWebLink?: string
}

interface HltbGameData {
  game_id: number
  game_name: string
  game_image: string
  comp_main: number
  comp_plus: number
  comp_100: number
}

interface HltbSearchResponse {
  data: HltbGameData[]
}

const HLTB_BASE_URL = 'https://howlongtobeat.com'

async function getHltbToken(): Promise<string | null> {
  const url = `${HLTB_BASE_URL}/api/finder/init?t=${Date.now()}`
  try {
    const response = await axios.get(url, {
      headers: {
        referer: HLTB_BASE_URL,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    return response.data?.token || null
  } catch (error) {
    logError(['Error fetching HLTB token:', error], LogPrefix.ExtraGameInfo)
    return null
  }
}

export async function getHowLongToBeat(
  title: string
): Promise<HeroicHowLongToBeatEntry | null> {
  logInfo(`Getting HowLongToBeat data for ${title}`, LogPrefix.ExtraGameInfo)

  const token = await getHltbToken()
  if (!token) {
    return null
  }

  const searchUrl = `${HLTB_BASE_URL}/api/finder`
  const payload = {
    searchType: 'games',
    searchTerms: title.split(' '),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: 0, max: 0 },
        gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
        rangeYear: { min: '', max: '' },
        modifier: ''
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '',
      sort: 0,
      randomizer: 0
    }
  }

  try {
    const response = await axios.post<HltbSearchResponse>(searchUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
        referer: HLTB_BASE_URL,
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    const info = response.data?.data
    if (!info || info.length === 0) {
      logError(
        `No HowLongToBeat data found for ${title}`,
        LogPrefix.ExtraGameInfo
      )
      return null
    }

    const game: HltbGameData = info[0]

    // New API returns values in seconds, converting to hours
    const mainStory = game.comp_main ? Math.round(game.comp_main / 3600) : 0
    const mainExtra = game.comp_plus ? Math.round(game.comp_plus / 3600) : 0
    const completionist = game.comp_100 ? Math.round(game.comp_100 / 3600) : 0

    return {
      mainStory,
      mainExtra,
      completionist,
      gameId: game.game_id,
      gameName: game.game_name || undefined,
      gameImageUrl: game.game_image
        ? `${HLTB_BASE_URL}/games/${game.game_image}`
        : undefined,
      gameWebLink: game.game_id
        ? `${HLTB_BASE_URL}/game/${game.game_id}`
        : undefined
    }
  } catch (error) {
    logError(
      [`Error searching HLTB data for ${title}:`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}
