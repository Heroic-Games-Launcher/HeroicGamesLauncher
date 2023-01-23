import { logError } from 'backend/logger/logger'
import { getInfoFromAppleGamingWiki } from '../utils'
import axios from 'axios'
import { AppleGamingWikiInfo } from 'common/types'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')
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
    expect(result).toStrictEqual(testAppleGamingWikiInfo)
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
      ...testAppleGamingWikiInfo,
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
    expect(result).toStrictEqual({
      ...testAppleGamingWikiInfo,
      crossoverLink: ''
    })
  })

  test('catches axios throws', async () => {
    jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Failed'))

    const result = await getInfoFromAppleGamingWiki('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Was not able to get AppleGamingWiki data for The Witcher 3',
        Error('Failed')
      ],
      'ExtraGameInfo'
    )
  })
})

const testAppleGamingWikiInfo = {
  crossoverRating: 'perfect',
  crossoverLink: 'the-witcher-3-wild-hunt'
} as AppleGamingWikiInfo
