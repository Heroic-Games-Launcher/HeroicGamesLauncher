import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'
import { axiosClient } from 'backend/utils'
import { gameManagerMap } from 'backend/storeManagers/index'
import { libraryStore as legendaryLibraryStore } from 'backend/storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from 'backend/storeManagers/gog/electronStores'
import { loadCache, getCache, updateCache, forceRefreshCache } from '../cache'
import { GameInfo } from 'common/types'

jest.mock('graceful-fs')
jest.mock('backend/constants/paths', () => ({
  appFolder: '/mock/app'
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { ExtraGameInfo: 'ExtraGameInfo' }
}))
jest.mock('backend/utils', () => ({
  axiosClient: { get: jest.fn() }
}))
jest.mock('backend/storeManagers/index', () => ({
  gameManagerMap: {}
}))
jest.mock('backend/storeManagers/legendary/electronStores', () => ({
  libraryStore: { get: jest.fn() }
}))
jest.mock('backend/storeManagers/gog/electronStores', () => ({
  libraryStore: { get: jest.fn() }
}))
jest.mock('backend/storeManagers/nile/electronStores', () => ({
  libraryStore: { get: jest.fn() }
}))
jest.mock('backend/storeManagers/zoom/electronStores', () => ({
  libraryStore: { get: jest.fn() }
}))
jest.mock('backend/storeManagers/sideload/electronStores', () => ({
  libraryStore: { get: jest.fn() }
}))

function makeGame(
  appName: string,
  title: string,
  runner: string,
  extra?: Partial<GameInfo['extra']>
): GameInfo {
  return {
    app_name: appName,
    title,
    runner,
    extra: extra as GameInfo['extra']
  } as GameInfo
}

