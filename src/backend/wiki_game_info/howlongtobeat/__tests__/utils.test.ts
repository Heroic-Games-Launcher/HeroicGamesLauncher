import { logError } from 'backend/logger/logger'
import { getHowLongToBeat, type HowLongToBeatEntry } from '../utils'
import axios from 'axios'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')
jest.mock('electron-store')

describe('getHowLongToBeat', () => {
  test('fetches successfully via title', async () => {
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { data: [testHowLongToBeat] }
    })
    const result = await getHowLongToBeat('The Witcher 3')
    expect(result).toStrictEqual(testHowLongToBeat)
  })

  test('Returns null on AxiosError', async () => {
    const errorJson = {
      someInfo: 'Error information would be here!'
    }
    jest.spyOn(axios, 'post').mockRejectedValue({
      isAxiosError: true,
      toJSON: () => errorJson
    })
    const result = await getHowLongToBeat('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Got AxiosError when sending HowLongToBeat request for The Witcher 3:',
        errorJson
      ],
      'ExtraGameInfo'
    )
  })

  test('Returns null on malformed response', async () => {
    const malformedResponse = { data: [{}] }
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: malformedResponse
    })
    const result = await getHowLongToBeat('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'HowLongToBeat response for',
        'The Witcher 3',
        'is malformed',
        {
          _errors: [],
          data: {
            _errors: [],
            0: {
              _errors: [],
              comp_100: { _errors: ['Required'] },
              comp_main: { _errors: ['Required'] },
              comp_plus: { _errors: ['Required'] }
            }
          }
        }
      ],
      'ExtraGameInfo'
    )
  })
})

const testHowLongToBeat: HowLongToBeatEntry = {
  comp_100: 624789,
  comp_main: 184975,
  comp_plus: 371630
}
