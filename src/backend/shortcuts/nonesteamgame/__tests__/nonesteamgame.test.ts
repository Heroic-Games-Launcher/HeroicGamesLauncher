import { readFileSync, copyFileSync, mkdirSync } from 'graceful-fs'
import { GameInfo } from '../../../../common/types'
import { join } from 'path'
import { DirResult, dirSync } from 'tmp'
import { addNonSteamGame, removeNonSteamGame } from '../nonesteamgame'
import { showErrorBoxModalAuto } from '../../../dialog/dialog'

jest.mock('../../../logger/logfile')
jest.mock('../../../dialog/dialog')
jest.mock('../../../utils')

let tmpDir = {} as DirResult
let tmpSteamUserConfigDir = '' as string

function copyTestFile(file: string, alternativeUserPath: string = '') {
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
    console.log = jest.fn()
    console.error = jest.fn()
    console.warn = jest.fn()
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

    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`${game.title} was successfully added to Steam.`)
    )
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

    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })

    const contentBetween = readFileSync(shortcutFilePath).toString()

    await removeNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game
    })

    const contentAfter = readFileSync(shortcutFilePath).toString()
    expect(contentBefore).toStrictEqual(contentAfter)
    expect(contentBefore).not.toBe(contentBetween)
    expect(contentBetween).toContain(game.title)
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`${game.title} was successfully added to Steam.`)
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(
        `${game.title} was successfully removed from Steam.`
      )
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`Prepare Steam images for ${game.title}`)
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`Remove Steam images for ${game.title}`)
    )
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
    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })

    await removeNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game
    })

    const contentAfter = readFileSync(shortcutFilePath)

    // checks if shortcuts.vdf is "\x00shortcuts\x00\x08\x08"
    // \x00 = NULL
    // \x08 = Backspace
    expect(contentAfter).toStrictEqual(
      Buffer.from([0, 115, 104, 111, 114, 116, 99, 117, 116, 115, 0, 8, 8])
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`${game.title} was successfully added to Steam.`)
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(
        `${game.title} was successfully removed from Steam.`
      )
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`Prepare Steam images for ${game.title}`)
    )
    expect(console.log).toBeCalledWith(
      expect.stringContaining('INFO:    [Shortcuts]:'),
      expect.stringContaining(`Remove Steam images for ${game.title}`)
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

    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })
    expect(console.log).not.toBeCalled()
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        `Can't add \"${game.title}\" to Steam user \"steam_user\". \"${shortcutFilePath}\" is corrupted!`
      )
    )
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        'One of the game entries is missing the AppName parameter!'
      )
    )
    expect(showErrorBoxModalAuto).toBeCalled()
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

    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })

    expect(console.log).not.toBeCalled()
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        `Can't add \"${game.title}\" to Steam user \"steam_user\". \"${shortcutFilePath}\" is corrupted!`
      )
    )
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        'One of the game entries is missing the Exe parameter!'
      )
    )
    expect(showErrorBoxModalAuto).toBeCalled()
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

    await addNonSteamGame({
      steamUserdataDir: tmpDir.name,
      gameInfo: game,
      bkgDataUrl: '',
      bigPicDataUrl: ''
    })

    expect(console.log).not.toBeCalled()
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        `Can't add \"${game.title}\" to Steam user \"steam_user\". \"${shortcutFilePath}\" is corrupted!`
      )
    )
    expect(console.error).toBeCalledWith(
      expect.stringContaining('ERROR:   [Shortcuts]:'),
      expect.stringContaining(
        'One of the game entries is missing the LaunchOptions parameter!'
      )
    )
    expect(showErrorBoxModalAuto).toBeCalled()
  })

  test(
    'Test that adding or removing does not fail, if one Steam user shortcuts.vdf ' +
      ' is corrupted and other Steam user shortcuts.vdf succeeds',
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

      await addNonSteamGame({
        steamUserdataDir: tmpDir.name,
        gameInfo: game,
        bkgDataUrl: '',
        bigPicDataUrl: ''
      })

      const contentBetween = readFileSync(shortcutFilePath).toString()
      const contentBetween2 = readFileSync(shortcutFilePath2).toString()

      await removeNonSteamGame({
        steamUserdataDir: tmpDir.name,
        gameInfo: game
      })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      const contentAfter2 = readFileSync(shortcutFilePath2).toString()

      expect(contentBefore).toStrictEqual(contentAfter)
      expect(contentBefore).not.toBe(contentBetween)
      expect(contentBetween).toContain(game.title)

      expect(contentBefore2).toStrictEqual(contentAfter2)
      expect(contentBefore2).toStrictEqual(contentBetween2)

      expect(console.log).toBeCalledWith(
        expect.stringContaining('INFO:    [Shortcuts]:'),
        expect.stringContaining(`Prepare Steam images for ${game.title}`)
      )
      expect(console.log).toBeCalledWith(
        expect.stringContaining('INFO:    [Shortcuts]:'),
        expect.stringContaining(`Remove Steam images for ${game.title}`)
      )

      expect(console.log).toBeCalledTimes(2)
      expect(console.warn).toBeCalledWith(
        expect.stringContaining('WARNING: [Shortcuts]:'),
        expect.stringContaining(
          `${game.title} could not be added to all found Steam users.`
        )
      )
      expect(console.warn).toBeCalledWith(
        expect.stringContaining('WARNING: [Shortcuts]:'),
        expect.stringContaining(
          `${game.title} could not be removed from all found Steam users.`
        )
      )
      expect(console.error).toBeCalledWith(
        expect.stringContaining('ERROR:   [Shortcuts]:'),
        expect.stringContaining(
          `Can't add \"${game.title}\" to Steam user \"steam_user2\". \"${shortcutFilePath2}\" is corrupted!`
        )
      )
      expect(console.error).toBeCalledWith(
        expect.stringContaining('ERROR:   [Shortcuts]:'),
        expect.stringContaining(
          `Can't remove \"${game.title}\" from Steam user \"steam_user2\". \"${shortcutFilePath2}\" is corrupted!`
        )
      )
      expect(console.error).toBeCalledWith(
        expect.stringContaining('ERROR:   [Shortcuts]:'),
        expect.stringContaining(
          'One of the game entries is missing the AppName parameter!'
        )
      )
      expect(showErrorBoxModalAuto).not.toBeCalled()
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

      const shortcutFilePath = join(
        tmpDir.name,
        'steam_user',
        'config',
        'shortcuts.vdf'
      )

      const game = { title: 'MyGame', app_name: 'Game' } as GameInfo

      await addNonSteamGame({
        steamUserdataDir: tmpDir.name,
        gameInfo: game,
        bkgDataUrl: '',
        bigPicDataUrl: ''
      })

      const contentAfter = readFileSync(shortcutFilePath).toString()
      expect(contentAfter).toContain('MyGame')
      expect(console.log).toBeCalledWith(
        expect.stringContaining('INFO:    [Shortcuts]:'),
        expect.stringContaining(
          `${game.title} was successfully added to Steam.`
        )
      )
      expect(console.error).not.toBeCalled()
      expect(showErrorBoxModalAuto).not.toBeCalled()
    }
  })
})
