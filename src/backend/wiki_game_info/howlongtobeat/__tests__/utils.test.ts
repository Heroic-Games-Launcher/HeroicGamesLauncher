// needs to be here, because jest.mock places itself before import.
const mockSearch = jest.fn()

import { logError } from 'backend/logger/logger'
import { getHowLongToBeat } from '../utils'
import { HowLongToBeatEntry } from 'howlongtobeat'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')
jest.mock('electron-store')
jest.mock('howlongtobeat', () => ({
  __esModule: true,
  ...jest.requireActual('howlongtobeat'),
  HowLongToBeatService: class {
    public search = mockSearch
  }
}))

describe('getHowLongToBeat', () => {
  beforeEach(() => {
    mockSearch.mockClear()
  })

  test('fetches successfully via title', async () => {
    mockSearch.mockResolvedValueOnce([testHowLongToBeat])

    const result = await getHowLongToBeat('The Witcher 3')
    expect(result).toStrictEqual(testHowLongToBeat)
  })

  test('fallbacks to title if id is invalid', async () => {
    mockSearch.mockResolvedValueOnce([testHowLongToBeat])

    const result = await getHowLongToBeat('The Witcher 3')
    expect(mockSearch).toBeCalledTimes(1)
    expect(result).toStrictEqual(testHowLongToBeat)
  })

  test('catches hltb throws', async () => {
    mockSearch.mockRejectedValueOnce(new Error('Failed'))

    const result = await getHowLongToBeat('The Witcher 3')
    expect(result).toBeNull()
    expect(logError).toBeCalledWith(
      [
        'Was not able to get HowLongToBeat data for The Witcher 3',
        Error('Failed')
      ],
      'ExtraGameInfo'
    )
  })
})

const testHowLongToBeat = {
  id: '1234',
  name: 'The Witcher 3',
  description: 'Game',
  platforms: ['PC'],
  imageUrl: 'image/url',
  timeLabels: [['TimeLabels']],
  gameplayMain: 100,
  gameplayMainExtra: 150,
  gameplayCompletionist: 200,
  similarity: 1234,
  searchTerm: 'term',
  playableOn: ['steam']
} as HowLongToBeatEntry
