import type { RecentGame } from 'common/types'
import { tagRecentGames, visibleRecentGames } from '../recent_games'

let mockRecent: RecentGame[] = []
const mockSteamLoggedIn = jest.fn<boolean, []>()

jest.mock('backend/constants/key_value_stores', () => ({
  configStore: {
    get: () => mockRecent,
    set: (_key: string, games: RecentGame[]) => {
      mockRecent = games
    }
  }
}))
jest.mock('backend/storeManagers/steam/electronStores', () => ({
  configStore: { get: () => mockSteamLoggedIn() }
}))
jest.mock('../../ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('../../config', () => ({ GlobalConfig: { get: jest.fn() } }))

const games: RecentGame[] = [
  { appName: '312200', title: 'Chasm', runner: 'steam' },
  { appName: '1207658924', title: 'Witcher', runner: 'gog' },
  { appName: 'old', title: 'Untagged' }
]

describe('visibleRecentGames', () => {
  it('hides Steam games while logged out', () => {
    mockSteamLoggedIn.mockReturnValue(false)
    expect(visibleRecentGames(games).map((g) => g.appName)).toEqual([
      '1207658924',
      'old'
    ])
  })

  it('keeps everything while logged in', () => {
    mockSteamLoggedIn.mockReturnValue(true)
    expect(visibleRecentGames(games)).toEqual(games)
  })
})

describe('tagRecentGames', () => {
  it('tags only untagged matching entries', async () => {
    mockRecent = [
      { appName: '10', title: 'Steam game' },
      { appName: '20', title: 'GOG game', runner: 'gog' },
      { appName: '30', title: 'Other' }
    ]
    await tagRecentGames('steam', new Set(['10', '20']))
    expect(mockRecent.map((g) => g.runner)).toEqual([
      'steam',
      'gog',
      undefined
    ])
  })
})
