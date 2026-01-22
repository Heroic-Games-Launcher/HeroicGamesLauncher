import { logError, logInfo, LogPrefix } from 'backend/logger'
import { HowLongToBeat, HowLongToBeatEntry } from 'howlongtobeat-js'

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

export async function getHowLongToBeat(
  title: string
): Promise<HeroicHowLongToBeatEntry | null> {
  logInfo(`Getting HowLongToBeat data for ${title}`, LogPrefix.ExtraGameInfo)
  const hltb = new HowLongToBeat(0.4)
  let info: HowLongToBeatEntry[] | null = null
  try {
    info = await hltb.search(title)
  } catch (error) {
    logError(
      [`Error searching HLTB data for ${title}:`, error],
      LogPrefix.ExtraGameInfo
    )
    return null
  }

  if (!info || info.length === 0) {
    logError(
      `No HowLongToBeat data found for ${title}`,
      LogPrefix.ExtraGameInfo
    )
    return null
  }
  const game = info[0]

  const mainStory = game.mainStory ? Math.round(game.mainStory) : 0
  const mainExtra = game.mainExtra ? Math.round(game.mainExtra) : 0
  const completionist = game.completionist ? Math.round(game.completionist) : 0

  return {
    mainStory,
    mainExtra,
    completionist,
    gameId: game.gameId,
    gameName: game.gameName || undefined,
    gameImageUrl: game.gameImageUrl || undefined,
    gameWebLink: game.gameWebLink || undefined
  }
}
