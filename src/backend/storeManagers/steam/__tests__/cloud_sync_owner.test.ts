import { callRunner } from 'backend/launcher'
import { getAureliaBin } from 'backend/utils'
import { logInfo, logWarning } from 'backend/logger'
import { disableAureliaCloudSync } from '../aurelia'
import type { ExecResult } from 'common/types'

jest.mock('backend/launcher', () => ({ callRunner: jest.fn() }))
jest.mock('backend/utils', () => ({
  getAureliaBin: jest.fn(() => ({ dir: '', bin: 'aurelia' })),
  getFileSize: jest.fn(),
  formatTime: jest.fn(),
  sendProgressUpdate: jest.fn()
}))
jest.mock('backend/logger', () => ({
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))
jest.mock('backend/constants/paths', () => ({ appFolder: '/tmp/heroic' }))

const runner = callRunner as jest.MockedFunction<typeof callRunner>

function json(value: unknown): ExecResult {
  return { stdout: JSON.stringify(value), stderr: '' }
}

/** argv passed to each aurelia call. */
function calls(): string[][] {
  return runner.mock.calls.map(([argv]) => argv)
}

describe('disableAureliaCloudSync', () => {
  const ci = process.env.CI
  beforeAll(() => {
    // Skips spawning the Aurelia daemon.
    process.env.CI = 'e2e'
  })
  afterAll(() => {
    process.env.CI = ci
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAureliaBin).mockReturnValue({ dir: '', bin: 'aurelia' })
  })

  it('turns an enabled global switch off', async () => {
    runner
      .mockResolvedValueOnce(
        json({ enable_cloud_sync: true, game_overrides: {} })
      )
      .mockResolvedValueOnce(
        json({ enable_cloud_sync: false, game_overrides: {} })
      )
    await expect(disableAureliaCloudSync('792100')).resolves.toBe('off')
    expect(calls()).toEqual([
      ['config', 'cloud-sync', '--json'],
      ['config', 'cloud-sync', 'off', '--json']
    ])
    expect(logInfo).toHaveBeenCalled()
  })

  it('writes nothing when already off', async () => {
    runner.mockResolvedValueOnce(json({ enable_cloud_sync: false }))
    await expect(disableAureliaCloudSync('792100')).resolves.toBe('off')
    expect(calls()).toEqual([['config', 'cloud-sync', '--json']])
  })

  it('reports a per-game override that stays on', async () => {
    runner.mockResolvedValueOnce(
      json({ enable_cloud_sync: false, game_overrides: { '792100': true } })
    )
    await expect(disableAureliaCloudSync('792100')).resolves.toBe(
      'game-override'
    )
    runner.mockResolvedValueOnce(
      json({ enable_cloud_sync: false, game_overrides: { '792100': false } })
    )
    await expect(disableAureliaCloudSync('792100')).resolves.toBe('off')
  })

  it('warns, never throws, on an old Aurelia', async () => {
    runner.mockResolvedValueOnce({
      stdout: '',
      stderr:
        "error: unrecognized subcommand 'cloud-sync'\n\nUsage: aurelia config <COMMAND>",
      error: 'exit code 2'
    })
    await expect(disableAureliaCloudSync('792100')).resolves.toBe('unsupported')
    expect(calls()).toHaveLength(1)
    expect(logWarning).toHaveBeenCalled()
  })

  it('warns when the switch does not stick', async () => {
    runner
      .mockResolvedValueOnce(json({ enable_cloud_sync: true }))
      .mockResolvedValueOnce(json({ download_limit_kbit: 0 }))
    await expect(disableAureliaCloudSync('792100')).resolves.toBe('unsupported')
    expect(logWarning).toHaveBeenCalled()
  })
})
