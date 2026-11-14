import { mkdirSync, writeFileSync } from 'graceful-fs'
import * as os from 'os'
import { join } from 'path'
import { dirSync } from 'tmp'

jest.mock('electron')
jest.mock('backend/logger')
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn()
}))

// An install that first ran before Flatpak Steam was detected has the native
// Steam path stored in config.json. It must follow the detected folder, as
// long as the stored path is the old default and does not exist.
describe('GlobalConfig - stored default Steam path', () => {
  const flatpakSteam = '.var/app/com.valvesoftware.Steam/.steam/steam'
  let home: string

  function loadSettings(storedSteamPath?: string) {
    jest.mocked(os.homedir).mockReturnValue(home)
    process.env.FLATPAK_ID = 'com.heroicgameslauncher.hgl'
    let settings = {} as { defaultSteamPath: string }
    jest.isolateModules(() => {
      // Loaded here so that the paths and isFlatpak see the values above.
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { configPath, appFolder } = require('backend/constants/paths')
      const { GlobalConfig } = require('backend/config')
      /* eslint-enable @typescript-eslint/no-require-imports */
      mkdirSync(appFolder, { recursive: true })
      writeFileSync(
        configPath,
        JSON.stringify({
          version: 'v0',
          defaultSettings:
            storedSteamPath === undefined
              ? {}
              : { defaultSteamPath: storedSteamPath }
        })
      )
      settings = GlobalConfig.get().getSettings()
    })
    return settings
  }

  afterEach(() => {
    delete process.env.FLATPAK_ID
  })

  beforeEach(() => {
    home = dirSync({ unsafeCleanup: true }).name
    mkdirSync(join(home, flatpakSteam), { recursive: true })
  })

  test('replaces the stored native path when only Flatpak Steam exists', () => {
    const settings = loadSettings(join(home, '.steam/steam'))
    expect(settings.defaultSteamPath).toBe(join(home, flatpakSteam))
  })

  test('keeps a path the user chose', () => {
    const custom = join(home, 'my-steam')
    expect(loadSettings(custom).defaultSteamPath).toBe(custom)
  })

  test('keeps the native path when it exists', () => {
    mkdirSync(join(home, '.steam/steam'), { recursive: true })
    const settings = loadSettings(join(home, '.steam/steam'))
    expect(settings.defaultSteamPath).toBe(join(home, '.steam/steam'))
  })

  test('falls back to the detected path when none is stored', () => {
    expect(loadSettings().defaultSteamPath).toBe(join(home, flatpakSteam))
  })
})
