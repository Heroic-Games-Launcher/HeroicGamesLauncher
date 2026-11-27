jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: {
    gog: {
      getGameInfo: () => ({
        app_name: '1207658924',
        runner: 'gog',
        title: 'Galactic Civilizations III',
        extra: {
          about: { description: 'Space 4X', shortDescription: '' },
          reqs: [],
          genres: ['Strategy', 'Simulation']
        }
      }),
      createReqsArray: jest.fn(async () => Promise.resolve([])),
      getProductApi: jest.fn(async () => Promise.resolve(undefined)),
      getGamesData: jest.fn(async () => Promise.resolve(undefined))
    }
  }
}))

import GOGGame from '../games'

describe('GOGGame.getExtraInfo', () => {
  it('keeps the genres loaded with the library', async () => {
    const extra = await new GOGGame('1207658924').getExtraInfo()

    expect(extra.genres).toEqual(['Strategy', 'Simulation'])
    expect(extra.about?.description).toBe('Space 4X')
  })
})
