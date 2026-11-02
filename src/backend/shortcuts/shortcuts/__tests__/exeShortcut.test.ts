import { addShortcuts } from '../shortcuts'
import { GlobalConfig } from 'backend/config'
import { getExeIcon } from '../../exeIcon'
import { getIcon } from '../../utils'
import { writeFile, mkdir } from 'fs/promises'
import { logError } from 'backend/logger'
import { libraryManagerMap } from 'backend/storeManagers'
import type { Game } from 'common/types/game_manager'
import type { GameInfo } from 'common/types'

jest.mock('electron', () => ({
  app: { getPath: () => '/tmp/Desktop' },
  nativeImage: {},
  shell: {}
}))
jest.mock('fs/promises', () => ({ writeFile: jest.fn(), mkdir: jest.fn() }))
jest.mock('backend/config', () => ({ GlobalConfig: { get: jest.fn() } }))
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: { Backend: 'Backend' }
}))
jest.mock('../../utils', () => ({ getIcon: jest.fn() }))
jest.mock('../../exeIcon', () => ({
  ...jest.requireActual<typeof import('../../exeIcon')>('../../exeIcon'),
  getExeIcon: jest.fn()
}))
jest.mock('../../nonesteamgame/nonesteamgame', () => ({
  addNonSteamGame: jest.fn(() => Promise.resolve())
}))
jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: { gog: { getExecutable: jest.fn() } }
}))
jest.mock('backend/constants/environment', () => ({ isMac: false }))
jest.mock('backend/constants/paths', () => ({ userHome: '/tmp' }))

describe('Linux EXE shortcut icons', () => {
  const info = {
    app_name: 'game-id',
    runner: 'sideload',
    title: 'Example game',
    install: { executable: '/games/My Game/Game.exe' }
  } as GameInfo
  const game = {
    getGameInfo: () => info,
    getSettings: jest.fn()
  } as unknown as Game
  let enabled: boolean

  beforeEach(() => {
    enabled = true
    info.runner = 'sideload'
    info.install.install_path = undefined
    jest.mocked(writeFile).mockResolvedValue(undefined)
    jest.mocked(mkdir).mockResolvedValue(undefined)
    jest.spyOn(GlobalConfig, 'get').mockReturnValue({
      getSettings: () => ({
        useExeShortcutIcons: enabled,
        addStartMenuShortcuts: true
      })
    } as unknown as GlobalConfig)
    jest.mocked(game.getSettings).mockResolvedValue({ targetExe: '' } as never)
    jest.mocked(getIcon).mockResolvedValue('/artwork.jpg')
    jest.mocked(getExeIcon).mockResolvedValue('/extracted.png')
  })

  test('uses the extracted PNG for the application menu', async () => {
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenCalledWith('/games/My Game/Game.exe')
    expect(getIcon).not.toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/.local/share/applications/Example game.desktop',
      expect.stringContaining('Icon=/extracted.png'),
      { mode: 0o644 }
    )
  })

  test('keeps existing artwork behavior when disabled', async () => {
    enabled = false
    await addShortcuts(game)
    expect(getExeIcon).not.toHaveBeenCalled()
    expect(getIcon).toHaveBeenCalled()
  })

  test('falls back to artwork when there is no embedded icon', async () => {
    jest.mocked(getExeIcon).mockResolvedValue(undefined)
    await addShortcuts(game)
    expect(writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Icon=/artwork.jpg'),
      { mode: 0o644 }
    )
  })

  test('uses the alternate executable selected in game settings', async () => {
    jest
      .mocked(game.getSettings)
      .mockResolvedValue({ targetExe: '/games/ActualGame.exe' } as never)
    await addShortcuts(game, true)
    expect(getExeIcon).toHaveBeenCalledWith('/games/ActualGame.exe')
  })

  test('creates shortcuts even if game settings cannot be read', async () => {
    jest
      .mocked(game.getSettings)
      .mockRejectedValue(new Error('missing settings'))
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenCalledWith('/games/My Game/Game.exe')
    expect(getIcon).not.toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalled()
  })

  test('falls back to artwork if extraction rejects unexpectedly', async () => {
    jest.mocked(getExeIcon).mockRejectedValue(new Error('invalid resource'))
    await addShortcuts(game)
    expect(writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Icon=/artwork.jpg'),
      { mode: 0o644 }
    )
  })

  test('reports shortcut write failures without rejecting the IPC operation', async () => {
    jest.mocked(writeFile).mockRejectedValue(new Error('disk full'))
    await expect(addShortcuts(game)).resolves.toBeUndefined()
    expect(logError).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('Could not save shortcut')
      ]),
      expect.anything()
    )
  })

  test('tries the installed EXE when the configured override has no usable icon', async () => {
    jest
      .mocked(game.getSettings)
      .mockResolvedValue({ targetExe: '/games/Launcher.exe' } as never)
    jest
      .mocked(getExeIcon)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce('/game.png')
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenNthCalledWith(1, '/games/Launcher.exe')
    expect(getExeIcon).toHaveBeenNthCalledWith(2, '/games/My Game/Game.exe')
    expect(getIcon).not.toHaveBeenCalled()
  })

  test('uses GOG primary executables relative to the install directory', async () => {
    info.runner = 'gog'
    info.install.install_path = '/games/My Game'
    jest
      .mocked(libraryManagerMap.gog.getExecutable)
      .mockReturnValue('bin\\Game.exe')
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenCalledWith('/games/My Game/bin/Game.exe')
  })

  test('tries the installed executable if GOG metadata cannot be read', async () => {
    info.runner = 'gog'
    jest.mocked(libraryManagerMap.gog.getExecutable).mockImplementation(() => {
      throw new Error('missing metadata')
    })
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenCalledWith('/games/My Game/Game.exe')
  })

  test('does not try the same executable twice', async () => {
    jest
      .mocked(game.getSettings)
      .mockResolvedValue({ targetExe: info.install.executable } as never)
    jest.mocked(getExeIcon).mockResolvedValue(undefined)
    await addShortcuts(game)
    expect(getExeIcon).toHaveBeenCalledTimes(1)
    expect(getIcon).toHaveBeenCalled()
  })
})
