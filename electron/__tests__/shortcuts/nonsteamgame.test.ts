import { readFileSync, copyFileSync, mkdirSync } from 'graceful-fs'
import { GameInfo } from './../../types'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import {
  addNonSteamGame,
  removeNonSteamGame,
  ShortcutsResult
} from '../../shortcuts/nonsteamgame'

let tmpDir = undefined as DirResult
let tmpSteamUserConfigDir = undefined as string

function copyTestFile(file: string, alternativeUserPath: string = undefined) {
  const testFileDir = join(__dirname, 'test_data')
  const userDir = alternativeUserPath
    ? join(alternativeUserPath, 'shortcuts.vdf')
    : join(tmpSteamUserConfigDir, 'shortcuts.vdf')
  copyFileSync(join(testFileDir, file), userDir)
}

describe('NonSteamGame', () => {
  beforeEach(() => {
    tmpDir = dirSync({ unsafeCleanup: true })
    tmpSteamUserConfigDir = join(tmpDir.name, 'steam_user', 'config')
    mkdirSync(tmpSteamUserConfigDir, { recursive: true })
  })

  afterEach(() => {
    tmpDir.removeCallback()
  })

  test('Already exist in shortcuts.vdf', async () => {
    copyTestFile('shortcuts_valid.vdf')
    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )

    const contentBefore = readFileSync(shortcutFilePath).toString()
    const game = { title: 'Discord', app_name: 'Discord' } as GameInfo

    await addNonSteamGame(tmpDir.name, game)
      .then((result: ShortcutsResult) =>
        expect(result).toStrictEqual({ success: true, errors: [] })
      )
      .catch((error) => {
        throw error
      })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
  })

  test('Add and remove game to shortcuts.vdf', async () => {
    copyTestFile('shortcuts_valid.vdf')
    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )
    const game = { title: 'MyGame', app_name: 'game' } as GameInfo
    const contentBefore = readFileSync(shortcutFilePath).toString()

    await addNonSteamGame(tmpDir.name, game)
      .then((result: ShortcutsResult) =>
        expect(result).toStrictEqual({ success: true, errors: [] })
      )
      .catch((error) => {
        throw error
      })

    const contentBetween = readFileSync(shortcutFilePath).toString()

    await removeNonSteamGame(tmpDir.name, game)
      .then((result: ShortcutsResult) =>
        expect(result).toStrictEqual({ success: true, errors: [] })
      )
      .catch((error) => {
        throw error
      })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
    expect(contentBefore).not.toBe(contentBetween)
    expect(contentBetween).toContain(game.title)
  })

  test('Create shortcuts.vdf if not exist', async () => {
    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )

    const game = { title: 'MyGame', app_name: 'game' } as GameInfo

    // add and remove to see if empty shortcuts.vdf is correctly created
    await addNonSteamGame(tmpDir.name, game)
      .then((result: ShortcutsResult) =>
        expect(result).toStrictEqual({ success: true, errors: [] })
      )
      .catch((error) => {
        throw error
      })

    await removeNonSteamGame(tmpDir.name, game)
      .then((result: ShortcutsResult) =>
        expect(result).toStrictEqual({ success: true, errors: [] })
      )
      .catch((error) => {
        throw error
      })

    const contentAfter = readFileSync(shortcutFilePath)

    // checks if shortcuts.vdf is "\x00shortcuts\x00\x08\x08"
    // \x00 = NULL
    // \x08 = Backspace
    expect(contentAfter).toStrictEqual(
      Buffer.from([0, 115, 104, 111, 114, 116, 99, 117, 116, 115, 0, 8, 8])
    )
  })

  test('Catch corrupt shortcuts.vdf because of missing AppName', async () => {
    copyTestFile('shortcuts_missing_appname.vdf')

    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )

    const game = {} as GameInfo

    let failed = true
    await addNonSteamGame(tmpDir.name, game)
      .then(() => {
        console.error('Test should fail instead of succeed!')
        failed = false
      })
      .catch((error) => {
        expect(error.message).toBe(
          `Can't add "${game.title}" to steam user "steam_user". "${shortcutFilePath}" is corrupted!` +
            '\n - One of the game entries is missing the AppName parameter!'
        )
      })

    expect(failed).toBeTruthy()
  })

  test('Catch corrupt shortcuts.vdf because of missing Exe', async () => {
    copyTestFile('shortcuts_missing_exe.vdf')

    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )

    const game = {} as GameInfo

    let failed = true
    await addNonSteamGame(tmpDir.name, game)
      .then(() => {
        console.error('Test should fail instead of succeed!')
        failed = false
      })
      .catch((error) => {
        expect(error.message).toBe(
          `Can't add "${game.title}" to steam user "steam_user". "${shortcutFilePath}" is corrupted!` +
            '\n - One of the game entries is missing the Exe parameter!'
        )
      })

    expect(failed).toBeTruthy()
  })

  test('Catch corrupt shortcuts.vdf because of missing LaunchOptions', async () => {
    copyTestFile('shortcuts_missing_launchoptions.vdf')

    const shortcutFilePath = join(
      tmpDir.name,
      'steam_user',
      'config',
      'shortcuts.vdf'
    )

    const game = {} as GameInfo

    let failed = true
    await addNonSteamGame(tmpDir.name, game)
      .then(() => {
        console.error('Test should fail instead of succeed!')
        failed = false
      })
      .catch((error) => {
        expect(error.message).toBe(
          `Can't add "${game.title}" to steam user "steam_user". "${shortcutFilePath}" is corrupted!` +
            '\n - One of the game entries is missing the LaunchOptions parameter!'
        )
      })

    expect(failed).toBeTruthy()
  })

  test('Test for shortcuts.vdf provided by users/dev', async () => {
    const userFiles = ['shortcuts_commandmc.vdf']

    for (const file of userFiles) {
      copyTestFile(file)

      const shortcutFilePath = join(
        tmpDir.name,
        'steam_user',
        'config',
        'shortcuts.vdf'
      )

      const game = { title: 'MyGame', app_name: 'Game' } as GameInfo

      await addNonSteamGame(tmpDir.name, game)
        .then((result: ShortcutsResult) =>
          expect(result).toStrictEqual({ success: true, errors: [] })
        )
        .catch((error) => {
          throw new Error(`${file} failed with: ${error.message}`)
        })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      expect(contentAfter).toContain('MyGame')
    }
  })

  test(
    'Test that adding or removing does not fail, if one steam user shortcuts.vdf ' +
      ' is corrupted and other steam user shortcuts.vdf succeeds',
    async () => {
      copyTestFile('shortcuts_valid.vdf')

      //prepare second user folder
      const secondUserDir = join(tmpDir.name, 'steam_user2', 'config')
      mkdirSync(secondUserDir, { recursive: true })
      copyTestFile('shortcuts_missing_appname.vdf', secondUserDir)

      const shortcutFilePath = join(
        tmpDir.name,
        'steam_user',
        'config',
        'shortcuts.vdf'
      )
      const shortcutFilePath2 = join(
        tmpDir.name,
        'steam_user2',
        'config',
        'shortcuts.vdf'
      )

      const game = { title: 'MyGame', app_name: 'game' } as GameInfo
      const contentBefore = readFileSync(shortcutFilePath).toString()
      const contentBefore2 = readFileSync(shortcutFilePath2).toString()

      await addNonSteamGame(tmpDir.name, game)
        .then((result: ShortcutsResult) =>
          expect(result).toStrictEqual({
            success: true,
            errors: [
              `Can't add "${game.title}" to steam user "steam_user2". "${shortcutFilePath2}" is corrupted!`,
              'One of the game entries is missing the AppName parameter!'
            ]
          })
        )
        .catch((error) => {
          throw error
        })

      const contentBetween = readFileSync(shortcutFilePath).toString()
      const contentBetween2 = readFileSync(shortcutFilePath2).toString()

      await removeNonSteamGame(tmpDir.name, game)
        .then((result: ShortcutsResult) =>
          expect(result).toStrictEqual({
            success: true,
            errors: [
              `Can't remove "${game.title}" from steam user "steam_user2". "${shortcutFilePath2}" is corrupted!`,
              'One of the game entries is missing the AppName parameter!'
            ]
          })
        )
        .catch((error) => {
          throw error
        })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      const contentAfter2 = readFileSync(shortcutFilePath2).toString()

      expect(contentBefore).toStrictEqual(contentAfter)
      expect(contentBefore).not.toBe(contentBetween)
      expect(contentBetween).toContain(game.title)

      expect(contentBefore2).toStrictEqual(contentAfter2)
      expect(contentBefore2).toStrictEqual(contentBetween2)
    }
  )
})
