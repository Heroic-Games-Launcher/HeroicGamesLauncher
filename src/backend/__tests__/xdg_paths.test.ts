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

describe('Electron XDG path migration', () => {
  let root: string

  beforeEach(() => {
    jest.resetModules()
    root = mkdtempSync(join(tmpdir(), 'heroic-electron-xdg-'))
  })

  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    rmSync(root, { recursive: true, force: true })
  })

  test('preserves persistent webview partitions under sessionData', async () => {
    const appFolder = join(root, 'config', 'heroic')
    const statePath = join(root, 'state', 'Heroic')
    const cachePath = join(root, 'cache', 'heroic')
    const setPath = jest.fn()

    mkdirSync(join(appFolder, 'Partitions', 'persist:epic'), {
      recursive: true
    })
    writeFileSync(
      join(appFolder, 'Partitions', 'persist:epic', 'Cookies'),
      'login-data'
    )
    writeFileSync(join(appFolder, 'Local State'), 'electron-state')

    jest.doMock('electron', () => ({
      app: {
        setPath,
        setAppLogsPath: jest.fn(),
        commandLine: { appendSwitch: jest.fn() }
      }
    }))
    jest.doMock('backend/constants/environment', () => ({ isLinux: true }))
    jest.doMock('backend/constants/paths', () => ({
      appFolder,
      heroicCachePath: cachePath,
      heroicStatePath: statePath
    }))

    const { configureElectronXdgPaths } = await import('../xdg_paths')
    configureElectronXdgPaths()

    expect(setPath).toHaveBeenCalledWith(
      'sessionData',
      join(statePath, 'session')
    )
    expect(
      readFileSync(
        join(statePath, 'session', 'Partitions', 'persist:epic', 'Cookies'),
        'utf8'
      )
    ).toBe('login-data')
    expect(
      readFileSync(join(statePath, 'electron', 'Local State'), 'utf8')
    ).toBe('electron-state')
    expect(existsSync(join(appFolder, 'Partitions'))).toBe(false)
  })
})