describe('genres/cache.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset internal cache state by loading an empty cache from "disk"
    jest.mocked(existsSync).mockReturnValue(true)
    jest.mocked(readFileSync).mockReturnValue('{}')
    loadCache()

    // Default: stores return empty arrays
    jest.mocked(existsSync).mockReset()
    jest.mocked(readFileSync).mockReset()
    jest.mocked(legendaryLibraryStore.get).mockReturnValue([])
    jest.mocked(gogLibraryStore.get).mockReturnValue([])
  })

  describe('loadCache', () => {
    test('returns empty object when cache file does not exist', () => {
      jest.mocked(existsSync).mockReturnValue(false)
      const result = loadCache()
      expect(result).toEqual({})
    })

    test('loads cache from disk when file exists', () => {
      const cached = { game1_legendary: ['Action', 'RPG'] }
      jest.mocked(existsSync).mockReturnValue(true)
      jest.mocked(readFileSync).mockReturnValue(JSON.stringify(cached))

      const result = loadCache()
      expect(result).toEqual(cached)
      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('genres.json'),
        'utf-8'
      )
    })

    test('returns empty object on parse error', () => {
      jest.mocked(existsSync).mockReturnValue(true)
      jest.mocked(readFileSync).mockReturnValue('invalid json{{{')

      const result = loadCache()
      expect(result).toEqual({})
    })
  })

  describe('getCache', () => {
    test('returns current cache state', () => {
      expect(getCache()).toEqual({})
    })

    test('returns loaded cache after loadCache', () => {
      const cached = { game1_legendary: ['Shooter'] }
      jest.mocked(existsSync).mockReturnValue(true)
      jest.mocked(readFileSync).mockReturnValue(JSON.stringify(cached))

      loadCache()
      expect(getCache()).toEqual(cached)
    })
  })

  describe('updateCache', () => {
    test('returns early when all games are already cached', async () => {
      // Pre-populate cache
      jest.mocked(existsSync).mockReturnValue(true)
      jest
        .mocked(readFileSync)
        .mockReturnValue(JSON.stringify({ game1_legendary: ['Action'] }))

      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Game One', 'legendary')])

      const result = await updateCache()
      expect(result).toEqual({ game1_legendary: ['Action'] })
      expect(axiosClient.get).not.toHaveBeenCalled()
    })

    test('fetches genres from PCGW for Epic games', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Half-Life 2', 'legendary')])

      jest.mocked(axiosClient.get).mockResolvedValue({
        data: {
          query: {
            pages: {
              '1': {
                title: 'Half-Life 2',
                categories: [
                  { title: 'Category:FPS games' },
                  { title: 'Category:Action games' }
                ]
              }
            }
          }
        }
      })

      const result = await updateCache()
      expect(result['game1_legendary']).toEqual(['FPS', 'Action'])
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('genres.json'),
        expect.any(String)
      )
    })

    test('uses GOG extra genres when available', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest.mocked(gogLibraryStore.get).mockReturnValue([
        makeGame('gog_game', 'Witcher 3', 'gog', {
          genres: ['RPG', 'Adventure']
        })
      ])

      const result = await updateCache()
      expect(result['gog_game_gog']).toEqual(['RPG', 'Adventure'])
      expect(axiosClient.get).not.toHaveBeenCalled()
    })

    test('falls back to getExtraInfo for GOG games without inline genres', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest.mocked(gogLibraryStore.get).mockReturnValue([
        makeGame('gog_game', 'Some GOG Game', 'gog', { genres: [] })
      ])

      const mockGameManager = {
        getExtraInfo: jest
          .fn()
          .mockResolvedValue({ genres: ['Strategy', 'Puzzle'] })
      }
      ;(gameManagerMap as Record<string, unknown>)['gog'] = mockGameManager

      const result = await updateCache()
      expect(result['gog_game_gog']).toEqual(['Strategy', 'Puzzle'])
    })

    test('falls back to PCGW when GOG getExtraInfo has no genres', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest.mocked(gogLibraryStore.get).mockReturnValue([
        makeGame('gog_game', 'Unknown GOG Game', 'gog', { genres: [] })
      ])

      const mockGameManager = {
        getExtraInfo: jest.fn().mockResolvedValue({ genres: [] })
      }
      ;(gameManagerMap as Record<string, unknown>)['gog'] = mockGameManager

      jest.mocked(axiosClient.get).mockResolvedValue({
        data: {
          query: {
            pages: {
              '1': {
                title: 'Unknown GOG Game',
                categories: [{ title: 'Category:Puzzle games' }]
              }
            }
          }
        }
      })

      const result = await updateCache()
      expect(result['gog_game_gog']).toEqual(['Puzzle'])
    })

    test('handles PCGW API failure gracefully', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Some Game', 'legendary')])

      jest.mocked(axiosClient.get).mockRejectedValue(new Error('Network error'))

      const result = await updateCache()
      expect(result['game1_legendary']).toBeUndefined()
      expect(writeFileSync).toHaveBeenCalled()
    })

    test('handles store read errors gracefully', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest.mocked(legendaryLibraryStore.get).mockImplementation(() => {
        throw new Error('Store not available')
      })

      const result = await updateCache()
      expect(result).toEqual({})
    })
  })

  describe('forceRefreshCache', () => {
    test('clears existing cache and re-fetches all genres', async () => {
      // Pre-populate cache
      jest.mocked(existsSync).mockReturnValue(true)
      jest
        .mocked(readFileSync)
        .mockReturnValue(
          JSON.stringify({ old_game_legendary: ['Old Genre'] })
        )
      loadCache()
      expect(getCache()).toHaveProperty('old_game_legendary')

      // Set up library with a different game
      jest.mocked(existsSync).mockReturnValue(false)
      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'New Game', 'legendary')])

      jest.mocked(axiosClient.get).mockResolvedValue({
        data: {
          query: {
            pages: {
              '1': {
                title: 'New Game',
                categories: [{ title: 'Category:Simulation games' }]
              }
            }
          }
        }
      })

      const result = await forceRefreshCache()
      expect(result['old_game_legendary']).toBeUndefined()
      expect(result['game1_legendary']).toEqual(['Simulation'])
    })

    test('saves cache to disk after refresh', async () => {
      jest.mocked(existsSync).mockReturnValue(false)
      jest.mocked(legendaryLibraryStore.get).mockReturnValue([])

      await forceRefreshCache()
      expect(writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('genres.json'),
        expect.any(String)
      )
    })
  })
})
