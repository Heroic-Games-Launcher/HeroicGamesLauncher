import { logError } from 'backend/logger/logger'
import { getInfoFromPCGamingWiki } from '../utils'
import axios from 'axios'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')

describe('getPCGamingWikiInfo', () => {
  test('fetches successfully via title', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1 } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: {
            '*':
              '{{Infobox game/row/reception|Metacritic|the-witcher-3-wild-hunt|10}}\n' +
              '{{Infobox game/row/reception|OpenCritic|463/the-witcher-3-wild-hunt|22}}\n' +
              '{{Infobox game/row/reception|IGDB|the-witcher-3-wild-hunt|40}}\n' +
              '|steam appid  = 100\n' +
              '|direct3d versions      = 11, 12\n' +
              '|hltb         = 10101\n'
          }
        }
      }
    })

    const result = await getInfoFromPCGamingWiki('The Witcher 3')
    expect(result).toStrictEqual(testPCGamingWikiInfo)
  })

  test('fetches successfully via id', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1 } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: {
            '*':
              '{{Infobox game/row/reception|Metacritic|the-witcher-3-wild-hunt|10}}\n' +
              '{{Infobox game/row/reception|OpenCritic|463/the-witcher-3-wild-hunt|22}}\n' +
              '{{Infobox game/row/reception|IGDB|the-witcher-3-wild-hunt|40}}\n' +
              '|steam appid  = 100\n' +
              '|direct3d versions      = 11, 12\n' +
              '|hltb         = 10101\n'
          }
        }
      }
    })

    const result = await getInfoFromPCGamingWiki('The Witcher 3', '1234')
    expect(result).toStrictEqual(testPCGamingWikiInfo)
  })

  test('does not find page id', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: undefined } }] }
    })

    const result = await getInfoFromPCGamingWiki('The Witcher 3')
    expect(result).toBeNull()
  })

  test('does not find wikitext', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1 } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          invalid: ''
        }
      }
    })

    const result = await getInfoFromPCGamingWiki('The Witcher 3')
    expect(result).toBeNull()
  })

  test('wikitext empty', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValueOnce({
      data: { cargoquery: [{ title: { pageID: 1 } }] }
    })
    mockAxios.mockResolvedValueOnce({
      data: {
        parse: {
          wikitext: undefined
        }
      }
    })

    const result = await getInfoFromPCGamingWiki('The Witcher 3')
    expect(result).toBeNull()
  })

  test('catches axios throws', async () => {
    jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Failed'))

    const result = await getInfoFromPCGamingWiki('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Was not able to get PCGamingWiki data for The Witcher 3',
        Error('Failed')
      ],
      'ExtraGameInfo'
    )
  })
})

const testPCGamingWikiInfo = {
  steamID: '100',
  metacritic: {
    score: '10',
    urlid: 'the-witcher-3-wild-hunt'
  },
  opencritic: {
    score: '22',
    urlid: '463/the-witcher-3-wild-hunt'
  },
  igdb: {
    score: '40',
    urlid: 'the-witcher-3-wild-hunt'
  },
  howLongToBeatID: '10101',
  direct3DVersions: ['11', '12']
}
