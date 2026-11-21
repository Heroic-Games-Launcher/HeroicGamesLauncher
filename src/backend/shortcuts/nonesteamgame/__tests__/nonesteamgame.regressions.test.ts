import { readFileSync, copyFileSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { app } from 'electron'
import {
  addNonSteamGame,
  isAddedToSteam,
  removeNonSteamGame
} from '../nonesteamgame'
import { notify, showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { GlobalConfig } from 'backend/config'
import { logError, logInfo } from 'backend/logger'
import { isSteamRunning } from '../steamProcess'
import {
  addShortcutViaSteamClient,
  getSteamClientShortcuts,
  isSteamClientApiAvailable,
  removeShortcutViaSteamClient
} from '../steamClient'
import * as steamhelper from '../steamhelper'
import type { Game } from 'common/types/game_manager'

jest.mock('electron')
jest.mock('i18next')
jest.mock('backend/logger')
jest.mock('backend/dialog/dialog')
jest.mock('backend/utils')
jest.mock('backend/config')
jest.mock('backend/wiki_game_info/wiki_game_info')
jest.mock('../steamProcess', () => ({ isSteamRunning: jest.fn() }))
jest.mock('../steamClient', () => ({
  isSteamClientApiAvailable: jest.fn(),
  getSteamClientShortcuts: jest.fn(),
  addShortcutViaSteamClient: jest.fn(),
  removeShortcutViaSteamClient: jest.fn(),
  setShortcutArtworkViaSteamClient: jest.fn(),
  steamClientArtworkTypes: { grid: 0, hero: 1, logo: 2, wideGrid: 3 }
}))

let tmpDir = {} as DirResult

function makeGameMock(
  title = 'MyGame',
  id = 'Game',
  runner = 'sideload'
): Game {
  return {
    getGameInfo: () => ({ title, app_name: id, runner })
  } as Game
}

function prepareUserConfigDir(user: string): string {
  const configDir = join(tmpDir.name, 'userdata', user, 'config')
  mkdirSync(configDir, { recursive: true })
  return configDir
}

function copyTestFile(file: string, targetDir: string) {
  copyFileSync(
    join(__dirname, 'test_data', file),
    join(targetDir, 'shortcuts.vdf')
  )
}

describe('NonSteamGame regressions', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    tmpDir = dirSync({ unsafeCleanup: true })
    GlobalConfig.setConfigValue('defaultSteamPath', tmpDir.name)
    jest.spyOn(app, 'getPath').mockReturnValue('/opt/heroic/heroic')
    ;(isSteamRunning as jest.Mock).mockReturnValue(false)
    ;(isSteamClientApiAvailable as jest.Mock).mockResolvedValue(false)
    ;(getSteamClientShortcuts as jest.Mock).mockResolvedValue([])
    ;(addShortcutViaSteamClient as jest.Mock).mockResolvedValue(1234)
    ;(removeShortcutViaSteamClient as jest.Mock).mockResolvedValue(undefined)
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('skips a corrupted shortcuts.vdf without rejecting when adding', async () => {
    const validDir = prepareUserConfigDir('steam_user')
    copyTestFile('shortcuts_valid.vdf', validDir)
    const corruptedDir = prepareUserConfigDir('steam_user2')
    copyTestFile('shortcuts_corrupted.vdf', corruptedDir)
    const corruptedFile = join(corruptedDir, 'shortcuts.vdf')
    const corruptedBefore = readFileSync(corruptedFile)

    const game = makeGameMock()
    await expect(addNonSteamGame(game)).resolves.toBe(true)

    expect(readFileSync(join(validDir, 'shortcuts.vdf')).toString()).toContain(
      'heroic://launch'
    )
    expect(readFileSync(corruptedFile)).toEqual(corruptedBefore)
    expect(logError).toBeCalledWith(
      expect.stringContaining('is corrupted!'),
      'Shortcuts'
    )
  })

  test('skips a corrupted shortcuts.vdf without rejecting when removing', async () => {
    const corruptedDir = prepareUserConfigDir('steam_user2')
    copyTestFile('shortcuts_corrupted.vdf', corruptedDir)

    await expect(removeNonSteamGame(makeGameMock())).resolves.toBe(false)
    expect(logError).toBeCalledWith(
      expect.stringContaining('is corrupted!'),
      'Shortcuts'
    )
  })

  test('skips a corrupted shortcuts.vdf without rejecting when checking', async () => {
    const corruptedDir = prepareUserConfigDir('steam_user2')
    copyTestFile('shortcuts_corrupted.vdf', corruptedDir)

    await expect(isAddedToSteam(makeGameMock())).resolves.toBe(false)
  })

  test('treats an entry missing LaunchOptions as valid', async () => {
    const configDir = prepareUserConfigDir('steam_user')
    copyTestFile('shortcuts_missing_launchoptions.vdf', configDir)
    const game = makeGameMock()

    await expect(addNonSteamGame(game)).resolves.toBe(true)

    expect(readFileSync(join(configDir, 'shortcuts.vdf')).toString()).toContain(
      'heroic://launch'
    )
    expect(logInfo).toBeCalledWith(
      `${game.getGameInfo().title} was successfully added to Steam.`,
      'Shortcuts'
    )
    expect(logError).not.toBeCalled()
    expect(showDialogBoxModalAuto).not.toBeCalled()
  })

  test('normalizes appid 0 when removing a shortcut', async () => {
    const configDir = prepareUserConfigDir('steam_user')
    copyTestFile('shortcuts_appid_zero.vdf', configDir)
    const removeImagesSpy = jest.spyOn(steamhelper, 'removeImagesFromSteam')

    await removeNonSteamGame(makeGameMock())

    expect(removeImagesSpy).toBeCalledWith(
      expect.objectContaining({
        appID: { bigPictureAppID: '33554432', otherGridAppID: '0' }
      })
    )
  })

  test('processes the userdata 0 folder', async () => {
    const configDir = prepareUserConfigDir('0')
    copyTestFile('shortcuts_valid.vdf', configDir)
    const game = makeGameMock()

    await expect(addNonSteamGame(game)).resolves.toBe(true)

    expect(readFileSync(join(configDir, 'shortcuts.vdf')).toString()).toContain(
      'heroic://launch'
    )
  })

  test('reports an already added game honestly instead of claiming success', async () => {
    ;(isSteamRunning as jest.Mock).mockReturnValue(true)
    const configDir = prepareUserConfigDir('steam_user')
    copyTestFile('shortcuts_appid_zero.vdf', configDir)
    const game = makeGameMock()

    await expect(addNonSteamGame(game)).resolves.toBe(true)

    expect(showDialogBoxModalAuto).not.toBeCalled()
    const messages = (notify as jest.Mock).mock.calls.map(
      (call: unknown[]) => (call[0] as { body?: string })?.body
    )
    expect(messages).toContain('notify.finished.add.steam.already')
  })

  test('fails loudly when the Steam client did not persist launchOptions', async () => {
    ;(isSteamRunning as jest.Mock).mockReturnValue(true)
    ;(isSteamClientApiAvailable as jest.Mock).mockResolvedValue(true)
    ;(getSteamClientShortcuts as jest.Mock).mockResolvedValue([])
    const game = makeGameMock()

    await expect(addNonSteamGame(game)).resolves.toBe(false)

    expect(removeShortcutViaSteamClient).toBeCalledWith(1234)
    expect(showDialogBoxModalAuto).toBeCalled()
    expect(notify).not.toBeCalled()
  })
})
