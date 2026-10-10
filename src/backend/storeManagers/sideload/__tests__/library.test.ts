import { GameInfo } from 'common/types'
import { addShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import { sendFrontendMessage } from 'backend/ipc'
import { libraryStore } from '../electronStores'
import SideloadLibraryManager from '../library'

jest.mock('backend/logger')
jest.mock('backend/ipc')
jest.mock('backend/shortcuts/shortcuts/shortcuts')
jest.mock('../games')
jest.mock('../electronStores', () => ({
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))

const mockGet = libraryStore.get as jest.Mock
const mockSet = libraryStore.set as jest.Mock
const mockAddShortcuts = addShortcuts as jest.Mock

const newApp = (overrides: Partial<GameInfo> = {}): GameInfo => ({
  runner: 'sideload',
  app_name: 'test-app',
  title: 'Test Game',
  art_cover: 'cover.png',
  art_square: 'square.png',
  install: { executable: '/games/test/game.sh', platform: 'linux' },
  is_installed: true,
  canRunOffline: true,
  ...overrides
})

describe('SideloadLibraryManager.addNewApp', () => {
  test('saves a new game to the store before creating its shortcuts', () => {
    mockGet.mockReturnValue([])

    new SideloadLibraryManager().addNewApp(newApp())

    expect(mockSet).toHaveBeenCalledTimes(1)
    const [key, games] = mockSet.mock.calls[0]
    expect(key).toBe('games')
    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({
      app_name: 'test-app',
      title: 'Test Game',
      folder_name: '/games/test'
    })

    expect(mockAddShortcuts).toHaveBeenCalledTimes(1)
    expect(mockSet.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddShortcuts.mock.invocationCallOrder[0]
    )
    expect(sendFrontendMessage).toHaveBeenCalledWith(
      'refreshLibrary',
      'sideload'
    )
  })

  test('saves edits to an existing game without creating shortcuts', () => {
    const existing = { ...newApp(), title: 'Old Title', extra: 'kept' }
    mockGet.mockReturnValue([existing])

    new SideloadLibraryManager().addNewApp(newApp({ title: 'New Title' }))

    expect(mockSet).toHaveBeenCalledTimes(1)
    const [, games] = mockSet.mock.calls[0]
    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({ title: 'New Title', extra: 'kept' })

    expect(mockAddShortcuts).not.toHaveBeenCalled()
    expect(sendFrontendMessage).toHaveBeenCalledWith(
      'refreshLibrary',
      'sideload'
    )
  })
})
