jest.mock('electron-store')

import { TypeCheckedStoreBackend } from 'backend/electron_store'

describe('playtime store replacement', () => {
  it('updates other store instances and preserves game IDs with dots', () => {
    const options = { cwd: 'playtime-test', name: 'timestamp' }
    const backend = new TypeCheckedStoreBackend('timestampStore', {
      ...options
    })
    const frontend = new TypeCheckedStoreBackend('timestampStore', {
      ...options
    })
    const history = {
      'game.with.dots': {
        firstPlayed: '2020-01-01',
        lastPlayed: '2021-01-01',
        totalPlayed: 123
      }
    }

    backend.replace(history)
    expect(frontend.raw_store).toEqual(history)
    backend.replace({})
    expect(frontend.raw_store).toEqual({})
  })
})
