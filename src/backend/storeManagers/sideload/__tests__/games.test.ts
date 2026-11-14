import SideloadGame from '../games'
import { libraryStore } from '../electronStores'
import { removeShortcuts } from 'backend/shortcuts/shortcuts/shortcuts'
import { removeNonSteamGame } from 'backend/shortcuts/nonesteamgame/nonesteamgame'
import { removeRecentGame } from 'backend/recent_games/recent_games'
import { logError, LogPrefix } from 'backend/logger'
import { existsSync, rmSync } from 'graceful-fs'
import { sendGameStatusUpdate } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { removePrefix } from 'backend/utils/uninstaller'
import { notify } from 'backend/dialog/dialog'
import { userHome } from 'backend/constants/paths'
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
jest.mock('backend/utils/uninstaller', () => ({
  removePrefix: jest.fn()
}))
jest.mock('backend/ipc', () => ({
  sendFrontendMessage: jest.fn()
}))
jest.mock('backend/recent_games/recent_games', () => ({
  removeRecentGame: jest.fn()
}))
jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  rmSync: jest.fn()
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

  test('handles concurrent uninstalls of multiple games cleanly', async () => {
    const game2Info = {
      ...gameInfo,
      app_name: 'game-2',
      title: 'Game 2'
    } as GameInfo

    let games = [gameInfo, game2Info]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })

    // Simulate async work during cleanup
    jest.mocked(removeShortcuts).mockImplementation(async () => {
      await Promise.resolve()
    })

    const game1 = new SideloadGame(gameInfo.app_name)
    const game2 = new SideloadGame(game2Info.app_name)

    await Promise.all([
      game1.uninstall({ shouldRemovePrefix: false }),
      game2.uninstall({ shouldRemovePrefix: false })
    ])

    expect(libraryStore.get('games', [])).toEqual([])
  })

  test('handles concurrent duplicate uninstalls of the same game safely', async () => {
    jest.mocked(removeShortcuts).mockImplementation(async () => {
      await Promise.resolve()
    })

    const game1 = new SideloadGame(gameInfo.app_name)
    const game2 = new SideloadGame(gameInfo.app_name)

    await Promise.all([
      game1.uninstall({ shouldRemovePrefix: false }),
      game2.uninstall({ shouldRemovePrefix: false })
    ])

    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('safely deletes files when deleteFiles is true and directory exists', async () => {
    const gameWithExe = {
      ...gameInfo,
      install: { is_dlc: false, executable: '/home/user/Games/MyGame/game.exe' }
    } as GameInfo
    let games = [gameWithExe]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })
    jest.mocked(existsSync).mockReturnValue(true)

    const game = new SideloadGame(gameWithExe.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(existsSync).toHaveBeenCalledWith('/home/user/Games/MyGame')
    expect(rmSync).toHaveBeenCalledWith('/home/user/Games/MyGame', {
      recursive: true
    })
    expect(libraryStore.get('games', [])).toEqual([])
  })

  test('skips file deletion when deleteFiles is true but directory does not exist', async () => {
    const gameWithExe = {
      ...gameInfo,
      install: { is_dlc: false, executable: '/home/user/Games/MyGame/game.exe' }
    } as GameInfo
    let games = [gameWithExe]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })
    jest.mocked(existsSync).mockReturnValue(false)

    const game = new SideloadGame(gameWithExe.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(existsSync).toHaveBeenCalledWith('/home/user/Games/MyGame')
    expect(rmSync).not.toHaveBeenCalled()
    expect(libraryStore.get('games', [])).toEqual([])
  })

  test('finishes uninstall and logs when rmSync throws an error', async () => {
    const gameWithExe = {
      ...gameInfo,
      install: { is_dlc: false, executable: '/home/user/Games/MyGame/game.exe' }
    } as GameInfo
    let games = [gameWithExe]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })
    jest.mocked(existsSync).mockReturnValue(true)
    const rmError = new Error('EACCES: permission denied')
    jest.mocked(rmSync).mockImplementation(() => {
      throw rmError
    })

    const game = new SideloadGame(gameWithExe.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(logError).toHaveBeenCalledWith(
      ['Failed to delete game files for', gameWithExe.app_name, rmError],
      LogPrefix.Backend
    )
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameWithExe.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('avoids deleting current directory or root if executable has no directory path', async () => {
    const gameWithBareExe = {
      ...gameInfo,
      install: { is_dlc: false, executable: 'game.exe' }
    } as GameInfo
    let games = [gameWithBareExe]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })

    const game = new SideloadGame(gameWithBareExe.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(rmSync).not.toHaveBeenCalled()
    expect(libraryStore.get('games', [])).toEqual([])
  })

  test('notifies frontend to refresh sideload library on successful uninstall', async () => {
    const game = new SideloadGame(gameInfo.app_name)
    await game.uninstall({ shouldRemovePrefix: false })

    expect(sendFrontendMessage).toHaveBeenCalledWith(
      'refreshLibrary',
      'sideload'
    )
  })

  test('finishes uninstall and logs when removePrefix throws an error', async () => {
    const prefixError = new Error('EBUSY: resource busy or locked')
    jest.mocked(removePrefix).mockImplementation(() => {
      throw prefixError
    })

    const game = new SideloadGame(gameInfo.app_name)
    await expect(game.uninstall({ shouldRemovePrefix: true })).resolves.toEqual(
      { stderr: '', stdout: '' }
    )

    expect(logError).toHaveBeenCalledWith(
      ['Failed to remove prefix for', gameInfo.app_name, prefixError],
      LogPrefix.Backend
    )
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('finishes uninstall and logs when notify throws an error', async () => {
    const notifyError = new Error('Notification daemon crashed')
    jest.mocked(notify).mockImplementation(() => {
      throw notifyError
    })

    const game = new SideloadGame(gameInfo.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(logError).toHaveBeenCalledWith(
      ['Failed to show notification for', gameInfo.app_name, notifyError],
      LogPrefix.Backend
    )
    expect(removeShortcuts).toHaveBeenCalledWith(game)
    expect(removeNonSteamGame).toHaveBeenCalledWith(game)
    expect(libraryStore.get('games', [])).toEqual([])
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName: gameInfo.app_name,
      runner: 'sideload',
      status: 'done'
    })
  })

  test('supports calling uninstall with no arguments', async () => {
    const game = new SideloadGame(gameInfo.app_name)
    await expect(game.uninstall()).resolves.toEqual({ stderr: '', stdout: '' })

    expect(removeShortcuts).toHaveBeenCalledWith(game)
    expect(removeNonSteamGame).toHaveBeenCalledWith(game)
    expect(libraryStore.get('games', [])).toEqual([])
  })

  test('avoids deleting root or user home directory when deleteFiles is true', async () => {
    const gameInHome = {
      ...gameInfo,
      install: { is_dlc: false, executable: `${userHome}/game.sh` }
    } as GameInfo
    let games = [gameInHome]
    jest.mocked(libraryStore).get.mockImplementation(() => games)
    jest.mocked(libraryStore).set.mockImplementation((_key, value) => {
      games = value as GameInfo[]
      return libraryStore
    })
    jest.mocked(existsSync).mockReturnValue(true)

    const game = new SideloadGame(gameInHome.app_name)
    await expect(
      game.uninstall({ shouldRemovePrefix: false, deleteFiles: true })
    ).resolves.toEqual({ stderr: '', stdout: '' })

    expect(rmSync).not.toHaveBeenCalled()
    expect(libraryStore.get('games', [])).toEqual([])
  })
})
