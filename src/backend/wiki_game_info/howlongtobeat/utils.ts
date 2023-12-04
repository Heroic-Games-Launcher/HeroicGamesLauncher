import { logError, logInfo, LogPrefix } from '../../logger/logger'
import axios, { AxiosError } from 'axios'
import { app } from 'electron'
import { z } from 'zod'

const GameItem = z.object({
  // Number of seconds for "Completionist"
  comp_100: z.number(),
  // Number of seconds for "Main Story"
  comp_main: z.number(),
  // Number of seconds for "Main + Sides"
  comp_plus: z.number()
})
export type HowLongToBeatEntry = z.infer<typeof GameItem>

const ResponseSchema = z.object({
  data: GameItem.array().nonempty()
})

function getHltbParameters(title: string): string {
  return JSON.stringify({
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
        rangeTime: {
          min: 0,
          max: 0
        },
        gameplay: {
          perspective: '',
          flow: '',
          genre: ''
        },
        modifier: ''
      },
      users: {
        sortCategory: 'postcount'
      },
      filter: '',
      sort: 0,
      randomizer: 0
    }
  })
}

export async function getHowLongToBeat(
  title: string
): Promise<HowLongToBeatEntry | null> {
  logInfo(`Getting HowLongToBeat data for ${title}`, LogPrefix.ExtraGameInfo)

  const response = await axios
    .post(
      'https://www.howlongtobeat.com/api/search',
      getHltbParameters(title),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: '*/*',
          'User-Agent': `HeroicGamesLauncher/${app.getVersion()}`,
          Referer: 'https://howlongtobeat.com/'
        }
      }
    )
    .catch((error) => error as AxiosError)

  if (axios.isAxiosError(response)) {
    logError(
      [
        `Got AxiosError when sending HowLongToBeat request for ${title}:`,
        response.toJSON()
      ],
      LogPrefix.ExtraGameInfo
    )
    return null
  }

  const parseResult = ResponseSchema.safeParse(response.data)
  if (!parseResult.success) {
    logError(
      [
        'HowLongToBeat response for',
        title,
        'is malformed',
        parseResult.error.format()
      ],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
  const firstEntry = parseResult.data.data.at(0)
  if (!firstEntry) {
    logInfo(
      ['Title', title, 'not found on HowLongToBeat'],
      LogPrefix.ExtraGameInfo
    )
    return null
  }
  return firstEntry
}
