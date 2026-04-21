import { gameManagerMap } from 'backend/storeManagers/index'
import { libraryStore as legendaryLibraryStore } from 'backend/storeManagers/legendary/electronStores'
import { libraryStore as gogLibraryStore } from 'backend/storeManagers/gog/electronStores'
import {
  getPageID,
  fetchGenresByTitles,
  fetchGenresByPageIds
} from 'backend/wiki_game_info/pcgamingwiki/utils'
import { getCache, updateCache, forceRefreshCache } from '../cache'
import { GameInfo } from 'common/types'

// In-memory mock for TypeCheckedStoreBackend
let mockStoreData: Record<string, string[]> = {}
jest.mock('backend/electron_store', () => ({
  TypeCheckedStoreBackend: jest.fn().mockImplementation(() => ({
    get: (key: string, defaultValue: string[]) =>
      mockStoreData[key] ?? defaultValue,
    set: (key: string, value: string[]) => {
      mockStoreData[key] = value
    },
    clear: () => {
      mockStoreData = {}
    },
    get raw_store() {
      return { ...mockStoreData }
    }
  }))
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { ExtraGameInfo: 'ExtraGameInfo' }
}))
jest.mock('backend/wiki_game_info/pcgamingwiki/utils', () => ({
  getPageID: jest.fn(),
  fetchGenresByTitles: jest.fn(),
  fetchGenresByPageIds: jest.fn()
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
    mockStoreData = {}

    // Default: stores return empty arrays
    jest.mocked(legendaryLibraryStore.get).mockReturnValue([])
    jest.mocked(gogLibraryStore.get).mockReturnValue([])
    jest.mocked(getPageID).mockResolvedValue(null)
    jest.mocked(fetchGenresByTitles).mockResolvedValue({})
    jest.mocked(fetchGenresByPageIds).mockResolvedValue({})
  })

  describe('getCache', () => {
    test('returns empty object when store is empty', () => {
      expect(getCache()).toEqual({})
    })

    test('returns current store state', () => {
      mockStoreData = { game1_legendary: ['Shooter'] }
      expect(getCache()).toEqual({ game1_legendary: ['Shooter'] })
    })
  })

  describe('updateCache', () => {
    test('returns early when all games are already cached', async () => {
      mockStoreData = { game1_legendary: ['Action'] }

      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Game One', 'legendary')])

      const result = await updateCache()
      expect(result).toEqual({ game1_legendary: ['Action'] })
      expect(fetchGenresByTitles).not.toHaveBeenCalled()
    })

    test('fetches genres from PCGW by title for non-GOG games', async () => {
      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Half-Life 2', 'legendary')])

      jest.mocked(fetchGenresByTitles).mockResolvedValue({
        'Half-Life 2': ['FPS', 'Action']
      })

      const result = await updateCache()
      expect(result['game1_legendary']).toEqual(['FPS', 'Action'])
      expect(fetchGenresByTitles).toHaveBeenCalledWith(['Half-Life 2'])
      expect(getPageID).not.toHaveBeenCalled()
    })

    test('uses GOG extra genres when available', async () => {
      jest.mocked(gogLibraryStore.get).mockReturnValue([
        makeGame('gog_game', 'Witcher 3', 'gog', {
          genres: ['RPG', 'Adventure']
        })
      ])

      const result = await updateCache()
      expect(result['gog_game_gog']).toEqual(['RPG', 'Adventure'])
      expect(fetchGenresByTitles).not.toHaveBeenCalled()
      expect(getPageID).not.toHaveBeenCalled()
    })

    test('falls back to getExtraInfo for GOG games without inline genres', async () => {
      jest
        .mocked(gogLibraryStore.get)
        .mockReturnValue([
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

    test('falls back to PCGW by page ID for GOG games without genres', async () => {
      jest
        .mocked(gogLibraryStore.get)
        .mockReturnValue([
          makeGame('gog_game', 'Unknown GOG Game', 'gog', { genres: [] })
        ])

      const mockGameManager = {
        getExtraInfo: jest.fn().mockResolvedValue({ genres: [] })
      }
      ;(gameManagerMap as Record<string, unknown>)['gog'] = mockGameManager

      jest.mocked(getPageID).mockResolvedValue('99')
      jest.mocked(fetchGenresByPageIds).mockResolvedValue({
        '99': ['Puzzle']
      })

      const result = await updateCache()
      expect(result['gog_game_gog']).toEqual(['Puzzle'])
      expect(getPageID).toHaveBeenCalledWith('Unknown GOG Game', 'gog_game')
      expect(fetchGenresByTitles).not.toHaveBeenCalled()
    })

    test('handles PCGW page ID resolution failure gracefully', async () => {
      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'Some Game', 'legendary')])

      jest.mocked(fetchGenresByTitles).mockResolvedValue({})

      const result = await updateCache()
      expect(result['game1_legendary']).toBeUndefined()
    })

    test('handles store read errors gracefully', async () => {
      jest.mocked(legendaryLibraryStore.get).mockImplementation(() => {
        throw new Error('Store not available')
      })

      const result = await updateCache()
      expect(result).toEqual({})
    })
  })

  describe('forceRefreshCache', () => {
    test('clears existing cache and re-fetches all genres', async () => {
      mockStoreData = { old_game_legendary: ['Old Genre'] }
      expect(getCache()).toHaveProperty('old_game_legendary')

      jest
        .mocked(legendaryLibraryStore.get)
        .mockReturnValue([makeGame('game1', 'New Game', 'legendary')])

      jest.mocked(fetchGenresByTitles).mockResolvedValue({
        'New Game': ['Simulation']
      })

      const result = await forceRefreshCache()
      expect(result['old_game_legendary']).toBeUndefined()
      expect(result['game1_legendary']).toEqual(['Simulation'])
    })
  })
})
