import type { GamesDBInfo } from 'common/types'
import { axiosClient } from 'backend/utils'
import testData from './test-data.json'
import { getInfoFromGamesDB } from '../utils'
import { logError } from 'backend/logger'
import { FakeGame } from 'backend/__tests__/util'

jest.mock('backend/logger')
jest.mock('electron-store')

describe('getInfoFromGamesDB', () => {
  test('fetches successfully', async () => {
    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: testData
    })

    const game = new FakeGame('Grouse', 'legendary')
    const result = await getInfoFromGamesDB('Jotun', game)
    expect(result).toStrictEqual(testGamesDBInfo)
  })

  test('skip not supported runner', async () => {
    jest.spyOn(axiosClient, 'get').mockResolvedValue({
      data: testData
    })

    const game = new FakeGame('Grouse', 'sideload')
    const result = await getInfoFromGamesDB('Jotun', game)
    expect(result).toStrictEqual({ steamID: '' })
  })

  test('catches axios throws', async () => {
    jest.spyOn(axiosClient, 'get').mockRejectedValueOnce({
      response: {
        data: 'Failed'
      }
    })

    const game = new FakeGame('Grouse', 'legendary')
    const result = await getInfoFromGamesDB('Jotun', game)
    expect(result).toStrictEqual({ steamID: '' })
    expect(logError).toBeCalledWith(
      ['Was not able to get GamesDB data for Grouse', 'Failed'],
      'ExtraGameInfo'
    )
  })
})

const testGamesDBInfo = {
  steamID: '323580'
} as GamesDBInfo
