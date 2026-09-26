import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  moveIfDestinationMissing,
  moveSyncIfDestinationMissing,
  rewriteHeroicDesktopShortcutIconPaths
} from '../xdg_helpers'

describe('XDG migration helpers', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'heroic-xdg-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  test('moves a path only when the destination is missing', async () => {
    const source = join(root, 'old', 'value')
    const destination = join(root, 'new', 'value')
    mkdirSync(source, { recursive: true })
    writeFileSync(join(source, 'file'), 'old')

    expect(await moveIfDestinationMissing(source, destination)).toBe(true)
    expect(existsSync(source)).toBe(false)
    expect(readFileSync(join(destination, 'file'), 'utf8')).toBe('old')
  })

  test('does not overwrite an existing destination', () => {
    const source = join(root, 'old', 'file')
    const destination = join(root, 'new', 'file')
    mkdirSync(join(root, 'old'), { recursive: true })
    mkdirSync(join(root, 'new'), { recursive: true })
    writeFileSync(source, 'old')
    writeFileSync(destination, 'new')

    expect(moveSyncIfDestinationMissing(source, destination)).toBe(false)
    expect(readFileSync(source, 'utf8')).toBe('old')
    expect(readFileSync(destination, 'utf8')).toBe('new')
  })

  test('rewrites only Heroic-generated desktop shortcut icon paths', () => {
    const desktop = join(root, 'desktop')
    const legacyIcons = join(root, 'config', 'heroic', 'icons')
    const newIcons = join(root, 'data', 'heroic', 'icons')
    mkdirSync(desktop, { recursive: true })

    const heroicShortcut = join(desktop, 'Heroic Game.desktop')
    const unrelatedShortcut = join(desktop, 'Other.desktop')
    writeFileSync(
      heroicShortcut,
      `[Desktop Entry]\nExec=xdg-open heroic://launch?appName=foo&runner=legendary\nIcon=${legacyIcons}/foo.jpg\n`
    )
    writeFileSync(
      unrelatedShortcut,
      `[Desktop Entry]\nExec=/usr/bin/other\nIcon=${legacyIcons}/foo.jpg\n`
    )

    rewriteHeroicDesktopShortcutIconPaths(
      [desktop],
      legacyIcons,
      newIcons
    )
    rewriteHeroicDesktopShortcutIconPaths(
      [desktop],
      legacyIcons,
      newIcons
    )

    expect(readFileSync(heroicShortcut, 'utf8')).toContain(
      `Icon=${newIcons}/foo.jpg`
    )
    expect(readFileSync(unrelatedShortcut, 'utf8')).toContain(
      `Icon=${legacyIcons}/foo.jpg`
    )
  })
})
