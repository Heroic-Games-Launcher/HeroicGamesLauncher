import axios from 'axios'
import { searchGame, getGrids } from '../utils'
import { app } from 'electron'
import { sgdbContentFilters } from 'common/types'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeroicGamesLauncher/${app.getVersion()}`

describe('SteamGridDB Utils', () => {
  const apiKey = 'test-api-key'

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('searchGame', () => {
    it('should return a list of games on success', async () => {
      const mockData = {
        success: true,
        data: [
          { id: 1, name: 'Game 1' },
          { id: 2, name: 'Game 2' }
        ]
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const results = await searchGame(apiKey, 'query')

      expect(results).toEqual(mockData.data)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.steamgriddb.com/api/v2/search/autocomplete/query',
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': userAgent
          }
        }
      )
    })

    it('should throw an error if the API returns success: false', async () => {
      const mockData = {
        success: false,
        errors: ['Invalid API Key']
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      await expect(searchGame(apiKey, 'query')).rejects.toThrow(
        'Invalid API Key'
      )
    })

    it('should throw a default error if success: false and no errors provided', async () => {
      const mockData = {
        success: false
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      await expect(searchGame(apiKey, 'query')).rejects.toThrow('Search failed')
    })
  })

  describe('getGrids', () => {
    it('should return a list of grids on success', async () => {
      const mockData = {
        success: true,
        data: [
          { id: 10, url: 'url1', thumb: 'thumb1' },
          { id: 11, url: 'url2', thumb: 'thumb2' }
        ]
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      const results = await getGrids(apiKey, { gameId: 123 })

      expect(results).toEqual(mockData.data)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.steamgriddb.com/api/v2/grids/game/123',
        {
          params: {},
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'User-Agent': userAgent
          }
        }
      )
    })

    it('should pass dimensions and styles as comma-separated strings', async () => {
      const mockData = {
        success: true,
        data: []
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      await getGrids(apiKey, {
        gameId: 123,
        dimensions: ['460x215', '920x430'],
        styles: ['alternate', 'blurred']
      })

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            dimensions: '460x215,920x430',
            styles: 'alternate,blurred'
          }
        })
      )
    })

    it('should not send any content filter params when none are enabled', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] }
      })

      await getGrids(apiKey, { gameId: 123, contentFilters: [] })

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: {} })
      )
    })

    it.each(sgdbContentFilters)(
      'should send %s=any when that filter is enabled',
      async (filter) => {
        mockedAxios.get.mockResolvedValueOnce({
          data: { success: true, data: [] }
        })

        await getGrids(apiKey, { gameId: 123, contentFilters: [filter] })

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ params: { [filter]: 'any' } })
        )
      }
    )

    it('should send every enabled content filter at once', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] }
      })

      await getGrids(apiKey, {
        gameId: 123,
        contentFilters: ['nsfw', 'humor', 'epilepsy']
      })

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: { nsfw: 'any', humor: 'any', epilepsy: 'any' }
        })
      )
    })

    it('should combine content filters with dimensions and styles', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] }
      })

      await getGrids(apiKey, {
        gameId: 123,
        dimensions: ['460x215'],
        styles: ['alternate'],
        contentFilters: ['humor']
      })

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            dimensions: '460x215',
            styles: 'alternate',
            humor: 'any'
          }
        })
      )
    })

    it('should throw an error if the API returns success: false', async () => {
      const mockData = {
        success: false,
        errors: ['Game not found']
      }
      mockedAxios.get.mockResolvedValueOnce({ data: mockData })

      await expect(getGrids(apiKey, { gameId: 123 })).rejects.toThrow(
        'Game not found'
      )
    })
  })
})
