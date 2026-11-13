import SideloadGame from '../games'
import { libraryStore } from '../electronStores'
import { removeShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { logError, LogPrefix } from 'backend/logger'
import { sendGameStatusUpdate } from 'backend/utils'
import type { GameInfo } from 'common/types'

jest.mock('../electronStores', () => ({
  libraryStore: {
    get: jest.fn(),
    set: jest.fn()
  }
}))
jest.mock('backend/game_config', () => ({}))
jest.mock('backend/utils', () => ({
  sendGameStatusUpdate: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))
jest.mock('backend/shortcuts/shortcuts/shortcuts', () => ({
  removeShortcuts: jest.fn()
}))
jest.mock('backend/shortcuts/nonesteamgame/nonesteamgame', () => ({
  removeNonSteamGame: jest.fn()
}))
jest.mock('backend/dialog/dialog', () => ({
  notify: jest.fn()
}))
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
    jest.clearAllMocks()
    let games = [gameInfo]
    jest.mocked(libraryStore).get.mockImplementation(() => {
      return games
    })
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

  test('finishes the uninstall and logs when shortcut cleanup fails', async () => {
    const failure = new Error('shortcut cleanup failed')
    jest.mocked(removeShortcuts).mockRejectedValue(failure)

    const game = new SideloadGame(gameInfo.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(logError).toHaveBeenCalledWith(
      ['Failed to remove shortcuts for', gameInfo.app_name, failure],
      LogPrefix.Backend
    )
    expect(removeNonSteamGame).toHaveBeenCalledWith(game)
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('finishes the uninstall and logs when Steam shortcut cleanup fails', async () => {
    const failure = new Error('steam shortcut cleanup failed')
    jest.mocked(removeNonSteamGame).mockRejectedValue(failure)

    const game = new SideloadGame(gameInfo.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(removeShortcuts).toHaveBeenCalledWith(game)
    expect(logError).toHaveBeenCalledWith(
      ['Failed to remove Steam shortcuts for', gameInfo.app_name, failure],
      LogPrefix.Backend
    )
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('does not overwrite library changes made while cleanup runs', async () => {
    const otherGame = {
      ...gameInfo,
      app_name: 'other-game',
      title: 'Other Game'
    } as GameInfo

    jest.mocked(removeShortcuts).mockImplementation(async () => {
      // Another game is added while this uninstall is still cleaning up, so
      // the concurrent write lands before the library entry is dropped.
      await Promise.resolve()
      jest.mocked(libraryStore).set('games', [gameInfo, otherGame])
    })

    const game = new SideloadGame(gameInfo.app_name)
    await game.uninstall({ shouldRemovePrefix: false })

    expect(libraryStore.get('games', [])).toEqual([otherGame])
  })

  test('handles uninstall cleanly when game is missing from library or has undefined install info', async () => {
    jest.mocked(libraryStore).get.mockReturnValue([])

    const game = new SideloadGame('non-existent-game')
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: 'non-existent-game',
      runner: 'sideload',
      status: 'done'
    })
  })

  test('finishes the uninstall and logs when removeRecentGame fails', async () => {
    const failure = new Error('recent game removal failed')
    jest.mocked(removeRecentGame).mockRejectedValueOnce(failure)

    const game = new SideloadGame(gameInfo.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(logError).toHaveBeenCalledWith(
      ['Failed to remove recent game for', gameInfo.app_name, failure],
      LogPrefix.Backend
    )
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })
})
