import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { z } from 'zod'
import { HowLongToBeat } from 'howlongtobeat-js'

const GameItem = z.object({
  // Number of seconds for "Completionist"
  comp_100: z.number(),
  // Number of seconds for "Main Story"
  comp_main: z.number(),
  // Number of seconds for "Main + Sides"
  comp_plus: z.number(),
  // Optional additional data from HowLongToBeat
  game_id: z.number().optional(),
  game_name: z.string().optional(),
  game_image_url: z.string().optional(),
  game_web_link: z.string().optional()
})
export type HowLongToBeatEntry = z.infer<typeof GameItem>

export async function getHowLongToBeat(
  title: string
): Promise<HowLongToBeatEntry | null> {
  logInfo(`Getting HowLongToBeat data for ${title}`, LogPrefix.ExtraGameInfo)
  const hltb = new HowLongToBeat(0.4) // Default minimum similarity
  const info = await hltb.search(title)
  if (!info || info.length === 0) {
    logError(
      `No HowLongToBeat data found for ${title}`,
      LogPrefix.ExtraGameInfo
    )
    return null
  }
  const game = info[0]

  // Convert hours to seconds as per the expected API
  const comp_main = game.mainStory || 0
  const comp_plus = game.mainExtra || 0
  const comp_100 = game.completionist || 0

  if (comp_main === 0 && comp_plus === 0 && comp_100 === 0) {
    logError(
      `No HowLongToBeat data found for ${title}`,
      LogPrefix.ExtraGameInfo
    )
    return null
  }
  return {
    comp_100,
    comp_main,
    comp_plus
  }
}
