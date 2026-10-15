import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'
import { dirSync } from 'tmp'

import {
  Eglv2Installation,
  HeroicActions,
  readEglv2Installations,
  syncWithEglv2
} from '../eglv2_sync'

jest.mock('backend/logger')
jest.mock('backend/config')
jest.mock('electron-store')

type Json = Record<string, unknown>

function setup() {
  const root = dirSync({ unsafeCleanup: true }).name
  const paths = {
    legendaryConfigDir: join(root, 'legendary'),
    eglv2DataDir: join(root, 'eglv2')
  }
  mkdirSync(join(paths.legendaryConfigDir, 'metadata'), { recursive: true })
  mkdirSync(join(paths.legendaryConfigDir, 'manifests'), { recursive: true })
  mkdirSync(paths.eglv2DataDir, { recursive: true })
  const installedPath = join(paths.legendaryConfigDir, 'installed.json')
  const logPath = join(paths.eglv2DataDir, 'installations.jsonl')

  const gameDir = (appName: string) => {
    const dir = join(root, 'Games', appName)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'Game.exe'), '')
    return dir
  }

  const addMetadata = (appName: string, version = '1.0') => {
    writeFileSync(
      join(paths.legendaryConfigDir, 'metadata', `${appName}.json`),
      JSON.stringify({
        app_name: appName,
        asset_infos: {
          Windows: {
            namespace: `ns-${appName}`,
            catalog_item_id: `id-${appName}`
          }
        },
        metadata: {}
      })
    )
    writeFileSync(
      join(
        paths.legendaryConfigDir,
        'manifests',
        `${appName}_Windows_${version}.manifest`
      ),
      `manifest ${version}`
    )
  }

  const addHeroicGame = (appName: string, version = '1.0') => {
    const dir = gameDir(appName)
    addMetadata(appName, version)
    const installed = existsSync(installedPath)
      ? (JSON.parse(readFileSync(installedPath, 'utf-8')) as Record<
          string,
          Json
        >)
      : {}
    installed[appName] = {
      app_name: appName,
      title: `Title ${appName}`,
      install_path: dir,
      executable: 'Game.exe',
      launch_parameters: '',
      version,
      platform: 'Windows',
      can_run_offline: true,
      requires_ot: false,
      is_dlc: false,
      install_size: 1,
      install_tags: [],
      egl_guid: ''
    }
    writeFileSync(installedPath, JSON.stringify(installed))
    return dir
  }

  const addEglRecord = (record: Partial<Eglv2Installation> & Json) => {
    const header = existsSync(logPath)
      ? ''
      : JSON.stringify({ version: 1, entries: 0 }) + '\n'
    writeFileSync(
      logPath,
      (existsSync(logPath) ? readFileSync(logPath, 'utf-8') : header) +
        JSON.stringify({
          installationId: 'EGLID',
          complete: true,
          platform: 'Windows',
          version: '1.0',
          launchExecutable: 'Game.exe',
          ...record
        }) +
        '\n'
    )
  }

  const heroic: jest.Mocked<HeroicActions> = {
    importGame: jest.fn().mockResolvedValue(true),
    forgetGame: jest.fn().mockResolvedValue(true),
    moveGame: jest.fn().mockResolvedValue(true),
    reloadGame: jest.fn(),
    isOwned: jest.fn().mockReturnValue(true)
  }

  const eglRecords = () => [
    ...readEglv2Installations(paths.eglv2DataDir).values()
  ]

  return {
    root,
    paths,
    logPath,
    gameDir,
    addMetadata,
    addHeroicGame,
    addEglRecord,
    heroic,
    eglRecords
  }
}

