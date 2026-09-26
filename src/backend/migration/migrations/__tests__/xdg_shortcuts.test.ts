import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  parseBuffer,
  ShortcutEntry,
  ShortcutObject,
  writeBuffer
} from 'steam-shortcut-editor'

import { isSteamRunning } from 'backend/shortcuts/nonesteamgame/steamProcess'
import {
  rewriteHeroicDesktopShortcutIconPaths,
  rewriteSteamShortcutIconPaths
} from '../xdg_shortcuts'

jest.mock('backend/shortcuts/nonesteamgame/steamProcess')

const mockIsSteamRunning = isSteamRunning as jest.MockedFunction<
  typeof isSteamRunning
>

describe('XDG shortcut migration', () => {
  let root: string
  let legacyIcons: string
  let newIcons: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-xdg-shortcuts-'))
    legacyIcons = join(root, 'config', 'heroic', 'icons')
    newIcons = join(root, 'data', 'heroic', 'icons')
    mockIsSteamRunning.mockReturnValue(false)
  })

  afterEach(() => {
    jest.clearAllMocks()
    rmSync(root, { recursive: true, force: true })
  })

  test('rewrites only Heroic-generated desktop shortcut icon paths', () => {
    const desktop = join(root, 'desktop')
    mkdirSync(desktop, { recursive: true })

    const heroicShortcut = join(desktop, 'Heroic Game.desktop')
    const wrapperShortcut = join(desktop, 'Heroic Wrapper.desktop')
    const unrelatedShortcut = join(desktop, 'Other.desktop')
    writeFileSync(
      heroicShortcut,
      `[Desktop Entry]\nExec=xdg-open heroic://launch?appName=foo&runner=legendary\nIcon=${legacyIcons}/foo.jpg\n`
    )
    writeFileSync(
      wrapperShortcut,
      `[Desktop Entry]\nExec=/usr/bin/heroic --no-gui "heroic://launch?appName=foo&runner=legendary"\nIcon=${legacyIcons}/foo.jpg\n`
    )
    writeFileSync(
      unrelatedShortcut,
      `[Desktop Entry]\nExec=/usr/bin/other\nIcon=${legacyIcons}/foo.jpg\n`
    )

    rewriteHeroicDesktopShortcutIconPaths([desktop], legacyIcons, newIcons)

    expect(readFileSync(heroicShortcut, 'utf8')).toContain(
      `Icon=${newIcons}/foo.jpg`
    )
    expect(readFileSync(wrapperShortcut, 'utf8')).toContain(
      `Icon=${newIcons}/foo.jpg`
    )
    expect(readFileSync(unrelatedShortcut, 'utf8')).toContain(
      `Icon=${legacyIcons}/foo.jpg`
    )
  })

  test(
    'rewrites persisted Heroic Steam shortcut icon paths when Steam is stopped',
    () => {
      const steamPath = join(root, 'steam')
      const configPath = join(steamPath, 'userdata', '123', 'config')
      const shortcutsPath = join(configPath, 'shortcuts.vdf')
      mkdirSync(configPath, { recursive: true })

      const heroicShortcut = {
        AppName: 'Foo',
        Exe: '"heroic"',
        StartDir: '"/tmp"',
        LaunchOptions:
          '--no-gui "heroic://launch?appName=foo&runner=legendary"',
        icon: `${legacyIcons}/foo.jpg`
      } as ShortcutEntry
      const unrelatedShortcut = {
        AppName: 'Other',
        Exe: '"/usr/bin/other"',
        StartDir: '"/tmp"',
        LaunchOptions: '',
        icon: `${legacyIcons}/foo.jpg`
      } as ShortcutEntry
      writeFileSync(
        shortcutsPath,
        writeBuffer({
          shortcuts: [heroicShortcut, unrelatedShortcut]
        } as ShortcutObject)
      )

      const result = rewriteSteamShortcutIconPaths(
        [steamPath],
        legacyIcons,
        newIcons
      )
      const parsed = parseBuffer(readFileSync(shortcutsPath), {
        autoConvertArrays: true,
        autoConvertBooleans: true,
        dateProperties: ['LastPlayTime']
      })

      expect(result).toEqual({ changed: 1, deferred: false, errors: [] })
      expect(parsed.shortcuts?.[0].icon).toBe(`${newIcons}/foo.jpg`)
      expect(parsed.shortcuts?.[1].icon).toBe(`${legacyIcons}/foo.jpg`)
    }
  )

  test('defers Steam shortcut rewrites while Steam is running', () => {
    const steamPath = join(root, 'steam')
    const configPath = join(steamPath, 'userdata', '123', 'config')
    const shortcutsPath = join(configPath, 'shortcuts.vdf')
    mkdirSync(configPath, { recursive: true })
    mockIsSteamRunning.mockReturnValue(true)

    const shortcut = {
      AppName: 'Foo',
      Exe: '"heroic"',
      StartDir: '"/tmp"',
      LaunchOptions:
        '--no-gui "heroic://launch?appName=foo&runner=legendary"',
      icon: `${legacyIcons}/foo.jpg`
    } as ShortcutEntry
    const before = writeBuffer({ shortcuts: [shortcut] } as ShortcutObject)
    writeFileSync(shortcutsPath, before)

    const result = rewriteSteamShortcutIconPaths(
      [steamPath],
      legacyIcons,
      newIcons
    )

    expect(result).toEqual({ changed: 0, deferred: true, errors: [] })
    expect(readFileSync(shortcutsPath)).toEqual(before)
  })
})
