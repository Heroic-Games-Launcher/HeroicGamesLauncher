import SideloadGame from '../games'
import { libraryStore } from '../electronStores'
import { removeShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import type { GameInfo } from 'common/types'

jest.mock('../electronStores', () => ({
  libraryStore: { get: jest.fn(), set: jest.fn() }
}))
jest.mock('backend/game_config', () => ({}))
jest.mock('backend/utils', () => ({ sendGameStatusUpdate: jest.fn() }))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))
jest.mock('backend/shortcuts/shortcuts/shortcuts', () => ({
  removeShortcuts: jest.fn()
}))
jest.mock('backend/shortcuts/nonesteamgame/nonesteamgame', () => ({
  removeNonSteamGame: jest.fn()
}))
jest.mock('backend/dialog/dialog', () => ({ notify: jest.fn() }))
jest.mock('backend/storeManagers/storeManagerCommon/games', () => ({}))
jest.mock('backend/utils/uninstaller', () => ({}))
jest.mock('backend/recent_games/recent_games', () => ({
  removeRecentGame: jest.fn()
}))
jest.mock('backend/constants/environment', () => ({}))

describe('sideloaded game removal', () => {
  const gameInfo = {
    app_name: 'test-game',
    runner: 'sideload',
    title: 'Test Game',
    install: { is_dlc: false }
  } as GameInfo

  beforeEach(() => {
    let games = [gameInfo]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })
  })

  test('keeps game details available until shortcuts have been removed', async () => {
    jest.mocked(removeShortcuts).mockImplementation(async (game) => {
      expect(game.getGameInfo()).toEqual(gameInfo)
      // Cleanup must also be awaited before removing the library entry.
      await Promise.resolve()
      expect(game.getGameInfo()).toEqual(gameInfo)
    })
    jest.mocked(removeNonSteamGame).mockImplementation(async (game) => {
      expect(game.getGameInfo()).toEqual(gameInfo)
      await Promise.resolve()
      expect(game.getGameInfo()).toEqual(gameInfo)
      return true
    })

    const game = new SideloadGame(gameInfo.app_name)
    await game.uninstall({ shouldRemovePrefix: false })

    expect(removeShortcuts).toHaveBeenCalledWith(game)
    expect(removeNonSteamGame).toHaveBeenCalledWith(game)
    expect(libraryStore.get('games', [])).toEqual([])
  })
})
