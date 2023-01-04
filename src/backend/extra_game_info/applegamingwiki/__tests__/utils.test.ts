import { logError } from '../../../logger/logger'
import { getInfoFromAppleGamingWiki } from '../utils'
import { appleGamingWikiInfoStore } from '../electronStores'
import axios from 'axios'
import { AppleGamingWikiInfo } from '../../../../common/types'

jest.mock('../../../logger/logfile')
jest.mock('../../../logger/logger')
jest.mock('electron-store')

describe('getAppleGamingWikiInfo', () => {
  test('fetches successfully', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1, crossover: 'perfect' } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: {
            '*':
              '|pcgamingwiki = The_Witcher_3:_Wild_Hunt\n' +
              '|codeweavers  = the-witcher-3-wild-hunt\n'
          }
        }
      }
    })

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toStrictEqual(testGameScore)
  })

  test('use cached data', async () => {
    jest.spyOn(appleGamingWikiInfoStore, 'get').mockReturnValue(testGameScore)
    const mockAxios = jest.spyOn(axios, 'get').mockImplementation()

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toStrictEqual(testGameScore)
    expect(mockAxios).not.toBeCalled()
  })

  test('cached data outdated', async () => {
    const oneMonthAgo = new Date(testGameScore.timestampLastFetch)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    jest.spyOn(appleGamingWikiInfoStore, 'get').mockReturnValue({
      ...testGameScore,
      timestampLastFetch: oneMonthAgo.toString()
    })

    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1, crossover: 'perfect' } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: {
            '*':
              '|pcgamingwiki = The_Witcher_3:_Wild_Hunt\n' +
              '|codeweavers  = the-witcher-3-wild-hunt\n'
          }
        }
      }
    })

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toStrictEqual(testGameScore)
  })

  test('does not find page id', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: undefined } }] }
    })

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toBeNull()
  })

  test('does not find wikitext', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1, crossover: undefined } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          invalid: ''
        }
      }
    })

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toStrictEqual({
      ...testGameScore,
      crossoverLink: '',
      crossoverRating: undefined
    })
  })

  test('wikitext empty', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1, crossover: 'perfect' } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: undefined
        }
      }
    })

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toStrictEqual({ ...testGameScore, crossoverLink: '' })
  })

  test('catches axios throws', async () => {
    jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Failed'))

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Was not able to get applegamingwiki data for The Witcher 3',
        Error('Failed')
      ],
      { prefix: 'ExtraGameInfo' }
    )
  })
})

const testGameScore = {
  timestampLastFetch: Date(),
  crossoverRating: 'perfect',
  crossoverLink: 'the-witcher-3-wild-hunt'
} as AppleGamingWikiInfo
