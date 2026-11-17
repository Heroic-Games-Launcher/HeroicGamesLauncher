import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'graceful-fs'
import { join } from 'path'
import { isSteamRunning } from '../steamProcess'

jest.mock('child_process', () => ({ spawnSync: jest.fn() }))
jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}))

let mockGameMode = false
let mockWindows = false
jest.mock('backend/constants/paths', () => ({ userHome: '/home/user' }))
jest.mock('backend/constants/environment', () => ({
  get isSteamDeckGameMode() {
    return mockGameMode
  },
  get isWindows() {
    return mockWindows
  }
}))

function mockProcessAlive(alive: boolean) {
  jest.spyOn(process, 'kill').mockImplementation((() => {
    if (!alive) {
      throw Object.assign(new Error('No such process'), { code: 'ESRCH' })
    }
    return true
  }) as typeof process.kill)
}

describe('steamProcess', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    mockGameMode = false
    mockWindows = false
    ;(existsSync as jest.Mock).mockReturnValue(false)
    ;(readFileSync as jest.Mock).mockReturnValue('')
    ;(spawnSync as jest.Mock).mockReturnValue({ stdout: '', status: 1 })
    mockProcessAlive(false)
  })

  test('returns true in Steam Deck Game Mode without checking pid files', () => {
    mockGameMode = true

    expect(isSteamRunning('/does/not/exist')).toBe(true)
    expect(existsSync).not.toBeCalled()
  })

  test('uses the registry pid on Windows', () => {
    mockWindows = true
    ;(spawnSync as jest.Mock).mockReturnValue({
      stdout: '    pid    REG_DWORD    0x1234\r\n',
      status: 0
    })
    mockProcessAlive(true)

    expect(isSteamRunning('')).toBe(true)
    expect(spawnSync).toBeCalledWith(
      'reg',
      ['query', 'HKCU\\Software\\Valve\\Steam\\ActiveProcess', '/v', 'pid'],
      expect.anything()
    )
  })

  test('returns true when a pid file in the steam path points to a live process', () => {
    const steamPath = '/home/user/.steam/steam'
    const pidFile = join(steamPath, 'steam.pid')
    ;(existsSync as jest.Mock).mockImplementation(
      (file: string) => file === pidFile
    )
    ;(readFileSync as jest.Mock).mockReturnValue('1234\n')
    mockProcessAlive(true)

    expect(isSteamRunning(steamPath)).toBe(true)
  })

  test('falls back to a process list check when the pid file is stale', () => {
    const steamPath = '/home/user/.steam/steam'
    const pidFile = join(steamPath, 'steam.pid')
    ;(existsSync as jest.Mock).mockImplementation(
      (file: string) => file === pidFile
    )
    ;(readFileSync as jest.Mock).mockReturnValue('99999\n')
    ;(spawnSync as jest.Mock).mockReturnValue({
      stdout: Buffer.from('2222\n'),
      status: 0
    })

    expect(isSteamRunning(steamPath)).toBe(true)
  })

  test('detects Steam from a pid file in an alternate canonical root', () => {
    const steamPath = '/custom/wrong/steam'
    ;(existsSync as jest.Mock).mockImplementation(
      (file: string) =>
        file.endsWith('steam.pid') && !file.startsWith(steamPath)
    )
    ;(readFileSync as jest.Mock).mockReturnValue('3333\n')
    mockProcessAlive(true)

    expect(isSteamRunning(steamPath)).toBe(true)
  })

  test('returns false when no pid file and no steam process are found', () => {
    expect(isSteamRunning('/home/user/.steam/steam')).toBe(false)
  })
})
