import { getGameScore } from '../utils'
import * as whatToPlay from 'what-to-play/build/output'
import { gameScoreStore } from '../electronStores'

jest.mock('../../../logger/logfile')
jest.mock('../../../logger/logger')

describe('getGameScore', () => {
  test('success', async () => {
    jest.spyOn(whatToPlay, 'getData').mockResolvedValue(testGameScore)

    const result = await getGameScore('The Witcher 3')
    expect(result).toStrictEqual(testGameScore)
  })

  test('fails', async () => {
    jest.spyOn(whatToPlay, 'getData').mockRejectedValue(new Error('Failed'))

    const result = await getGameScore('The Witcher 3')
    expect(result).toBeNull()
  })

  test('cached', async () => {
    jest.spyOn(gameScoreStore, 'get').mockReturnValue(testGameScore)
    const mockGetData = jest.spyOn(whatToPlay, 'getData').mockImplementation()

    const result = await getGameScore('The Witcher 3')
    expect(result).toStrictEqual(testGameScore)
    expect(mockGetData).not.toBeCalled()
  })
})

const testGameScore: whatToPlay.AllData = {
  game: 'The Witcher 3',
  aggregateScore: 93.2,
  gog: {
    name: 'The Witcher 3: Wild Hunt - Blood and Wine',
    score: 4.9,
    url: 'https://www.gog.com/de/game/witcher_3_wild_hunt_the_blood_and_wine_pack'
  },
  metacritic: {
    name: 'The Witcher 3: Wild Hunt',
    url: 'https://www.metacritic.com/game/playstation-4/the-witcher-3-wild-hunt',
    metascore: 50,
    userscore: 4.5,
    releaseDate: 'May 19, 2015',
    metascoreUrl: 'https://www.metacritic.com/game/pc/the-witcher-3-wild-hunt',
    userscoreUrl: 'https://www.metacritic.com/game/pc/the-witcher-3-wild-hunt'
  },
  steam: {
    name: 'The Witcher® 3: Wild Hunt',
    recentScore: 88,
    allTimeScore: 96,
    url: 'https://store.steampowered.com/app/292030/The_Witcher_3_Wild_Hunt/?snr=1_7_15__13',
    releaseDate: '18 May, 2015'
  },
  hltb: undefined
}
