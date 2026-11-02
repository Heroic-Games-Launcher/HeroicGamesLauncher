import SideloadLibraryManager from '../library'
import { libraryStore } from '../electronStores'
import { addShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import type { GameInfo } from 'common/types'

jest.mock('../electronStores', () => ({
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))
jest.mock('../games', () => jest.fn())
jest.mock('backend/shortcuts/shortcuts/shortcuts', () => ({
  addShortcuts: jest.fn()
}))
jest.mock('backend/ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('backend/logger', () => ({ logWarning: jest.fn() }))
jest.mock('backend/constants/environment', () => ({ isMac: false }))

test('saves a new sideloaded game before automatic shortcut creation reads it', () => {
  let saved: GameInfo[] = []
  jest.spyOn(libraryStore, 'get').mockImplementation(() => [...saved] as never)
  jest.spyOn(libraryStore, 'set').mockImplementation((_key, value) => {
    saved = value as GameInfo[]
  })
  jest.mocked(addShortcuts).mockImplementation(() => {
    expect(
      saved.find((game) => game.app_name === 'test-id')?.install.executable
    ).toBe('/games/Game.exe')
    return Promise.resolve()
  })
  new SideloadLibraryManager().addNewApp({
    app_name: 'test-id',
    title: 'Test',
    runner: 'sideload',
    install: { executable: '/games/Game.exe', platform: 'Windows' },
    art_cover: '',
    art_square: ''
  } as GameInfo)
  expect(addShortcuts).toHaveBeenCalledTimes(1)
})
