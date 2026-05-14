import axios from 'axios'
import { fetchRawgRatings } from '../provider_rawg'

jest.mock('axios')
jest.mock('electron')

const mockedAxios = axios as jest.Mocked<typeof axios>

describe('fetchRawgRatings', () => {
  test('selects the best valid metacritic match', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          { slug: 'max-payne-3', name: 'Max Payne 3', metacritic: 87 },
          { slug: 'max-payne', name: 'Max Payne', metacritic: 89 },
          { slug: 'payne', name: 'Payne', metacritic: null }
        ]
      }
    } as never)

    const result = await fetchRawgRatings('api-key', 'Max Payne')

    const [url, config] = mockedAxios.get.mock.calls[0]
    expect(url).toBe('https://api.rawg.io/api/games')
    expect(config).toEqual(
      expect.objectContaining({
        params: { search: 'Max Payne', key: 'api-key' }
      })
    )
    expect(result).toEqual({
      score: 89,
      url: 'https://rawg.io/games/max-payne'
    })
  })

  test('returns null when valid matches are too distant', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          { slug: 'fifa-22', name: 'FIFA 22', metacritic: 80 },
          { slug: 'forza-horizon-5', name: 'Forza Horizon 5', metacritic: 91 }
        ]
      }
    } as never)

    const result = await fetchRawgRatings('api-key', 'Max Payne')

    expect(result).toBeNull()
  })

  test('returns null when there is no meaningful token overlap', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        results: [
          {
            slug: 'skies-of-arcadia',
            name: 'Skies of Arcadia',
            metacritic: 93
          }
        ]
      }
    } as never)

    const result = await fetchRawgRatings(
      'api-key',
      'Sunrider: Mask of Arcadius'
    )

    expect(result).toBeNull()
  })
})
