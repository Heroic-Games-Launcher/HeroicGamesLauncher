import type { Game } from 'common/types/game_manager'
import { PCGamingWikiInfo } from 'common/types'
import { getWikiGameInfo } from '../wiki_game_info'
import { fetchPCGamingWikiInfo } from '../pcgamingwiki/utils'

const mockSet = jest.fn()

jest.mock('backend/logger')
jest.mock('../electronStore', () => ({
  wikiGameInfoStore: {
    get: jest.fn(),
    set: (...args: unknown[]) => mockSet(...args)
  }
}))
jest.mock('../pcgamingwiki/utils', () => ({
  fetchPCGamingWikiInfo: jest.fn()
}))
jest.mock('../gamesdb/utils', () => ({
  getInfoFromGamesDB: jest.fn().mockResolvedValue(null)
}))
jest.mock('../applegamingwiki/utils', () => ({
  getInfoFromAppleGamingWiki: jest.fn().mockResolvedValue(null)
}))
jest.mock('../howlongtobeat/utils', () => ({
  getHowLongToBeat: jest.fn().mockResolvedValue(null)
}))
jest.mock('../umu/utils', () => ({
  getUmuId: jest.fn().mockResolvedValue(null)
}))
jest.mock('backend/constants/environment', () => ({
  isLinux: false,
  isMac: false
}))

const mockedFetch = jest.mocked(fetchPCGamingWikiInfo)

function makeGame(runner: string): Game {
  return {
    getGameInfo: () => ({ app_name: 'Petrel', runner, title: 'Minit' })
  } as unknown as Game
}

const pcgwInfo = {
  steamID: '609490',
  genres: ['Adventure']
} as PCGamingWikiInfo

describe('getWikiGameInfo cache', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('caches the result when PCGamingWiki answers', async () => {
    mockedFetch.mockResolvedValueOnce({ status: 'found', info: pcgwInfo })

    const result = await getWikiGameInfo(makeGame('legendary'))

    expect(result?.pcgamingwiki).toBe(pcgwInfo)
    expect(mockSet).toHaveBeenCalledWith('Minit', result)
  })

  test('caches the result when the game has no PCGamingWiki page', async () => {
    mockedFetch.mockResolvedValueOnce({ status: 'notFound' })

    const result = await getWikiGameInfo(makeGame('legendary'))

    expect(result?.pcgamingwiki).toBeNull()
    expect(mockSet).toHaveBeenCalledTimes(1)
  })

  test('does not cache the result when PCGamingWiki fails', async () => {
    mockedFetch.mockResolvedValueOnce({ status: 'failed' })

    const result = await getWikiGameInfo(makeGame('legendary'))

    expect(result?.pcgamingwiki).toBeNull()
    expect(mockSet).not.toHaveBeenCalled()
  })

  test('does not cache Steam results when PCGamingWiki fails', async () => {
    mockedFetch.mockResolvedValueOnce({ status: 'failed' })

    const result = await getWikiGameInfo(makeGame('steam'))

    expect(result).not.toBeNull()
    expect(mockSet).not.toHaveBeenCalled()
  })
})