describe('syncWithEglv2', () => {
  test('exports a new Heroic install as a Windows game', async () => {
    const { paths, addHeroicGame, heroic, eglRecords } = setup()
    const dir = addHeroicGame('Herring')

    const result = await syncWithEglv2(heroic, paths, {})
    expect(result.toEgl).toEqual(['Title Herring'])

    const [record] = eglRecords()
    expect(record).toMatchObject({
      complete: true,
      dir,
      platform: 'Windows',
      namespace: 'ns-Herring',
      itemId: 'id-Herring',
      artifactId: 'Herring',
      version: '1.0',
      launchExecutable: 'Game.exe'
    })
    expect(record.installationId).toMatch(/^[0-9A-F]{32}$/)
    expect(
      readFileSync(
        join(dir, '.egstore', `${record.installationId}.manifest`),
        'utf-8'
      )
    ).toBe('manifest 1.0')
  })

  test('imports a new EGL install into Heroic', async () => {
    const { paths, gameDir, addEglRecord, heroic } = setup()
    const dir = gameDir('Herring')
    addEglRecord({ artifactId: 'Herring', dir })

    const result = await syncWithEglv2(heroic, paths, {})
    expect(heroic.importGame).toHaveBeenCalledWith('Herring', dir)
    expect(result.toHeroic).toEqual(['Herring'])
  })

  test('skips EGL installs that are not in the Heroic library', async () => {
    const { paths, gameDir, addEglRecord, heroic } = setup()
    addEglRecord({ artifactId: 'Herring', dir: gameDir('Herring') })
    heroic.isOwned.mockReturnValue(false)

    const result = await syncWithEglv2(heroic, paths, {})
    expect(heroic.importGame).not.toHaveBeenCalled()
    expect(result.skipped).toEqual([
      { title: 'Herring', reason: 'not in your Heroic library' }
    ])
  })

  test('removes games uninstalled in Heroic from EGL', async () => {
    const { paths, gameDir, addEglRecord, heroic, eglRecords } = setup()
    const dir = gameDir('Herring')
    addEglRecord({ artifactId: 'Herring', dir })
    rmSync(dir, { recursive: true })

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(result.removedFromEgl).toEqual(['Herring'])
    expect(eglRecords()).toEqual([])
  })

  test('cleans up .egstore left behind by a Heroic uninstall', async () => {
    const { paths, gameDir, addEglRecord, heroic } = setup()
    const dir = gameDir('Herring')
    addEglRecord({ artifactId: 'Herring', dir })
    // Legendary removed the game files but not EGLv2's
    rmSync(join(dir, 'Game.exe'))
    mkdirSync(join(dir, '.egstore'))
    writeFileSync(join(dir, '.egstore', 'EGLID.manifest'), '')
    writeFileSync(join(dir, '.egstore', 'EGLID.mancpn'), '')

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(result.removedFromEgl).toEqual(['Herring'])
    expect(existsSync(dir)).toBe(false)
  })

  test('removes games uninstalled in EGL from Heroic', async () => {
    const { paths, addHeroicGame, heroic } = setup()
    const dir = addHeroicGame('Herring')
    rmSync(dir, { recursive: true })

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(heroic.forgetGame).toHaveBeenCalledWith('Herring')
    expect(result.removedFromHeroic).toEqual(['Title Herring'])
  })

  test('re-tags games EGL imported with the wrong platform', async () => {
    const { paths, addHeroicGame, addEglRecord, heroic, eglRecords } = setup()
    const dir = addHeroicGame('Herring')
    addEglRecord({ artifactId: 'Herring', dir, platform: 'Linux' })

    await syncWithEglv2(heroic, paths, {})
    expect(eglRecords()).toEqual([
      expect.objectContaining({ installationId: 'EGLID', platform: 'Windows' })
    ])
  })

  test('pushes Heroic updates to EGL', async () => {
    const { paths, addHeroicGame, addEglRecord, heroic, eglRecords } = setup()
    const dir = addHeroicGame('Herring', '2.0')
    addEglRecord({ artifactId: 'Herring', dir, version: '1.0' })

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(result.toEgl).toEqual(['Title Herring'])
    expect(eglRecords()[0]).toMatchObject({
      installationId: 'EGLID',
      version: '2.0'
    })
    expect(readFileSync(join(dir, '.egstore', 'EGLID.manifest'), 'utf-8')).toBe(
      'manifest 2.0'
    )
  })

  test('picks up EGL updates in Heroic in place', async () => {
    const { paths, addHeroicGame, addEglRecord, heroic } = setup()
    const dir = addHeroicGame('Herring', '1.0')
    const installedPath = join(paths.legendaryConfigDir, 'installed.json')
    const installed = JSON.parse(
      readFileSync(installedPath, 'utf-8')
    ) as Record<string, Json>
    installed.Herring.install_tags = ['optional']
    writeFileSync(installedPath, JSON.stringify(installed))
    addEglRecord({ artifactId: 'Herring', dir, version: '2.0' })
    mkdirSync(join(dir, '.egstore'))
    writeFileSync(join(dir, '.egstore', 'EGLID.manifest'), 'manifest 2.0')

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(result.toHeroic).toEqual(['Title Herring'])
    expect(heroic.reloadGame).toHaveBeenCalledWith('Herring')
    expect(heroic.forgetGame).not.toHaveBeenCalled()
    expect(heroic.importGame).not.toHaveBeenCalled()

    const updated = (
      JSON.parse(readFileSync(installedPath, 'utf-8')) as Record<string, Json>
    ).Herring
    expect(updated).toMatchObject({
      version: '2.0',
      install_tags: ['optional']
    })
    expect(
      readFileSync(
        join(
          paths.legendaryConfigDir,
          'manifests',
          'Herring_Windows_2.0.manifest'
        ),
        'utf-8'
      )
    ).toBe('manifest 2.0')
  })

  test('skips an EGL update without its build manifest', async () => {
    const { paths, addHeroicGame, addEglRecord, heroic } = setup()
    const dir = addHeroicGame('Herring', '1.0')
    addEglRecord({ artifactId: 'Herring', dir, version: '2.0' })

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(heroic.reloadGame).not.toHaveBeenCalled()
    expect(result.skipped).toEqual([
      {
        title: 'Title Herring',
        reason: 'missing build manifest from the Epic Games Launcher'
      }
    ])
  })

  test('follows a game moved in EGL', async () => {
    const { paths, addHeroicGame, gameDir, addEglRecord, heroic } = setup()
    const oldDir = addHeroicGame('Herring')
    const newDir = gameDir('Moved')
    addEglRecord({ artifactId: 'Herring', dir: newDir })

    await syncWithEglv2(heroic, paths, {
      Herring: { dir: oldDir, version: '1.0' }
    })
    expect(heroic.moveGame).toHaveBeenCalledWith('Herring', newDir)
  })

  test('does nothing when both launchers already agree', async () => {
    const { paths, logPath, addHeroicGame, addEglRecord, heroic } = setup()
    const dir = addHeroicGame('Herring')
    addEglRecord({ artifactId: 'Herring', dir })
    const before = readFileSync(logPath, 'utf-8')

    const result = await syncWithEglv2(heroic, paths, {
      Herring: { dir, version: '1.0' }
    })
    expect(result).toEqual({
      toEgl: [],
      toHeroic: [],
      removedFromEgl: [],
      removedFromHeroic: [],
      skipped: []
    })
    expect(readFileSync(logPath, 'utf-8')).toBe(before)
    expect(heroic.importGame).not.toHaveBeenCalled()
  })
})
