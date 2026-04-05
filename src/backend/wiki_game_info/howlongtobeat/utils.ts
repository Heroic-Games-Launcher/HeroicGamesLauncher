import axios from 'axios'
import { logError, logInfo, LogPrefix } from 'backend/logger'

export interface HeroicHowLongToBeatEntry {
  completionist: number
  mainStory: number
  mainExtra: number
  gameId?: number
  gameName?: string
  gameImageUrl?: string
  gameWebLink?: string
}

const HLTB_BASE_URL = 'https://howlongtobeat.com'

async function getGameDataById(
  gameId: string
): Promise<HeroicHowLongToBeatEntry | null> {
  try {
    const gameUrl = `${HLTB_BASE_URL}/game/${gameId}`

    const response = await axios.get(gameUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: HLTB_BASE_URL,
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000,
      validateStatus: (status) => status < 500
    })

    if (response.status !== 200) {
      return null
    }

    // Extract game data from Next.js props
    const html = response.data
    const nextDataMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
    )

    if (!nextDataMatch) {
      return null
    }

    const nextData = JSON.parse(nextDataMatch[1])
    const gameData = nextData.props?.pageProps?.game?.data?.game?.[0]

    if (!gameData || !gameData.game_id) {
      return null
    }

    // Values are in seconds, converting to hours
    const mainStory = gameData.comp_main
      ? Math.round(gameData.comp_main / 3600)
      : 0
    const mainExtra = gameData.comp_plus
      ? Math.round(gameData.comp_plus / 3600)
      : 0
    const completionist = gameData.comp_100
      ? Math.round(gameData.comp_100 / 3600)
      : 0

    return {
      mainStory,
      mainExtra,
      completionist,
      gameId: gameData.game_id,
      gameName: gameData.game_name || undefined,
      gameImageUrl: gameData.game_image
        ? `${HLTB_BASE_URL}/games/${gameData.game_image}`
        : undefined,
      gameWebLink: gameData.game_id
        ? `${HLTB_BASE_URL}/game/${gameData.game_id}`
        : undefined
    }
  } catch (error) {
    logError(
      [`Error fetching HLTB game data for ID ${gameId}:`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
}

export async function getHowLongToBeat(
  title: string,
  hltbId?: string
): Promise<HeroicHowLongToBeatEntry | null> {
  logInfo(
    `Getting HowLongToBeat data for ${title}${hltbId ? ` (ID: ${hltbId})` : ''}`,
    LogPrefix.ExtraGameInfo
  )

  if (hltbId) {
    const gameData = await getGameDataById(hltbId)
    if (gameData) {
      return gameData
    }
    logInfo(`HLTB ID ${hltbId} not found for ${title}`, LogPrefix.ExtraGameInfo)
  }

  logInfo(
    `No HLTB ID available for ${title}, cannot fetch data`,
    LogPrefix.ExtraGameInfo
  )
  return null
}
