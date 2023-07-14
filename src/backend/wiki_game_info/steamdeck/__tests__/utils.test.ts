import { logError } from 'backend/logger/logger'
import { getSteamDeckComp } from '../utils'
import axios, { AxiosError } from 'axios'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')

describe('getSteamDeckComp', () => {
  test('fetches successfully via steamid', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { results: { resolved_category: 1 } }
    })

    const result = await getSteamDeckComp('1234')
    expect(result).toStrictEqual(testProtonDBInfo)
    expect(mockAxios).toBeCalled()
  })
  test('api change', async () => {
    const mockAxios = jest.spyOn(axios, 'get').mockResolvedValue({
      data: { results: { tierLevel: 'gold' } }
    })

    const result = await getSteamDeckComp('1234')
    expect(result).toStrictEqual(null)
    expect(mockAxios).toBeCalled()
  })
  test('does not find game', async () => {
    const mockAxios = jest
      .spyOn(axios, 'get')
      .mockRejectedValue(<AxiosError>new Error('not found'))

    const result = await getSteamDeckComp('1234')
    expect(result).toBeNull()
    expect(mockAxios).toBeCalled()
    expect(logError).toBeCalledWith(
      ['Was not able to get Stem Deck data for 1234', undefined],
      'ExtraGameInfo'
    )
  })

  test('no SteamID', async () => {
    const mockAxios = jest.spyOn(axios, 'get')

    const result = await getSteamDeckComp('')
    expect(result).toBeNull()
    expect(mockAxios).not.toBeCalled()
  })
})

const testProtonDBInfo = {
  category: 1
}
