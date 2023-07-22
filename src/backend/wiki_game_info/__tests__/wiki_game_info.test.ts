import { GamesDBInfo } from './../../../common/types'
import { HowLongToBeatEntry } from 'howlongtobeat'
import {
  AppleGamingWikiInfo,
  WikiInfo,
  PCGamingWikiInfo,
  ProtonDBCompatibilityInfo,
  SteamDeckComp,
  SteamInfo
} from 'common/types'
import { wikiGameInfoStore } from '../electronStore'
import { getWikiGameInfo } from '../wiki_game_info'
import * as PCGamingWiki from '../pcgamingwiki/utils'
import * as AppleGamingWiki from '../applegamingwiki/utils'
import * as HowLongToBeat from '../howlongtobeat/utils'
import * as GamesDB from '../gamesdb/utils'
import * as ProtonDB from '../protondb/utils'
import * as SteamDeck from '../steamdeck/utils'
import { logError } from '../../logger/logger'

jest.mock('electron-store')
jest.mock('../../logger/logfile')
jest.mock('../../logger/logger')
import * as mockConstants from '../../constants'
const currentTime = new Date()
jest.useFakeTimers().setSystemTime(currentTime)

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
    const mockGamesDB = jest
      .spyOn(GamesDB, 'getInfoFromGamesDB')
      .mockResolvedValue(testGamesDBInfo)
    const mockProtonDB = jest
      .spyOn(ProtonDB, 'getInfoFromProtonDB')
      .mockResolvedValue(testProtonDBInfo)
    const mockSteamDeck = jest
      .spyOn(SteamDeck, 'getSteamDeckComp')
      .mockResolvedValue(testSteamCompat)

    wikiGameInfoStore.set('The Witcher 3', testExtraGameInfo)
    Object.defineProperty(mockConstants, 'isMac', { value: true })
    Object.defineProperty(mockConstants, 'isLinux', { value: true })

    const result = await getWikiGameInfo('The Witcher 3', '1234', 'gog')
    expect(result).toStrictEqual(testExtraGameInfo)
    expect(mockPCGamingWiki).not.toBeCalled()
    expect(mockAppleGamingWiki).not.toBeCalled()
    expect(mockHowLongToBeat).not.toBeCalled()
    expect(mockGamesDB).not.toBeCalled()
    expect(mockProtonDB).not.toBeCalled()
    expect(mockSteamDeck).not.toBeCalled()
  })

  test('cached data outdated', async () => {
    const oneMonthAgo = new Date(testExtraGameInfo.timestampLastFetch)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    Object.defineProperty(mockConstants, 'isMac', { value: true })
    Object.defineProperty(mockConstants, 'isLinux', { value: true })
    const mockPCGamingWiki = jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockResolvedValue(testPCGamingWikiInfo)
    const mockAppleGamingWiki = jest
      .spyOn(AppleGamingWiki, 'getInfoFromAppleGamingWiki')
      .mockResolvedValue(testAppleGamingWikiInfo)
    const mockHowLongToBeat = jest
      .spyOn(HowLongToBeat, 'getHowLongToBeat')
      .mockResolvedValue(testHowLongToBeat)
    const mockGamesDB = jest
      .spyOn(GamesDB, 'getInfoFromGamesDB')
      .mockResolvedValue(testGamesDBInfo)
    const mockProtonDB = jest
      .spyOn(ProtonDB, 'getInfoFromProtonDB')
      .mockResolvedValue(testProtonDBInfo)
    const mockSteamDeck = jest
      .spyOn(SteamDeck, 'getSteamDeckComp')
      .mockResolvedValue(testSteamCompat)

    wikiGameInfoStore.set('The Witcher 3', {
      ...testExtraGameInfo,
      timestampLastFetch: oneMonthAgo.toString()
    })

    const result = await getWikiGameInfo('The Witcher 3', '1234', 'gog')
    expect(result).toStrictEqual(testExtraGameInfo)
    expect(mockPCGamingWiki).toBeCalled()
    expect(mockAppleGamingWiki).toBeCalled()
    expect(mockHowLongToBeat).toBeCalled()
    expect(mockGamesDB).toBeCalled()
    expect(mockProtonDB).toBeCalled()
    expect(mockProtonDB).toBeCalledWith('100')
    expect(mockSteamDeck).toBeCalled()
    expect(mockSteamDeck).toBeCalledWith('100')
  })

  test('fallback to gamesdb steamID', async () => {
    const oneMonthAgo = new Date(testExtraGameInfo.timestampLastFetch)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    Object.defineProperty(mockConstants, 'isMac', { value: true })
    Object.defineProperty(mockConstants, 'isLinux', { value: true })
    const mockPCGamingWiki = jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockResolvedValue({ ...testPCGamingWikiInfo, steamID: '' })
    const mockAppleGamingWiki = jest
      .spyOn(AppleGamingWiki, 'getInfoFromAppleGamingWiki')
      .mockResolvedValue(testAppleGamingWikiInfo)
    const mockHowLongToBeat = jest
      .spyOn(HowLongToBeat, 'getHowLongToBeat')
      .mockResolvedValue(testHowLongToBeat)
    const mockGamesDB = jest
      .spyOn(GamesDB, 'getInfoFromGamesDB')
      .mockResolvedValue(testGamesDBInfo)
    const mockProtonDB = jest
      .spyOn(ProtonDB, 'getInfoFromProtonDB')
      .mockResolvedValue(testProtonDBInfo)
    const mockSteamDeck = jest
      .spyOn(SteamDeck, 'getSteamDeckComp')
      .mockResolvedValue(testSteamCompat)

    wikiGameInfoStore.set('The Witcher 3', {
      ...testExtraGameInfo,
      timestampLastFetch: oneMonthAgo.toString()
    })

    const result = await getWikiGameInfo('The Witcher 3', '1234', 'gog')
    expect(result).toStrictEqual({
      ...testExtraGameInfo,
      pcgamingwiki: { ...testPCGamingWikiInfo, steamID: '' }
    })
    expect(mockPCGamingWiki).toBeCalled()
    expect(mockAppleGamingWiki).toBeCalled()
    expect(mockHowLongToBeat).toBeCalled()
    expect(mockGamesDB).toBeCalled()
    expect(mockProtonDB).toBeCalled()
    expect(mockProtonDB).toBeCalledWith('123')
    expect(mockSteamDeck).toBeCalled()
    expect(mockSteamDeck).toBeCalledWith('123')
  })

  test('cached data outdated - not mac not linux', async () => {
    const oneMonthAgo = new Date(testExtraGameInfo.timestampLastFetch)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    Object.defineProperty(mockConstants, 'isMac', { value: false })
    Object.defineProperty(mockConstants, 'isLinux', { value: false })
    const mockPCGamingWiki = jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockResolvedValue(testPCGamingWikiInfo)
    const mockAppleGamingWiki = jest
      .spyOn(AppleGamingWiki, 'getInfoFromAppleGamingWiki')
      .mockResolvedValue(testAppleGamingWikiInfo)
    const mockHowLongToBeat = jest
      .spyOn(HowLongToBeat, 'getHowLongToBeat')
      .mockResolvedValue(testHowLongToBeat)
    const mockGamesDB = jest
      .spyOn(GamesDB, 'getInfoFromGamesDB')
      .mockResolvedValue(testGamesDBInfo)
    const mockProtonDB = jest
      .spyOn(ProtonDB, 'getInfoFromProtonDB')
      .mockResolvedValue(null)
    const mockSteamDeck = jest
      .spyOn(SteamDeck, 'getSteamDeckComp')
      .mockResolvedValue(null)

    wikiGameInfoStore.set('The Witcher 3', {
      ...testExtraGameInfo,
      timestampLastFetch: oneMonthAgo.toString()
    })

    const result = await getWikiGameInfo('The Witcher 3', '1234', 'gog')
    expect(result).toStrictEqual(testExtraGameInfoNoMac)
    expect(mockPCGamingWiki).toBeCalled()
    expect(mockAppleGamingWiki).not.toBeCalled()
    expect(mockHowLongToBeat).toBeCalled()
    expect(mockGamesDB).toBeCalled()
    expect(mockProtonDB).not.toBeCalled()
    expect(mockSteamDeck).not.toBeCalled()
  })
  test('catches throws', async () => {
    jest
      .spyOn(PCGamingWiki, 'getInfoFromPCGamingWiki')
      .mockRejectedValueOnce(new Error('Failed'))

    wikiGameInfoStore.clear()

    const result = await getWikiGameInfo('The Witcher 3', '1234', 'gog')
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

const testGamesDBInfo = {
  steamID: '123'
} as GamesDBInfo

const testProtonDBInfo = {
  level: 'platinum'
} as ProtonDBCompatibilityInfo

const testSteamCompat = {
  category: 1
} as SteamDeckComp

const testSteamInfo = {
  compatibilityLevel: testProtonDBInfo.level,
  steamDeckCatagory: testSteamCompat.category
} as SteamInfo

const testExtraGameInfo = {
  timestampLastFetch: currentTime.toString(),
  pcgamingwiki: testPCGamingWikiInfo,
  applegamingwiki: testAppleGamingWikiInfo,
  howlongtobeat: testHowLongToBeat,
  gamesdb: testGamesDBInfo,
  steamInfo: testSteamInfo
} as WikiInfo

const testExtraGameInfoNoMac = {
  timestampLastFetch: currentTime.toString(),
  pcgamingwiki: testPCGamingWikiInfo,
  applegamingwiki: null,
  howlongtobeat: testHowLongToBeat,
  gamesdb: testGamesDBInfo,
  steamInfo: null
} as WikiInfo
