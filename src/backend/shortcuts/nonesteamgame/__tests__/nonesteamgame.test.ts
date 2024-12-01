import { readFileSync, copyFileSync, mkdirSync } from 'graceful-fs'
import { GameInfo } from 'common/types'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { addNonSteamGame, removeNonSteamGame } from '../nonesteamgame'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import { GlobalConfig } from 'backend/config'
import { logInfo, logError, logWarning } from '../../../logger/logger'

jest.mock('backend/logger/logfile')
jest.mock('backend/logger/logger')
jest.mock('backend/dialog/dialog')
jest.mock('backend/utils')
jest.mock('backend/config')
jest.mock('backend/wiki_game_info/wiki_game_info')

let tmpDir = {} as DirResult
let tmpSteamUserConfigDir = ''

function copyTestFile(file: string, alternativeUserPath = '') {
  const testFileDir = join(__dirname, 'test_data')
  const userDir = alternativeUserPath
    ? join(alternativeUserPath, 'shortcuts.vdf')
    : join(tmpSteamUserConfigDir, 'shortcuts.vdf')
  copyFileSync(join(testFileDir, file), userDir)
}

describe('NonSteamGame', () => {
  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    // @ts-expect-error FIXME Mocks should not work like this
    GlobalConfig['setConfigValue']('defaultSteamPath', tmpDir.name + "'")
    tmpSteamUserConfigDir = join(
      tmpDir.name,
      'userdata',
      'steam_user',
      'config'
    )
    mkdirSync(tmpSteamUserConfigDir, { recursive: true })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Already exist in shortcuts.vdf', async () => {
    copyTestFile('shortcuts_valid.vdf')
    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

    const contentBefore = readFileSync(shortcutFilePath).toString()
    const game = { title: 'Discord', app_name: 'Discord' } as GameInfo

    await addNonSteamGame({
      gameInfo: game
    })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
    expect(logInfo).toBeCalledWith(
      `${game.title} was successfully added to Steam.`,
      'Shortcuts'
    )
  })

  test('Add and remove game to shortcuts.vdf', async () => {
    copyTestFile('shortcuts_valid.vdf')
    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')
    const game = { title: 'MyGame', app_name: 'game' } as GameInfo
    const contentBefore = readFileSync(shortcutFilePath).toString()

    await addNonSteamGame({
      gameInfo: game
    })

    const contentBetween = readFileSync(shortcutFilePath).toString()

    await removeNonSteamGame({
      gameInfo: game
    })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
    expect(contentBefore).not.toBe(contentBetween)
    expect(contentBetween).toContain(game.title)
    expect(logInfo).toBeCalledWith(
      `${game.title} was successfully added to Steam.`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `${game.title} was successfully removed from Steam.`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `Prepare Steam images for ${game.title}`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `Remove Steam images for ${game.title}`,
      'Shortcuts'
    )
  })

  test('Create shortcuts.vdf if not exist', async () => {
    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

    const game = { title: 'MyGame', app_name: 'game' } as GameInfo

    // add and remove to see if empty shortcuts.vdf is correctly created
    await addNonSteamGame({
      gameInfo: game
    })

    await removeNonSteamGame({
      gameInfo: game
    })

    const contentAfter = readFileSync(shortcutFilePath)

    // checks if shortcuts.vdf is "\x00shortcuts\x00\x08\x08"
    // \x00 = NULL
    // \x08 = Backspace
    expect(contentAfter).toStrictEqual(
      Buffer.from([0, 115, 104, 111, 114, 116, 99, 117, 116, 115, 0, 8, 8])
    )
    expect(logInfo).toBeCalledWith(
      `${game.title} was successfully added to Steam.`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `${game.title} was successfully removed from Steam.`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `Prepare Steam images for ${game.title}`,
      'Shortcuts'
    )
    expect(logInfo).toBeCalledWith(
      `Remove Steam images for ${game.title}`,
      'Shortcuts'
    )
  })

  test('Catch corrupt shortcuts.vdf because of missing AppName', async () => {
    copyTestFile('shortcuts_missing_appname.vdf')

    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

    const game = {} as GameInfo

    await addNonSteamGame({
      gameInfo: game
    })
    expect(logInfo).not.toBeCalled()
    expect(logError).toBeCalledWith(
      `Can't add "${game.title}" to Steam user "steam_user". "${shortcutFilePath}" is corrupted!\n` +
        'One of the game entries is missing the AppName parameter!',
      'Shortcuts'
    )
    expect(showDialogBoxModalAuto).toBeCalled()
  })

  test('Catch corrupt shortcuts.vdf because of missing Exe', async () => {
    copyTestFile('shortcuts_missing_exe.vdf')

    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

    const game = {} as GameInfo

    await addNonSteamGame({
      gameInfo: game
    })

    expect(logInfo).not.toBeCalled()
    expect(logError).toBeCalledWith(
      `Can't add "${game.title}" to Steam user "steam_user". "${shortcutFilePath}" is corrupted!\n` +
        'One of the game entries is missing the Exe parameter!',
      'Shortcuts'
    )
    expect(showDialogBoxModalAuto).toBeCalled()
  })

  test('Catch corrupt shortcuts.vdf because of missing LaunchOptions', async () => {
    copyTestFile('shortcuts_missing_launchoptions.vdf')

    const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

    const game = {} as GameInfo

    await addNonSteamGame({
      gameInfo: game
    })

    expect(logInfo).not.toBeCalled()
    expect(logError).toBeCalledWith(
      `Can't add "${game.title}" to Steam user "steam_user". "${shortcutFilePath}" is corrupted!\n` +
        'One of the game entries is missing the LaunchOptions parameter!',
      'Shortcuts'
    )
    expect(showDialogBoxModalAuto).toBeCalled()
  })

  test(
    'Test that adding or removing does not fail, if one Steam user shortcuts.vdf ' +
      ' is corrupted and other Steam user shortcuts.vdf succeeds',
    async () => {
      copyTestFile('shortcuts_valid.vdf')

      //prepare second user folder
      const secondUserDir = join(
        tmpDir.name,
        'userdata',
        'steam_user2',
        'config'
      )
      mkdirSync(secondUserDir, { recursive: true })
      copyTestFile('shortcuts_missing_appname.vdf', secondUserDir)

      const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')
      const shortcutFilePath2 = join(secondUserDir, 'shortcuts.vdf')

      const game = { title: 'MyGame', app_name: 'game' } as GameInfo
      const contentBefore = readFileSync(shortcutFilePath).toString()
      const contentBefore2 = readFileSync(shortcutFilePath2).toString()

      await addNonSteamGame({
        gameInfo: game
      })

      const contentBetween = readFileSync(shortcutFilePath).toString()
      const contentBetween2 = readFileSync(shortcutFilePath2).toString()

      await removeNonSteamGame({
        gameInfo: game
      })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      const contentAfter2 = readFileSync(shortcutFilePath2).toString()

      expect(contentBefore).toStrictEqual(contentAfter)
      expect(contentBefore).not.toBe(contentBetween)
      expect(contentBetween).toContain(game.title)

      expect(contentBefore2).toStrictEqual(contentAfter2)
      expect(contentBefore2).toStrictEqual(contentBetween2)

      expect(logInfo).toBeCalledWith(
        `Prepare Steam images for ${game.title}`,
        'Shortcuts'
      )
      expect(logInfo).toBeCalledWith(
        `Remove Steam images for ${game.title}`,
        'Shortcuts'
      )

      expect(logInfo).toBeCalledTimes(2)
      expect(logWarning).toBeCalledWith(
        `${game.title} could not be added to all found Steam users.`,
        'Shortcuts'
      )
      expect(logWarning).toBeCalledWith(
        `${game.title} could not be removed from all found Steam users.`,
        'Shortcuts'
      )
      expect(logError).toBeCalledWith(
        `Can't add "${game.title}" to Steam user "steam_user2". "${shortcutFilePath2}" is corrupted!\n` +
          'One of the game entries is missing the AppName parameter!',
        'Shortcuts'
      )
      expect(logError).toBeCalledWith(
        `Can't remove "${game.title}" from Steam user "steam_user2". "${shortcutFilePath2}" is corrupted!\n` +
          'One of the game entries is missing the AppName parameter!',
        'Shortcuts'
      )
      expect(showDialogBoxModalAuto).not.toBeCalled()
    }
  )

  test('Test for shortcuts.vdf provided by users/dev', async () => {
    const userFiles = [
      'shortcuts_commandmc.vdf',
      'shortcuts_redromnon.vdf',
      'shortcuts_felipecrs.vdf'
    ]

    for (const file of userFiles) {
      copyTestFile(file)

      const shortcutFilePath = join(tmpSteamUserConfigDir, 'shortcuts.vdf')

      const game = { title: 'MyGame', app_name: 'Game' } as GameInfo

      await addNonSteamGame({
        gameInfo: game
      })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      expect(contentAfter).toContain('MyGame')
      expect(logInfo).toBeCalledWith(
        `${game.title} was successfully added to Steam.`,
        'Shortcuts'
      )
      expect(logError).not.toBeCalled()
      expect(showDialogBoxModalAuto).not.toBeCalled()
    }
  })
})
