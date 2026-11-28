jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: {
    nile: {
      getGameInfo: () => ({
        app_name: 'amzn1.adg.product.example',
        runner: 'nile',
        title: 'Example Game',
        description: 'An Amazon game',
        extra: {
          reqs: [],
          genres: ['Action', 'Adventure'],
          releaseDate: '2021-05-04'
        }
      })
    }
  }
}))

import NileGameManager from '../games'

describe('NileGameManager.getExtraInfo', () => {
  it('keeps the genres loaded with the library', async () => {
    const extra = await new NileGameManager(
      'amzn1.adg.product.example'
    ).getExtraInfo()

    expect(extra.genres).toEqual(['Action', 'Adventure'])
    expect(extra.releaseDate).toBe('2021-05-04')
  })
})
