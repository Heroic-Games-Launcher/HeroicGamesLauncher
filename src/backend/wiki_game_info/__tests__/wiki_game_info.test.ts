import { HowLongToBeatEntry } from 'howlongtobeat'
import { AppleGamingWikiInfo, WikiInfo, PCGamingWikiInfo } from 'common/types'
import { wikiGameInfoStore } from '../electronStore'
import { getWikiGameInfo } from '../wiki_game_info'
import * as PCGamingWiki from '../pcgamingwiki/utils'
import * as AppleGamingWiki from '../applegamingwiki/utils'
import * as HowLongToBeat from '../howlongtobeat/utils'
import { logError } from '../../logger/logger'

jest.mock('electron-store')
jest.mock('../../logger/logfile')
jest.mock('../../logger/logger')
jest.mock('../../constants', () => {
  return {
    isMac: true
  }
})

describe('getWikiGameInfo', () => {
  test('use cached data', async () => {
    const mockPCGamingWiki = jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockResolvedValue(testPCGamingWikiInfo)
    const mockAppleGamingWiki = jest
      .spyOn(AppleGamingWiki, 'getInfoFromAppleGamingWiki')
      .mockResolvedValue(testAppleGamingWikiInfo)
    const mockHowLongToBeat = jest
      .spyOn(HowLongToBeat, 'getHowLongToBeat')
      .mockResolvedValue(testHowLongToBeat)

    wikiGameInfoStore.set('The Witcher 3', testExtraGameInfo)

    const result = await getWikiGameInfo('The Witcher 3')
    expect(result).toStrictEqual(testExtraGameInfo)
    expect(mockPCGamingWiki).not.toBeCalled()
    expect(mockAppleGamingWiki).not.toBeCalled()
    expect(mockHowLongToBeat).not.toBeCalled()
  })

  test('cached data outdated', async () => {
    const oneMonthAgo = new Date(testExtraGameInfo.timestampLastFetch)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const mockPCGamingWiki = jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockResolvedValue(testPCGamingWikiInfo)
    const mockAppleGamingWiki = jest
      .spyOn(AppleGamingWiki, 'getInfoFromAppleGamingWiki')
      .mockResolvedValue(testAppleGamingWikiInfo)
    const mockHowLongToBeat = jest
      .spyOn(HowLongToBeat, 'getHowLongToBeat')
      .mockResolvedValue(testHowLongToBeat)

    wikiGameInfoStore.set('The Witcher 3', {
      ...testExtraGameInfo,
      timestampLastFetch: oneMonthAgo.toString()
    })

    const result = await getWikiGameInfo('The Witcher 3', '1234')
    expect(result).toStrictEqual(testExtraGameInfo)
    expect(mockPCGamingWiki).toBeCalled()
    expect(mockAppleGamingWiki).toBeCalled()
    expect(mockHowLongToBeat).toBeCalled()
  })

  test('catches throws', async () => {
    jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockRejectedValueOnce(new Error('Failed'))

    wikiGameInfoStore.clear()

    const result = await getWikiGameInfo('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Was not able to get ExtraGameInfo data for The Witcher 3',
        Error('Failed')
      ],
      'ExtraGameInfo'
    )
  })
})

const testHowLongToBeat = {
  id: '1234',
  name: 'The Witcher 3',
  description: 'Game',
  platforms: ['PC'],
  imageUrl: 'image/url',
  timeLabels: [['TimeLabels']],
  gameplayMain: 100,
  gameplayMainExtra: 150,
  gameplayCompletionist: 200,
  similarity: 1234,
  searchTerm: 'term',
  playableOn: ['steam']
} as HowLongToBeatEntry

const testAppleGamingWikiInfo = {
  crossoverRating: 'perfect',
  crossoverLink: 'the-witcher-3-wild-hunt'
} as AppleGamingWikiInfo

const testPCGamingWikiInfo = {
  steamID: '100',
  metacritic: {
    score: '10',
    urlid: 'the-witcher-3-wild-hunt'
  },
  opencritic: {
    score: '22',
    urlid: '463/the-witcher-3-wild-hunt'
  },
  igdb: {
    score: '40',
    urlid: 'the-witcher-3-wild-hunt'
  },
  howLongToBeatID: '10101',
  direct3DVersions: ['11', '12']
} as PCGamingWikiInfo

const testExtraGameInfo = {
  timestampLastFetch: Date(),
  pcgamingwiki: testPCGamingWikiInfo,
  applegamingwiki: testAppleGamingWikiInfo,
  howlongtobeat: testHowLongToBeat
} as WikiInfo
