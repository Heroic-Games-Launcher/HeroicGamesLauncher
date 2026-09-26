import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('XdgPathsMigration', () => {
  let root: string
  let appFolder: string
  let dataPath: string
  let cachePath: string
  let statePath: string
  let iconsPath: string
  let legacyToolsPath: string
  let toolsPath: string
  let userHome: string
  let desktopPath: string

  beforeEach(() => {
    jest.resetModules()
    root = mkdtempSync(join(tmpdir(), 'heroic-xdg-migration-'))
    appFolder = join(root, 'config', 'heroic')
    dataPath = join(root, 'data', 'heroic')
    cachePath = join(root, 'cache', 'heroic')
    statePath = join(root, 'state', 'Heroic')
    iconsPath = join(dataPath, 'icons')
    legacyToolsPath = join(appFolder, 'tools')
    toolsPath = join(dataPath, 'tools')
    userHome = join(root, 'home')
    desktopPath = join(root, 'desktop')

    jest.doMock('electron', () => ({
      app: {
        getPath: (name: string) => (name === 'desktop' ? desktopPath : root)
      }
    }))
    jest.doMock('backend/constants/environment', () => ({ isLinux: true }))
    jest.doMock('backend/constants/paths', () => ({
      appFolder,
      configPath: join(appFolder, 'config.json'),
      heroicCachePath: cachePath,
      heroicDataPath: dataPath,
      heroicIconFolder: iconsPath,
      heroicStatePath: statePath,
      legacyToolsPath,
      toolsPath,
      userHome
    }))
    jest.doMock('backend/logger', () => ({
      logInfo: jest.fn(),
      logWarning: jest.fn()
    }))
  })

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    rmSync(root, { recursive: true, force: true })
  })

  test('moves icons, rewrites Heroic shortcuts, and keeps no icon symlink', async () => {
    const legacyIcons = join(appFolder, 'icons')
    const menuPath = join(userHome, '.local', 'share', 'applications')
    const wrapperPath = join(menuPath, 'heroic-steam-shortcuts')
    mkdirSync(legacyIcons, { recursive: true })
    mkdirSync(desktopPath, { recursive: true })
    mkdirSync(menuPath, { recursive: true })
    mkdirSync(wrapperPath, { recursive: true })
    writeFileSync(join(legacyIcons, 'foo.jpg'), 'image')

    for (const shortcutPath of [
      join(desktopPath, 'Foo.desktop'),
      join(menuPath, 'Foo.desktop'),
      join(wrapperPath, 'legendary-foo.desktop')
    ]) {
      writeFileSync(
        shortcutPath,
        `[Desktop Entry]\nExec=/usr/bin/heroic --no-gui "heroic://launch?appName=foo&runner=legendary"\nIcon=${legacyIcons}/foo.jpg\n`
      )
    }

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(existsSync(legacyIcons)).toBe(false)
    expect(readFileSync(join(iconsPath, 'foo.jpg'), 'utf8')).toBe('image')
    expect(existsSync(join(iconsPath, '.heroic-xdg-icons-migration'))).toBe(
      false
    )
    expect(readFileSync(join(desktopPath, 'Foo.desktop'), 'utf8')).toContain(
      `Icon=${iconsPath}/foo.jpg`
    )
    expect(readFileSync(join(menuPath, 'Foo.desktop'), 'utf8')).toContain(
      `Icon=${iconsPath}/foo.jpg`
    )
    expect(
      readFileSync(join(wrapperPath, 'legendary-foo.desktop'), 'utf8')
    ).toContain(`Icon=${iconsPath}/foo.jpg`)
  })

  test('keeps the tools compatibility symlink for stored absolute paths', async () => {
    mkdirSync(join(legacyToolsPath, 'wine', 'test'), { recursive: true })
    writeFileSync(join(legacyToolsPath, 'wine', 'test', 'wine'), 'binary')

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(lstatSync(legacyToolsPath).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(toolsPath, 'wine', 'test', 'wine'), 'utf8')).toBe(
      'binary'
    )
  })

  test('does not merge independently populated icon directories', async () => {
    const legacyIcons = join(appFolder, 'icons')
    mkdirSync(legacyIcons, { recursive: true })
    mkdirSync(iconsPath, { recursive: true })
    writeFileSync(join(legacyIcons, 'old.jpg'), 'old')
    writeFileSync(join(iconsPath, 'new.jpg'), 'new')

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(readFileSync(join(legacyIcons, 'old.jpg'), 'utf8')).toBe('old')
    expect(readFileSync(join(iconsPath, 'new.jpg'), 'utf8')).toBe('new')
  })
})
