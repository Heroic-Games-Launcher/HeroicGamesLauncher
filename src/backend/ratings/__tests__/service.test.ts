import Store from 'electron-store'
import { GlobalConfig } from 'backend/config'
import type { AppSettings, RatingEntry, RatingKey } from 'common/types'
import { fetchRawgRatings } from '../provider_rawg'
import { getLibraryRatings, refreshLibraryRatings } from '../service'

jest.mock('backend/config')
jest.mock('backend/logger')
jest.mock('electron-store')
jest.mock('../provider_rawg', () => ({
  fetchRawgRatings: jest.fn()
}))

type MockGlobalConfig = {
  setConfigValue: (key: keyof AppSettings, value: unknown) => void
}

function gameKey(game: Pick<RatingKey, 'runner' | 'appName'>) {
  return `${game.runner}:${game.appName}`
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error('Timed out waiting for ratings worker')
}

describe('ratings service queueing', () => {
  const ratingsStore = new Store<Record<string, RatingEntry>>({
    cwd: 'store_cache',
    name: 'external_ratings_rawg_metacritic_score'
  })
  const fetchRawgRatingsMock = fetchRawgRatings as jest.MockedFunction<
    typeof fetchRawgRatings
  >
  const mockGlobalConfig = GlobalConfig as unknown as MockGlobalConfig

  const freshGame: RatingKey = {
    appName: 'fresh-app',
    runner: 'legendary',
    title: 'Fresh Game'
  }
  const staleGame: RatingKey = {
    appName: 'stale-app',
    runner: 'gog',
    title: 'Stale Game'
  }
  const missingGame: RatingKey = {
    appName: 'missing-app',
    runner: 'nile',
    title: 'Missing Game'
  }

  beforeEach(() => {
    ratingsStore.clear()
    mockGlobalConfig.setConfigValue('ratingProvider', 'rawg')
    mockGlobalConfig.setConfigValue('rawgApiKey', 'test-key')
  })

  test('queues only stale and missing games during refresh', async () => {
    const now = Date.now()
    ratingsStore.set(gameKey(freshGame), {
      status: 'ok',
      score: 95,
      url: 'https://rawg.io/games/fresh-game',
      staleAt: new Date(now + 60_000).toISOString()
    })
    ratingsStore.set(gameKey(staleGame), {
      status: 'ok',
      score: 10,
      url: 'https://rawg.io/games/stale-game',
      staleAt: new Date(now - 60_000).toISOString()
    })

    fetchRawgRatingsMock.mockImplementation((_apiKey, title) => {
      if (title === 'Stale Game') {
        return Promise.resolve({
          score: 88,
          url: 'https://rawg.io/games/stale-game'
        })
      }
      if (title === 'Missing Game') {
        return Promise.resolve({
          score: 74,
          url: 'https://rawg.io/games/missing-game'
        })
      }
      return Promise.resolve(null)
    })

    refreshLibraryRatings([freshGame, staleGame, missingGame])

    await waitFor(() => {
      const ratings = getLibraryRatings([staleGame, missingGame])
      return (
        ratings[gameKey(staleGame)]?.score === 88 &&
        ratings[gameKey(missingGame)]?.score === 74
      )
    })

    expect(fetchRawgRatingsMock).toHaveBeenCalledTimes(2)
    expect(
      fetchRawgRatingsMock.mock.calls.map((call) => call[1]).sort()
    ).toEqual(['Missing Game', 'Stale Game'])

    const ratings = getLibraryRatings([freshGame, staleGame, missingGame])
    expect(ratings[gameKey(freshGame)]).toMatchObject({
      status: 'ok',
      score: 95
    })
    expect(ratings[gameKey(staleGame)]).toMatchObject({
      status: 'ok',
      score: 88
    })
    expect(ratings[gameKey(missingGame)]).toMatchObject({
      status: 'ok',
      score: 74
    })
  })
})
