import {
  getCustomLibraries,
  getCachedCustomLibraryEntry
} from 'backend/storeManagers/customLibraries/customLibraryManager'
import { GlobalConfig } from 'backend/config'
import { getWikiGameInfo } from 'backend/wiki_game_info/wiki_game_info'
import {
  getGamesdbData,
  gogToUnifiedInfo
} from 'backend/storeManagers/gog/library'
import { logInfo, logWarning } from 'backend/logger'

jest.mock('backend/logger')
jest.mock('backend/config')
jest.mock('backend/wiki_game_info/wiki_game_info')
jest.mock('backend/storeManagers/gog/library')
global.fetch = jest.fn()

let mockGetSettings = jest.fn()
const mockGlobalConfigGet = jest.fn().mockReturnValue({
  getSettings: mockGetSettings
})

;(GlobalConfig as any).get = mockGlobalConfigGet

const mockGetWikiGameInfo = getWikiGameInfo as jest.MockedFunction<
  typeof getWikiGameInfo
>
const mockGetGamesdbData = getGamesdbData as jest.MockedFunction<
  typeof getGamesdbData
>
const mockGogToUnifiedInfo = gogToUnifiedInfo as jest.MockedFunction<
  typeof gogToUnifiedInfo
>
const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>
const mockLogWarning = logWarning as jest.MockedFunction<typeof logWarning>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('CustomLibraryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockGlobalConfigGet.mockReturnValue({
      getSettings: mockGetSettings
    })

    mockGetSettings.mockReturnValue({
      customLibraryUrls: [],
      customLibraryConfigs: []
    })

    mockGetWikiGameInfo.mockResolvedValue(null)
    mockGetGamesdbData.mockResolvedValue({ isUpdated: false })
  })

  describe('getCustomLibraries', () => {
    it('should return empty array when no custom libraries configured', async () => {
      const result = await getCustomLibraries()
      expect(result).toEqual([])
    })

    it('should fetch library data from URLs', async () => {
      const libraryConfig = {
        name: 'Test Library',
        games: [
          {
            app_name: 'test-game',
            title: 'Test Game',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: ['https://example.com/library.json'],
        customLibraryConfigs: []
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(libraryConfig)
      } as Response)

      const result = await getCustomLibraries()

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/library.json')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Library')
      expect(result[0].games[0].app_name).toBe('test_library__test-game')
    })

    it('should parse JSON configs directly', async () => {
      const libraryConfig = {
        name: 'JSON Library',
        games: [
          {
            app_name: 'json-game',
            title: 'JSON Game',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      const result = await getCustomLibraries()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('JSON Library')
      expect(result[0].games[0].app_name).toBe('json_library__json-game')
    })

    it('should handle fetch failures gracefully', async () => {
      mockGetSettings.mockReturnValue({
        customLibraryUrls: ['https://example.com/missing.json'],
        customLibraryConfigs: []
      })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response)

      const result = await getCustomLibraries()

      expect(result).toEqual([])
      expect(mockLogWarning).toHaveBeenCalledWith(
        'Failed to fetch from https://example.com/missing.json: HTTP 404 Not Found'
      )
    })

    it('should handle network errors gracefully', async () => {
      mockGetSettings.mockReturnValue({
        customLibraryUrls: ['https://example.com/error.json'],
        customLibraryConfigs: []
      })

      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await getCustomLibraries()

      expect(result).toEqual([])
      expect(mockLogWarning).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error fetching from https://example.com/error.json'
        )
      )
    })

    it('should handle invalid JSON configs gracefully', async () => {
      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: ['invalid json']
      })

      const result = await getCustomLibraries()

      expect(result).toEqual([])
      expect(mockLogWarning).toHaveBeenCalledWith(
        expect.stringContaining('Error parsing JSON config')
      )
    })

    it('should skip libraries with empty or invalid games array', async () => {
      const invalidConfig = {
        name: 'Invalid Library',
        games: null
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(invalidConfig)]
      })

      const result = await getCustomLibraries()

      expect(result).toEqual([])
      expect(mockLogWarning).toHaveBeenCalledWith(
        'Invalid or empty games array in Invalid Library'
      )
    })

    it('should skip duplicate library names', async () => {
      const library1 = {
        name: 'Duplicate Library',
        games: [
          {
            app_name: 'game1',
            title: 'Game 1',
            executable: 'game1.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      const library2 = {
        name: 'Duplicate Library',
        games: [
          {
            app_name: 'game2',
            title: 'Game 2',
            executable: 'game2.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [
          JSON.stringify(library1),
          JSON.stringify(library2)
        ]
      })

      const result = await getCustomLibraries()

      expect(result).toHaveLength(1)
      expect(result[0].games).toHaveLength(1)
      expect(result[0].games[0].title).toBe('Game 1')
      expect(mockLogInfo).toHaveBeenCalledWith(
        'Skipping JSON Config - library name already exists: Duplicate Library'
      )
    })

    it('should create unique app names for games', async () => {
      const libraryConfig = {
        name: 'Test Library!@#',
        games: [
          {
            app_name: 'test-game',
            title: 'Test Game',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      const result = await getCustomLibraries()

      expect(result[0].games[0].app_name).toBe('test_library__test-game')
    })

    it('should fetch metadata for games', async () => {
      // Use a unique app name to avoid cache conflicts
      const libraryConfig = {
        name: 'Test Library Metadata',
        games: [
          {
            app_name: 'test-game-metadata',
            title: 'Test Game Metadata',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      const wikiInfo = {
        howlongtobeat: {
          gameImageUrl: 'https://example.com/cover.jpg'
        },
        pcgamingwiki: {
          genres: ['Action', 'Adventure'],
          steamID: '12345'
        }
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      mockGetWikiGameInfo.mockResolvedValue(wikiInfo as any)
      mockGetGamesdbData.mockResolvedValue({} as any)
      mockGogToUnifiedInfo.mockResolvedValue({
        art_cover: 'https://gamesdb.com/cover.jpg',
        art_square: 'https://gamesdb.com/cover.jpg',
        extra: {
          about: { description: 'A great test game' },
          genres: ['Action', 'Adventure']
        }
      } as any)

      const result = await getCustomLibraries()

      expect(mockGetWikiGameInfo).toHaveBeenCalledWith(
        'Test Game Metadata',
        'custom_test_library_metadata__test-game-metadata',
        'customLibrary'
      )
      expect(mockGetGamesdbData).toHaveBeenCalledWith('steam', '12345')

      // GamesDB artwork takes precedence over HowLongToBeat
      expect(result[0].games[0].art_cover).toBe('https://gamesdb.com/cover.jpg')
      expect(result[0].games[0].description).toBe('A great test game')
      expect(result[0].games[0].genres).toEqual(['Action', 'Adventure'])
    })

    it('should use HowLongToBeat artwork as fallback', async () => {
      const libraryConfig = {
        name: 'Test Library HLTB',
        games: [
          {
            app_name: 'test-game-hltb',
            title: 'Test Game HLTB',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      const wikiInfo = {
        howlongtobeat: {
          gameImageUrl: 'https://howlongtobeat.com/cover.jpg'
        },
        pcgamingwiki: {
          genres: ['Action']
        }
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      mockGetWikiGameInfo.mockResolvedValue(wikiInfo as any)

      const result = await getCustomLibraries()

      expect(result[0].games[0].art_cover).toBe(
        'https://howlongtobeat.com/cover.jpg'
      )
      expect(result[0].games[0].art_square).toBe(
        'https://howlongtobeat.com/cover.jpg'
      )
    })

    it('should use custom gamesdb_credentials when provided', async () => {
      const libraryConfig = {
        name: 'Test Library GDB',
        games: [
          {
            app_name: 'test-game-gdb',
            title: 'Test Game GDB',
            executable: 'game.exe',
            gamesdb_credentials: {
              store: 'epic',
              id: 'test-epic-id'
            },
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      // Mock getWikiGameInfo to return null so custom credentials are used
      mockGetWikiGameInfo.mockResolvedValue(null)
      mockGetGamesdbData.mockResolvedValue({} as any)
      mockGogToUnifiedInfo.mockResolvedValue({
        art_cover: 'https://epic.com/cover.jpg',
        art_square: 'https://epic.com/cover.jpg',
        extra: {
          about: { description: 'Epic game description' },
          genres: ['Action']
        }
      } as any)

      const result = await getCustomLibraries()

      expect(mockGetGamesdbData).toHaveBeenCalledWith('epic', 'test-epic-id')
      expect(result[0].games[0].art_cover).toBe('https://epic.com/cover.jpg')
      expect(result[0].games[0].description).toBe('Epic game description')
    })

    it('should handle wiki info fetch failures gracefully', async () => {
      const libraryConfig = {
        name: 'Test Library Error',
        games: [
          {
            app_name: 'test-game-error',
            title: 'Test Game Error',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      mockGetWikiGameInfo.mockRejectedValue(new Error('Wiki fetch failed'))

      const result = await getCustomLibraries()

      expect(result).toHaveLength(1)
      expect(mockLogWarning).not.toHaveBeenCalled()
    })

    it('should handle gamesdb fetch failures gracefully', async () => {
      const libraryConfig = {
        name: 'Test Library GDB Error',
        games: [
          {
            app_name: 'test-game-gdb-error',
            title: 'Test Game GDB Error',
            executable: 'game.exe',
            gamesdb_credentials: {
              store: 'steam',
              id: 'invalid-id'
            },
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      mockGetWikiGameInfo.mockResolvedValue(null)
      mockGetGamesdbData.mockRejectedValue(new Error('GamesDB fetch failed'))

      const result = await getCustomLibraries()

      expect(result).toHaveLength(1)
      expect(mockLogWarning).not.toHaveBeenCalled()
    })

    it('should preserve existing game properties', async () => {
      const libraryConfig = {
        name: 'Test Library Existing',
        games: [
          {
            app_name: 'test-game-existing',
            title: 'Test Game Existing',
            executable: 'game.exe',
            art_cover: 'https://existing.com/cover.jpg',
            description: 'Existing description',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      // Even though we call getWikiGameInfo, existing properties should be preserved
      mockGetWikiGameInfo.mockResolvedValue(null)

      const result = await getCustomLibraries()

      // The existing properties should be preserved (they are set in retrieveGameMetadata)
      expect(result[0].games[0].art_cover).toBe(
        'https://existing.com/cover.jpg'
      )
      expect(result[0].games[0].description).toBe('Existing description')
      expect(mockGetWikiGameInfo).toHaveBeenCalled()
    })

    it('should handle concurrent library processing', async () => {
      const urlLibrary = {
        name: 'URL Library',
        games: [
          {
            app_name: 'url-game',
            title: 'URL Game',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      const jsonLibrary = {
        name: 'JSON Library',
        games: [
          {
            app_name: 'json-game',
            title: 'JSON Game',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: ['https://example.com/library.json'],
        customLibraryConfigs: [JSON.stringify(jsonLibrary)]
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(urlLibrary)
      } as Response)

      const result = await getCustomLibraries()

      expect(result).toHaveLength(2)
      expect(result.find((lib) => lib.name === 'URL Library')).toBeDefined()
      expect(result.find((lib) => lib.name === 'JSON Library')).toBeDefined()
    })

    it('should create safe library IDs from names with special characters', async () => {
      const testCases = [
        { input: 'Test Library!@#', expected: 'test_library' },
        { input: 'My-Game_Collection', expected: 'my_game_collection' },
        { input: '  Spaced  Library  ', expected: 'spaced_library' },
        { input: 'Multiple___Underscores', expected: 'multiple_underscores' },
        { input: '123Numbers456', expected: '123numbers456' }
      ]

      for (const testCase of testCases) {
        const libraryConfig = {
          name: testCase.input,
          games: [
            {
              app_name: 'test-game',
              title: 'Test Game',
              executable: 'game.exe',
              install_tasks: [],
              uninstall_tasks: []
            }
          ]
        }

        mockGetSettings.mockReturnValue({
          customLibraryUrls: [],
          customLibraryConfigs: [JSON.stringify(libraryConfig)]
        })

        const result = await getCustomLibraries()
        expect(result[0].games[0].app_name).toBe(
          `${testCase.expected}__test-game`
        )

        // Reset for next iteration
        jest.clearAllMocks()
        mockGetSettings = jest.fn()
        mockGlobalConfigGet.mockReturnValue({
          getSettings: mockGetSettings
        })
      }
    })
  })

  describe('getCachedCustomLibraryEntry', () => {
    it('should return undefined for non-existent entries', () => {
      const result = getCachedCustomLibraryEntry('non-existent')
      expect(result).toBeUndefined()
    })

    it('should return cached entry after library loading', async () => {
      const libraryConfig = {
        name: 'Test Library Cache',
        games: [
          {
            app_name: 'test-game-cache',
            title: 'Test Game Cache',
            executable: 'game.exe',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      await getCustomLibraries()

      const cachedEntry = getCachedCustomLibraryEntry(
        'test_library_cache__test-game-cache'
      )
      expect(cachedEntry).toBeDefined()
      expect(cachedEntry?.title).toBe('Test Game Cache')
      expect(cachedEntry?.app_name).toBe('test_library_cache__test-game-cache')
    })
  })

  describe('version-based caching', () => {
    it('should use cached data for games with matching versions', async () => {
      // Use a unique library name to avoid conflicts
      const libraryConfig = {
        name: 'Test Library Cache V1',
        games: [
          {
            app_name: 'test-game-cache-v1',
            title: 'Test Game Cache V1',
            executable: 'game.exe',
            version: '1.0.0',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })

      const wikiInfo = {
        howlongtobeat: {
          gameImageUrl: 'https://cached.com/cover.jpg'
        }
      }

      mockGetWikiGameInfo.mockResolvedValue(wikiInfo as any)

      // First call
      await getCustomLibraries()

      // Reset mocks but keep the module cache
      jest.clearAllMocks()
      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfig)]
      })
      mockGlobalConfigGet.mockReturnValue({
        getSettings: mockGetSettings
      })

      // Second call should use cache
      const result = await getCustomLibraries()

      expect(mockGetWikiGameInfo).not.toHaveBeenCalled()
      expect(mockLogInfo).toHaveBeenCalledWith(
        'Skipping metadata fetch for Test Game Cache V1 - already cached with matching version 1.0.0'
      )
      expect(result[0].games[0].art_cover).toBe('https://cached.com/cover.jpg')
    })

    it('should refetch metadata when version changes', async () => {
      // Use unique library name
      const libraryName = 'Test Library Cache V2'
      const appName = 'test-game-cache-v2'

      const libraryConfigV1 = {
        name: libraryName,
        games: [
          {
            app_name: appName,
            title: 'Test Game Cache V2',
            executable: 'game.exe',
            version: '1.0.0',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfigV1)]
      })

      mockGetWikiGameInfo.mockResolvedValue({
        howlongtobeat: { gameImageUrl: 'https://old.com/cover.jpg' }
      } as any)

      await getCustomLibraries()

      // Second call with version 2.0.0
      const libraryConfigV2 = {
        name: libraryName,
        games: [
          {
            app_name: appName,
            title: 'Test Game Cache V2',
            executable: 'game.exe',
            version: '2.0.0',
            install_tasks: [],
            uninstall_tasks: []
          }
        ]
      }

      jest.clearAllMocks()
      mockGetSettings.mockReturnValue({
        customLibraryUrls: [],
        customLibraryConfigs: [JSON.stringify(libraryConfigV2)]
      })
      mockGlobalConfigGet.mockReturnValue({
        getSettings: mockGetSettings
      })

      mockGetWikiGameInfo.mockResolvedValue({
        howlongtobeat: { gameImageUrl: 'https://new.com/cover.jpg' }
      } as any)

      const result = await getCustomLibraries()

      expect(mockGetWikiGameInfo).toHaveBeenCalled()
      expect(mockLogInfo).toHaveBeenCalledWith(
        'Fetching metadata for Test Game Cache V2 (version: 2.0.0)'
      )
      expect(result[0].games[0].art_cover).toBe('https://new.com/cover.jpg')
    })
  })
})
