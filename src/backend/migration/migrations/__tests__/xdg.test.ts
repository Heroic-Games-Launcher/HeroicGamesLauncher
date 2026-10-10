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
    iconsPath = join(cachePath, 'icons')
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

  test('migrates tools when their new destination already exists but is empty', async () => {
    mkdirSync(join(legacyToolsPath, 'proton', 'GE'), { recursive: true })
    writeFileSync(join(legacyToolsPath, 'proton', 'GE', 'proton'), 'binary')
    mkdirSync(toolsPath, { recursive: true })

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(lstatSync(legacyToolsPath).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(toolsPath, 'proton', 'GE', 'proton'), 'utf8')).toBe(
      'binary'
    )
  })

  test('keeps both independently populated tool directories without merging', async () => {
    mkdirSync(join(legacyToolsPath, 'wine'), { recursive: true })
    mkdirSync(join(toolsPath, 'proton'), { recursive: true })
    writeFileSync(join(legacyToolsPath, 'wine', 'old'), 'old')
    writeFileSync(join(toolsPath, 'proton', 'new'), 'new')

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(lstatSync(legacyToolsPath).isSymbolicLink()).toBe(false)
    expect(readFileSync(join(legacyToolsPath, 'wine', 'old'), 'utf8')).toBe(
      'old'
    )
    expect(readFileSync(join(toolsPath, 'proton', 'new'), 'utf8')).toBe('new')
  })

  test('preserves Heroic Legendary data even if global migration runs first', async () => {
    const heroicLegendary = join(appFolder, 'legendaryConfig', 'legendary')
    const globalLegendary = join(root, 'legendary')
    mkdirSync(heroicLegendary, { recursive: true })
    mkdirSync(globalLegendary, { recursive: true })
    writeFileSync(join(heroicLegendary, 'installed.json'), 'heroic-games')
    writeFileSync(join(globalLegendary, 'installed.json'), 'global-games')

    const legendary = await import('../legendary')
    const { XdgPathsMigration } = await import('../xdg')
    await new legendary.LegendaryGlobalConfigFolderMigration().run()
    await new XdgPathsMigration().run()

    const legendaryDir = join(dataPath, 'legendaryConfig', 'legendary')
    const installed = join(legendaryDir, 'installed.json')
    expect(readFileSync(installed, 'utf8')).toBe('heroic-games')
  })

  test('moves legacy tools past empty Wine and Proton destination scaffolds', async () => {
    mkdirSync(join(legacyToolsPath, 'proton', 'GE'), { recursive: true })
    writeFileSync(join(legacyToolsPath, 'proton', 'GE', 'proton'), 'binary')
    mkdirSync(join(toolsPath, 'wine'), { recursive: true })
    mkdirSync(join(toolsPath, 'proton'), { recursive: true })

    const { XdgPathsMigration } = await import('../xdg')
    await new XdgPathsMigration().run()

    expect(lstatSync(legacyToolsPath).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(toolsPath, 'proton', 'GE', 'proton'), 'utf8')).toBe(
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
