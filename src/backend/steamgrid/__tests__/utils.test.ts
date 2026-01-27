import axios from 'axios'
import { searchGame, getGrids } from '../utils'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

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
            Authorization: `Bearer ${apiKey}`
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
            Authorization: `Bearer ${apiKey}`
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
